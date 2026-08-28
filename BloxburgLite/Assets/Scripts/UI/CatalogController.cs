using System.Collections.Generic;
using BloxburgLite.Build;
using BloxburgLite.Economy;
using UnityEngine;
using UnityEngine.UI;

namespace BloxburgLite.UI
{
    public class CatalogController : MonoBehaviour
    {
        public enum GhostValidity { Valid, OutOfBounds, Blocked, NoFunds }

        static readonly BuildItem[] FallbackItems =
        {
            new BuildItem { id = "chair", displayName = "Chair", cost = 50 },
            new BuildItem { id = "table", displayName = "Table", cost = 120 },
            new BuildItem { id = "bed", displayName = "Bed", cost = 300 },
            new BuildItem { id = "sofa", displayName = "Sofa", cost = 250 },
            new BuildItem { id = "lamp", displayName = "Lamp", cost = 75 }
        };

        static readonly Color PlateBlack55 = new Color(0f, 0f, 0f, 0.55f);
        static readonly Color PlateBlack70 = new Color(0f, 0f, 0f, 0.7f);
        static readonly Color SlotPlateIdle = new Color(18f / 255f, 22f / 255f, 27f / 255f, 0.85f);
        static readonly Color SlotPlateSelected = new Color(18f / 255f, 22f / 255f, 27f / 255f, 1f);
        static readonly Color NeedRed = new Color(224f / 255f, 82f / 255f, 82f / 255f, 1f);
        static readonly Color White = Color.white;
        static readonly Color White85 = new Color(1f, 1f, 1f, 0.85f);

        static CatalogController _instance;

        readonly BuildItem[] _items = new BuildItem[5];
        readonly Image[] _slotPlates = new Image[5];
        readonly Text[] _slotNames = new Text[5];
        readonly Text[] _slotCosts = new Text[5];
        readonly CanvasGroup[] _slotGroups = new CanvasGroup[5];
        readonly bool[] _slotAffordable = new bool[5];

        RectTransform _canvasRect;
        Text _moneyText;
        Text _hintText;
        RectTransform _hintRect;
        GameObject _overlay;
        GameObject _reasonPlate;
        Text _selText;
        Text _reasonText;
        RectTransform _frameRect;
        Sprite _frameSprite;
        Font _font;

        int _money = -1;
        int _selected = -1;
        bool _buildMode;
        GhostValidity _pushedState = GhostValidity.Valid;
        string _lastReasonShown;

        public static CatalogController Instance { get { return _instance; } }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void Bootstrap()
        {
            if (_instance != null) return;
            var root = new GameObject("CatalogRoot");
            Object.DontDestroyOnLoad(root);
            _instance = root.AddComponent<CatalogController>();
        }

        void Awake()
        {
            ResolveCatalog();
            _font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            _frameSprite = CreateFrameSprite();
            BuildCanvas();
            BuildHud();
            BuildOverlayUi();
            SetSelection(0);
            Wallet.OnChanged += OnWalletChanged;
            SetMoney(Wallet.Current);
        }

        void OnDestroy()
        {
            Wallet.OnChanged -= OnWalletChanged;
            if (_instance == this) _instance = null;
        }

        void Update()
        {
            bool buildActive = GridPlacementService.BuildModeActive;
            if (buildActive != _buildMode) SetBuildMode(buildActive);
            if (!buildActive) return;
            int svcIndex = GridPlacementService.SelectedIndex;
            if (svcIndex != _selected) SetSelection(svcIndex);
            switch (GridPlacementService.CurrentError)
            {
                case PlacementError.OutOfBounds: ShowGhostState(GhostValidity.OutOfBounds); break;
                case PlacementError.Blocked: ShowGhostState(GhostValidity.Blocked); break;
                case PlacementError.NoFunds: ShowGhostState(GhostValidity.NoFunds); break;
                default: HideGhostFeedback(); break;
            }
        }

        public void SetMoney(int amount)
        {
            if (amount == _money) return;
            _money = amount;
            if (_moneyText != null) _moneyText.text = FormatMoney(amount);
            RefreshAffordability();
            UpdateReasonLabel();
        }

        public void SetBuildMode(bool on)
        {
            if (on == _buildMode) return;
            _buildMode = on;
            _overlay.SetActive(on);
            if (on) ApplyHintBuildGeometry();
            else ApplyHintPlayGeometry();
            _hintText.text = on ? "Tab = Done" : "Tab = Build";
            if (!on) HideGhostFeedback();
            UpdateReasonLabel();
        }

        public void SetSelection(int index)
        {
            int wrapped = ((index % 5) + 5) % 5;
            if (wrapped == _selected) return;
            _selected = wrapped;
            for (int i = 0; i < 5; i++)
            {
                bool sel = i == _selected;
                _slotPlates[i].color = sel ? SlotPlateSelected : SlotPlateIdle;
                _slotGroups[i].transform.localScale = sel ? new Vector3(1.06f, 1.06f, 1f) : Vector3.one;
            }
            _frameRect.SetParent(_slotPlates[_selected].transform, false);
            _frameRect.SetSiblingIndex(0);
            BuildItem item = _items[_selected];
            _selText.text = item.displayName + " \u2014 " + FormatMoney(item.cost);
            RefreshAffordability();
            UpdateReasonLabel();
        }

