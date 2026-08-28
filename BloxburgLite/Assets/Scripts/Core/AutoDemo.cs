using UnityEngine;
using BloxburgLite.Build;

public class AutoDemo : MonoBehaviour
{
    float _t;
    int _phase;

    void Update()
    {
        _t += Time.deltaTime;
        if (_phase == 0 && _t > 1.5f)
        {
            _phase = 1;
            GridPlacementService.SetSelectedIndex(0);
            GridPlacementService.TryPlaceAt(0, 2, 2);
            GridPlacementService.SetSelectedIndex(1);
            GridPlacementService.TryPlaceAt(1, 6, 6);
            GridPlacementService.SetSelectedIndex(3);
            GridPlacementService.TryPlaceAt(3, 0, 8);
            GridPlacementService.EnterBuildMode();
        }
        if (_phase == 1 && _t > 3.5f)
        {
            _phase = 2;
            UnityEngine.ScreenCapture.CaptureScreenshot("C:\\Users\\code\\AppData\\Local\\Temp\\opencode\\bbl_demo_shot.png");
            Debug.Log("DEMO: placed=" + GridPlacementService.PlacedCount + " money=$" + BloxburgLite.Economy.Wallet.Current);
        }
    }
}
