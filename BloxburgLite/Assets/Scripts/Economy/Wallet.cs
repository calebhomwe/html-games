namespace BloxburgLite.Economy
{
    public static class Wallet
    {
        public const int StartAmount = 1000;

        static int current = StartAmount;

        public static int Current => current;

        public static event System.Action<int> OnChanged;

        public static bool TrySpend(int amount)
        {
            if (amount < 0 || amount > current) return false;
            current -= amount;
            if (OnChanged != null) OnChanged(current);
            return true;
        }

        public static void Refund(int amount)
        {
            if (amount <= 0) return;
            current += amount;
            if (OnChanged != null) OnChanged(current);
        }

        internal static void Restore(int amount)
        {
            if (amount < 0) amount = 0;
            if (current == amount) return;
            current = amount;
            if (OnChanged != null) OnChanged(current);
        }
    }
}