        public void RefreshAffordability()
        {
            for (int i = 0; i < 5; i++)
            {
                bool afford = _money >= _items[i].cost;
                if (afford == _slotAffordable[i]) continue;
                _slotAffordable[i] = afford;
                _slotGroups[i].alpha = afford ? 1f : 0.55f;
                if (afford)
                {
                    _slotCosts[i].text = FormatMoney(_items[i].cost);
                    _slotCosts[i].color = White85;
                }
                else
                {
                    _slotCosts[i].text = "NEED " + FormatMoney(_items[i].cost);
                    _slotCosts[i].color = NeedRed;
                }
            }
        }

        public void ShowGhostState(GhostValidity state)
        {
            if (state == _pushedState) return;
            _pushedState = state;
            UpdateReasonLabel();
        }

        public void HideGhostFeedback()
        {
            if (_pushedState == GhostValidity.Valid) return;
            _pushedState = GhostValidity.Valid;
            UpdateReasonLabel();
        }

        void UpdateReasonLabel()
        {
            GhostValidity effective = _pushedState;
            if (effective == GhostValidity.Valid && _buildMode && _money < _items[_selected].cost)
                effective = GhostValidity.NoFunds;
            string s = ReasonString(effective);
            bool show = _buildMode && effective != GhostValidity.Valid && s.Length > 0;
            if (_reasonPlate.activeSelf != show) _reasonPlate.SetActive(show);
            if (!show || s == _lastReasonShown) return;
            _lastReasonShown = s;
            _reasonText.text = s;
        }

        void ResolveCatalog()
        {
            IReadOnlyList<BuildItem> src = Catalog.Items;
            if (src != null && src.Count >= 5)
            {
                for (int i = 0; i < 5; i++) _items[i] = src[i];
                return;
            }
            Debug.LogWarning("CatalogController: Catalog.Items unavailable or shorter than 5 entries, using fallback catalog.");
            for (int i = 0; i < 5; i++) _items[i] = FallbackItems[i];
        }

        void BuildCanvas()
        {
            var canvasGo = new GameObject("UICanvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvasGo.transform.SetParent(transform, false);
            _canvasRect = (RectTransform)canvasGo.transform;
            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvasGo.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1920f, 1080f);
            scaler.matchWidthOrHeight = 0.5f;
        }

        void BuildHud()
        {
            Image money = MakePlate("HUD_Money", _canvasRect, PlateBlack55);
            Anchor((RectTransform)money.transform, new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(0f, 1f), new Vector2(24f, -20f), new Vector2(240f, 40f));
            _moneyText = MakeText("Money_Text", money.transform, new Vector2(0f, 0f), new Vector2(1f, 1f), new Vector2(14f, 2f), new Vector2(-10f, -2f), 32, FontStyle.Bold, White, TextAnchor.MiddleLeft);

            Image hint = MakePlate("HUD_Hint", _canvasRect, PlateBlack55);
            _hintRect = (RectTransform)hint.transform;
            ApplyHintPlayGeometry();
            _hintText = MakeText("Hint_Text", hint.transform, new Vector2(0f, 0f), new Vector2(1f, 1f), new Vector2(8f, 2f), new Vector2(-8f, -2f), 20, FontStyle.Normal, White, TextAnchor.MiddleCenter);
        }

        void BuildOverlayUi()
        {
            var overlayGo = MakeChild("BuildOverlay", _canvasRect);
            Stretch((RectTransform)overlayGo.transform);
            overlayGo.SetActive(false);
            _overlay = overlayGo;

            Image strip = MakePlate("Catalog_Strip", overlayGo.transform, Color.clear);
            Anchor((RectTransform)strip.transform, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0f, 24f), new Vector2(688f, 88f));
            HorizontalLayoutGroup hlg = strip.gameObject.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 12f;
            hlg.padding = new RectOffset();
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = false;
            hlg.childControlHeight = false;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;

            for (int i = 0; i < 5; i++)
            {
                Image slot = MakePlate("Slot_" + i + "_" + _items[i].displayName, strip.transform, SlotPlateIdle);
                Anchor((RectTransform)slot.transform, new Vector2(0f, 0f), new Vector2(0f, 0f), new Vector2(0.5f, 0.5f), Vector2.zero, new Vector2(128f, 88f));
                CanvasGroup group = slot.gameObject.AddComponent<CanvasGroup>();
                group.blocksRaycasts = false;
                group.interactable = false;
                group.alpha = 1f;
                _slotPlates[i] = slot;
                _slotGroups[i] = group;
                _slotAffordable[i] = true;
                _slotNames[i] = MakeText("Name", slot.transform, new Vector2(0f, 0.52f), new Vector2(1f, 0.94f), new Vector2(6f, 0f), new Vector2(-6f, 0f), 18, FontStyle.Bold, White, TextAnchor.MiddleCenter);
                _slotNames[i].text = _items[i].displayName;
                _slotCosts[i] = MakeText("Cost", slot.transform, new Vector2(0f, 0.06f), new Vector2(1f, 0.48f), new Vector2(6f, 0f), new Vector2(-6f, 0f), 18, FontStyle.Normal, White85, TextAnchor.MiddleCenter);
                _slotCosts[i].text = FormatMoney(_items[i].cost);
            }

