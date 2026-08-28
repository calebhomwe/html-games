using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using BloxburgLite.Economy;
using BloxburgLite.Persistence;

namespace BloxburgLite.Build
{
    public enum PlacementError { None, OutOfBounds, Blocked, NoFunds }

    public class GridPlacementService : MonoBehaviour
    {
        public const int PlotSize = 10;
        public const int MaxItems = 64;

        const float RotateGate = 0.15f;
        const float TileGap = 0.06f;

        public struct Placed
        {
            public int catalogIndex;
            public int x;
            public int z;
            public int rot;
            public GameObject view;
        }

        static bool buildMode;
        static PlacementError currentError;
        static int selectedIndex;
        static int rotation;
        static float lastRotateTime;
        static readonly List<Placed> placedItems = new List<Placed>(MaxItems);
        internal static readonly int[] tileOwner = new int[PlotSize * PlotSize];
        static readonly Plane groundPlane = new Plane(Vector3.up, Vector3.zero);
        static GameObject ghost;
        static MeshRenderer ghostRenderer;
        static Material ghostValidMat;
        static Material ghostInvalidMat;
        static Material placedMat;
        static int lastTileX = int.MinValue;
        static int lastTileZ = 0;
        static int lastIndex = -1;
        static int lastRot = -1;
        static PlacementError appliedError = (PlacementError)(-1);
        static bool initialized;

        public static bool BuildModeActive => buildMode;
        public static PlacementError CurrentError => currentError;
        public static int SelectedIndex => selectedIndex;
        public static int SelectedRotation => rotation;
        public static int PlacedCount => placedItems.Count;
        public static List<Placed> PlacedItems => placedItems;

        public static bool TryPlaceAt(int catalogIndex, int x, int z)
        {
            if (catalogIndex < 0 || catalogIndex >= Catalog.Items.Count) return false;
            BuildItem item = Catalog.Items[catalogIndex];
            int w, d;
            item.EffectiveSize(rotation, out w, out d);
            if (x < 0 || z < 0 || x + w > PlotSize || z + d > PlotSize) { currentError = PlacementError.OutOfBounds; return false; }
            for (int iz = z; iz < z + d; iz++)
            {
                int row = iz * PlotSize;
                for (int ix = x; ix < x + w; ix++)
                {
                    if (tileOwner[row + ix] != 0) { currentError = PlacementError.Blocked; return false; }
                }
            }
            if (placedItems.Count >= MaxItems) { currentError = PlacementError.Blocked; return false; }
            if (Wallet.Current < item.cost) { currentError = PlacementError.NoFunds; return false; }
            currentError = PlacementError.None;
            AddItem(catalogIndex, x, z, rotation);
            Wallet.TrySpend(item.cost);
            return true;
        }

        public static bool TryDeleteAt(int x, int z, out int refundAmount)
        {
            refundAmount = 0;
            if (x < 0 || x >= PlotSize || z < 0 || z >= PlotSize) return false;
            int slotIdx = tileOwner[z * PlotSize + x] - 1;
            if (slotIdx < 0) return false;
            Placed p = placedItems[slotIdx];
            refundAmount = Catalog.Items[p.catalogIndex].cost;
            DeleteAt(x, z);
            return true;
        }

        public static void SetSelectedIndex(int idx)
        {
            selectedIndex = ((idx % Catalog.Items.Count) + Catalog.Items.Count) % Catalog.Items.Count;
        }

        public static void SetRotation(int rot)
        {
            rotation = rot % 360;
        }

        public static void EnterBuildMode()
        {
            if (buildMode) return;
            ToggleMode();
        }

        public static void ExitBuildMode()
        {
            if (!buildMode) return;
            ToggleMode();
        }

