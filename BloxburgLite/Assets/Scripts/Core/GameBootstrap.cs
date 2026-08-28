using UnityEngine;

namespace BloxburgLite.Core
{
    public static class GameBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Boot()
        {
            Debug.Log("BloxburgLite v0 booted");
        }

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        private static void ReportWallet()
        {
            Debug.Log("Wallet start value: $" + Economy.Wallet.Current);
        }
    }
}