            Image sel = MakePlate("Selection_Label", overlayGo.transform, PlateBlack55);
            Anchor((RectTransform)sel.transform, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0f, 116f), new Vector2(320f, 36f));
            _selText = MakeText("Sel_Text", sel.transform, new Vector2(0f, 0f), new Vector2(1f, 1f), new Vector2(10f, 2f), new Vector2(-10f, -2f), 26, FontStyle.Bold, White, TextAnchor.MiddleCenter);

            Image reason = MakePlate("Invalid_Reason", overlayGo.transform, PlateBlack70);
            Anchor((RectTransform)reason.transform, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0f, 156f), new Vector2(360f, 36f));
            _reasonText = MakeText("Reason_Text", reason.transform, new Vector2(0f, 0f), new Vector2(1f, 1f), new Vector2(10f, 2f), new Vector2(-10f, -2f), 24, FontStyle.Bold, White, TextAnchor.MiddleCenter);
            reason.gameObject.SetActive(false);
            _reasonPlate = reason.gameObject;

            var frameGo = MakeChild("Selection_Frame", _slotPlates[0].transform);
            _frameRect = (RectTransform)frameGo.transform;
            Stretch(_frameRect);
            Image frameImage = frameGo.AddComponent<Image>();
            frameImage.sprite = _frameSprite;
            frameImage.type = Image.Type.Sliced;
            frameImage.color = White;
            frameImage.raycastTarget = false;
            _frameRect.SetSiblingIndex(0);
        }

        void ApplyHintPlayGeometry()
        {
            Anchor(_hintRect, new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0.5f, 0f), new Vector2(0f, 18f), new Vector2(300f, 34f));
        }

        void ApplyHintBuildGeometry()
        {
            Anchor(_hintRect, new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(1f, 0f), new Vector2(-24f, 18f), new Vector2(300f, 34f));
        }

        static Sprite CreateFrameSprite()
        {
            var tex = new Texture2D(12, 12, TextureFormat.RGBA32, false);
            tex.filterMode = FilterMode.Point;
            tex.wrapMode = TextureWrapMode.Clamp;
            var px = new Color32[144];
            var solid = new Color32(255, 255, 255, 255);
            var clearC = new Color32(255, 255, 255, 0);
            for (int y = 0; y < 12; y++)
            {
                for (int x = 0; x < 12; x++)
                {
                    px[y * 12 + x] = (x < 4 || x >= 8 || y < 4 || y >= 8) ? solid : clearC;
                }
            }
            tex.SetPixels32(px);
            tex.Apply(false, true);
            return Sprite.Create(tex, new Rect(0f, 0f, 12f, 12f), new Vector2(0.5f, 0.5f), 1f, 0, SpriteMeshType.FullRect, new Vector4(4f, 4f, 4f, 4f));
        }

        static GameObject MakeChild(string goName, Transform parent)
        {
            var go = new GameObject(goName, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        static Image MakePlate(string goName, Transform parent, Color color)
        {
            var go = MakeChild(goName, parent);
            Image img = go.AddComponent<Image>();
            img.color = color;
            img.raycastTarget = false;
            return img;
        }

        Text MakeText(string goName, Transform parent, Vector2 anchorMin, Vector2 anchorMax, Vector2 offsetMin, Vector2 offsetMax, int size, FontStyle style, Color color, TextAnchor align)
        {
            var go = MakeChild(goName, parent);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.offsetMin = offsetMin;
            rt.offsetMax = offsetMax;
            Text t = go.AddComponent<Text>();
            t.font = _font;
            t.fontSize = size;
            t.fontStyle = style;
            t.color = color;
            t.alignment = align;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            t.raycastTarget = false;
            return t;
        }

        static void Anchor(RectTransform rt, Vector2 anchorMin, Vector2 anchorMax, Vector2 pivot, Vector2 anchoredPosition, Vector2 sizeDelta)
        {
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.pivot = pivot;
            rt.anchoredPosition = anchoredPosition;
            rt.sizeDelta = sizeDelta;
        }

        static void Stretch(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        static string ReasonString(GhostValidity state)
        {
            switch (state)
            {
                case GhostValidity.OutOfBounds: return "OUT OF BOUNDS";
                case GhostValidity.Blocked: return "BLOCKED";
                case GhostValidity.NoFunds: return "NO FUNDS";
                default: return string.Empty;
            }
        }

        static string FormatMoney(int amount)
        {
            return "$" + amount.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        void OnWalletChanged(int amount)
        {
            SetMoney(amount);
        }
    }
}
