namespace BloxburgLite.Build
{
    [System.Serializable]
    public class BuildItem
    {
        public string id;
        public string displayName;
        public int cost;
        public int width;
        public int depth;
        public float height;

        public void EffectiveSize(int rot, out int w, out int d)
        {
            if (rot == 90 || rot == 270)
            {
                w = depth;
                d = width;
            }
            else
            {
                w = width;
                d = depth;
            }
        }
    }

    public static class Catalog
    {
        static readonly BuildItem[] items =
        {
            new BuildItem { id = "chair", displayName = "Chair", cost = 50, width = 1, depth = 1, height = 0.8f },
            new BuildItem { id = "table", displayName = "Table", cost = 120, width = 2, depth = 2, height = 0.7f },
            new BuildItem { id = "bed", displayName = "Bed", cost = 300, width = 2, depth = 3, height = 0.5f },
            new BuildItem { id = "sofa", displayName = "Sofa", cost = 250, width = 3, depth = 1, height = 0.8f },
            new BuildItem { id = "lamp", displayName = "Lamp", cost = 75, width = 1, depth = 1, height = 1.4f }
        };

        public static readonly System.Collections.Generic.IReadOnlyList<BuildItem> Items = items;

        public static int IndexOf(string id)
        {
            for (int i = 0; i < items.Length; i++)
            {
                if (items[i].id == id) return i;
            }
            return -1;
        }
    }
}