        void Start()
        {
            if (initialized) return;
            initialized = true;
            System.Array.Clear(tileOwner, 0, tileOwner.Length);
            var pending = PlotSaveService.Pending;
            for (int i = 0; i < pending.Count; i++)
            {
                PlotSaveService.SavedItem s = pending[i];
                int ci = Catalog.IndexOf(s.id);
                if (ci >= 0) AddItem(ci, s.x, s.z, s.rot);
            }
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Tab))
            {
                ToggleMode();
                return;
            }
            if (!buildMode) return;

            if (EventSystem.current != null && EventSystem.current.IsPointerOverGameObject())
            {
                HideGhost();
                currentError = PlacementError.None;
                return;
            }

            if (Input.GetKeyDown(KeyCode.R) && Time.unscaledTime - lastRotateTime >= RotateGate)
            {
                lastRotateTime = Time.unscaledTime;
                rotation = (rotation + 90) % 360;
            }
            float scroll = Input.mouseScrollDelta.y;
            if (scroll < -0.01f) CycleSelection(1);
            else if (scroll > 0.01f) CycleSelection(-1);

            Camera cam = Camera.main;
            if (cam == null)
            {
                HideGhost();
                currentError = PlacementError.None;
                return;
            }
            Ray ray = cam.ScreenPointToRay(Input.mousePosition);
            float enter;
            if (!groundPlane.Raycast(ray, out enter))
            {
                HideGhost();
                currentError = PlacementError.None;
                return;
            }
            Vector3 hit = ray.GetPoint(enter);
            int tx = Mathf.FloorToInt(hit.x);
            int tz = Mathf.FloorToInt(hit.z);
            BuildItem item = Catalog.Items[selectedIndex];
            int w, d;
            item.EffectiveSize(rotation, out w, out d);
            currentError = Validate(tx, tz, w, d, item.cost);
            ShowGhost(tx, tz, selectedIndex, rotation, currentError);
            if (Input.GetMouseButtonDown(0))
            {
                if (currentError == PlacementError.None) Place(selectedIndex, tx, tz);
            }
            else if (Input.GetMouseButtonDown(1))
            {
                DeleteAt(tx, tz);
            }
        }

        static void CycleSelection(int step)
        {
            int count = Catalog.Items.Count;
            selectedIndex += step;
            if (selectedIndex < 0) selectedIndex = count - 1;
            else if (selectedIndex >= count) selectedIndex = 0;
        }

        static PlacementError Validate(int x, int z, int w, int d, int cost)
        {
            if (x < 0 || z < 0 || x + w > PlotSize || z + d > PlotSize) return PlacementError.OutOfBounds;
            for (int iz = z; iz < z + d; iz++)
            {
                int row = iz * PlotSize;
                for (int ix = x; ix < x + w; ix++)
                {
                    if (tileOwner[row + ix] != 0) return PlacementError.Blocked;
                }
            }
            if (placedItems.Count >= MaxItems) return PlacementError.Blocked;
            if (Wallet.Current < cost) return PlacementError.NoFunds;
            return PlacementError.None;
        }

        static void Place(int catalogIndex, int x, int z)
        {
            AddItem(catalogIndex, x, z, rotation);
            Wallet.TrySpend(Catalog.Items[catalogIndex].cost);
        }

        static void AddItem(int catalogIndex, int x, int z, int rot)
        {
            BuildItem item = Catalog.Items[catalogIndex];
            GameObject view = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Collider col = view.GetComponent<Collider>();
            if (col != null) Destroy(col);
            view.name = item.id;
            MeshRenderer mr = view.GetComponent<MeshRenderer>();
            mr.sharedMaterial = EnsurePlacedMaterial();
            int w, d;
            item.EffectiveSize(rot, out w, out d);
            Transform t = view.transform;
            t.position = new Vector3(x + w * 0.5f, item.height * 0.5f, z + d * 0.5f);
            t.localScale = new Vector3(w - TileGap, item.height, d - TileGap);
            Placed p;
            p.catalogIndex = catalogIndex;
            p.x = x;
            p.z = z;
            p.rot = rot;
            p.view = view;
            placedItems.Add(p);
            int slot = placedItems.Count;
            for (int iz = z; iz < z + d; iz++)
            {
                int row = iz * PlotSize;
                for (int ix = x; ix < x + w; ix++) tileOwner[row + ix] = slot;
            }
        }

        static void DeleteAt(int x, int z)
        {
            if (x < 0 || x >= PlotSize || z < 0 || z >= PlotSize) return;
            int slotIdx = tileOwner[z * PlotSize + x] - 1;
            if (slotIdx < 0) return;
            Placed p = placedItems[slotIdx];
            int w, d;
            Catalog.Items[p.catalogIndex].EffectiveSize(p.rot, out w, out d);
            for (int iz = p.z; iz < p.z + d; iz++)
            {
                int row = iz * PlotSize;
                for (int ix = p.x; ix < p.x + w; ix++) tileOwner[row + ix] = 0;
            }
            placedItems.RemoveAt(slotIdx);
            if (p.view != null) Destroy(p.view);
            Wallet.Refund(Catalog.Items[p.catalogIndex].cost);
        }

        static void ToggleMode()
        {
            buildMode = !buildMode;
            if (buildMode)
            {
                selectedIndex = 0;
                rotation = 0;
                currentError = PlacementError.None;
                EnsureGhost();
                Cursor.lockState = CursorLockMode.None;
                Cursor.visible = true;
            }
            else
            {
                HideGhost();
                if (ghost != null) Destroy(ghost);
                ghost = null;
                ghostRenderer = null;
                currentError = PlacementError.None;
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
            }
        }

        static void EnsureGhost()
        {
            if (ghost != null) return;
            ghost = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Collider col = ghost.GetComponent<Collider>();
            if (col != null) Destroy(col);
            ghost.name = "Ghost";
            ghostRenderer = ghost.GetComponent<MeshRenderer>();
            ghostRenderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            if (ghostValidMat == null)
            {
                Shader shader = Shader.Find("Legacy Shaders/Transparent/Diffuse");
                if (shader == null) shader = Shader.Find("Legacy Shaders/Diffuse");
                ghostValidMat = new Material(shader);
                ghostValidMat.color = new Color(0.25f, 1f, 0.35f, 0.55f);
                ghostInvalidMat = new Material(shader);
                ghostInvalidMat.color = new Color(1f, 0.2f, 0.2f, 0.55f);
            }
            ghost.SetActive(false);
            InvalidateGhostCache();
        }

        static void ShowGhost(int tx, int tz, int index, int rot, PlacementError err)
        {
            if (ghost == null) EnsureGhost();
            if (!ghost.activeSelf) ghost.SetActive(true);
            if (tx != lastTileX || tz != lastTileZ || index != lastIndex || rot != lastRot)
            {
                lastTileX = tx;
                lastTileZ = tz;
                lastIndex = index;
                lastRot = rot;
                BuildItem item = Catalog.Items[index];
                int w, d;
                item.EffectiveSize(rot, out w, out d);
                Transform t = ghost.transform;
                t.position = new Vector3(tx + w * 0.5f, item.height * 0.5f, tz + d * 0.5f);
                t.localScale = new Vector3(w - TileGap, item.height, d - TileGap);
            }
            if (err != appliedError)
            {
                appliedError = err;
                ghostRenderer.sharedMaterial = err == PlacementError.None ? ghostValidMat : ghostInvalidMat;
            }
        }

        static void HideGhost()
        {
            if (ghost != null && ghost.activeSelf) ghost.SetActive(false);
            InvalidateGhostCache();
        }

        static void InvalidateGhostCache()
        {
            lastTileX = int.MinValue;
            lastTileZ = 0;
            lastIndex = -1;
            lastRot = -1;
            appliedError = (PlacementError)(-1);
        }

        static Material EnsurePlacedMaterial()
        {
            if (placedMat == null)
            {
                placedMat = new Material(Shader.Find("Legacy Shaders/Diffuse"));
                placedMat.color = new Color(0.75f, 0.65f, 0.5f);
            }
            return placedMat;
        }
    }
}
