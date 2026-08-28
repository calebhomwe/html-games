using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using BloxburgLite.Build;
using BloxburgLite.Economy;

namespace BloxburgLite.Persistence
{
    public class PlotSaveService : MonoBehaviour
    {
        public struct SavedItem
        {
            public string id;
            public int x;
            public int z;
            public int rot;
        }

        [Serializable]
        class PlotBounds
        {
            public int sizeX;
            public int sizeZ;
        }

        [Serializable]
        class SaveEntry
        {
            public string id;
            public int x;
            public int z;
            public int rot;
        }

        [Serializable]
        class SaveData
        {
            public int version;
            public int money;
            public PlotBounds plot;
            public List<SaveEntry> items;
        }

        static readonly List<SavedItem> pending = new List<SavedItem>();

        public static string FilePath => Application.persistentDataPath + "/bloxburglite.json";

        internal static List<SavedItem> Pending => pending;

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        static void Boot()
        {
            pending.Clear();
            Wallet.OnChanged -= OnMoneyChanged;
            Application.quitting -= Persist;
            Wallet.Restore(Wallet.StartAmount);
            Load();
            Wallet.OnChanged += OnMoneyChanged;
            Application.quitting += Persist;
        }

        static void Load()
        {
            try
            {
                if (!File.Exists(FilePath)) return;
                string json = File.ReadAllText(FilePath).Replace("\"y\":", "\"z\":");
                SaveData data = JsonUtility.FromJson<SaveData>(json);
                if (data == null || data.version != 1 || data.money < 0 || data.plot == null ||
                    data.plot.sizeX != GridPlacementService.PlotSize || data.plot.sizeZ != GridPlacementService.PlotSize)
                {
                    Debug.LogWarning("BloxburgLite save discarded: schema violation");
                    return;
                }
                Wallet.Restore(data.money);
                if (data.items == null) return;
                bool[] occupancy = new bool[GridPlacementService.PlotSize * GridPlacementService.PlotSize];
                for (int i = 0; i < data.items.Count; i++)
                {
                    SaveEntry e = data.items[i];
                    int ci = Catalog.IndexOf(e.id);
                    if (ci < 0)
                    {
                        Debug.LogWarning("BloxburgLite dropped unknown item id: " + e.id);
                        continue;
                    }
                    if (e.rot < 0 || e.rot > 270 || e.rot % 90 != 0)
                    {
                        Debug.LogWarning("BloxburgLite dropped item with invalid rot: " + e.id);
                        continue;
                    }
                    int w, d;
                    Catalog.Items[ci].EffectiveSize(e.rot, out w, out d);
                    if (e.x < 0 || e.z < 0 || e.x + w > GridPlacementService.PlotSize || e.z + d > GridPlacementService.PlotSize)
                    {
                        Debug.LogWarning("BloxburgLite dropped out-of-bounds item: " + e.id);
                        continue;
                    }
                    bool free = true;
                    for (int iz = e.z; iz < e.z + d && free; iz++)
                    {
                        int row = iz * GridPlacementService.PlotSize;
                        for (int ix = e.x; ix < e.x + w; ix++)
                        {
                            if (occupancy[row + ix])
                            {
                                free = false;
                                break;
                            }
                        }
                    }
                    if (!free)
                    {
                        Debug.LogWarning("BloxburgLite dropped overlapping item: " + e.id);
                        continue;
                    }
                    for (int iz = e.z; iz < e.z + d; iz++)
                    {
                        int row = iz * GridPlacementService.PlotSize;
                        for (int ix = e.x; ix < e.x + w; ix++) occupancy[row + ix] = true;
                    }
                    SavedItem s;
                    s.id = e.id;
                    s.x = e.x;
                    s.z = e.z;
                    s.rot = e.rot;
                    pending.Add(s);
                }
            }
            catch (Exception ex)
            {
                pending.Clear();
                Wallet.Restore(Wallet.StartAmount);
                Debug.LogWarning("BloxburgLite save discarded: corrupt (" + ex.Message + ")");
            }
        }

        static void OnMoneyChanged(int money)
        {
            Persist();
        }

        static void Persist()
        {
            try
            {
                SaveData data = new SaveData();
                data.version = 1;
                data.money = Wallet.Current;
                data.plot = new PlotBounds();
                data.plot.sizeX = GridPlacementService.PlotSize;
                data.plot.sizeZ = GridPlacementService.PlotSize;
                data.items = new List<SaveEntry>(GridPlacementService.PlacedCount);
                var items = GridPlacementService.PlacedItems;
                for (int i = 0; i < items.Count; i++)
                {
                    GridPlacementService.Placed p = items[i];
                    SaveEntry e = new SaveEntry();
                    e.id = Catalog.Items[p.catalogIndex].id;
                    e.x = p.x;
                    e.z = p.z;
                    e.rot = p.rot;
                    data.items.Add(e);
                }
                File.WriteAllText(FilePath, JsonUtility.ToJson(data));
            }
            catch (Exception ex)
            {
                Debug.LogWarning("BloxburgLite autosave failed: " + ex.Message);
            }
        }
    }
}
