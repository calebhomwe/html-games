using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;
using BloxburgLite.Build;
using BloxburgLite.Persistence;
using System.IO;

[InitializeOnLoad]
public class AutoSceneGen : UnityEditor.AssetModificationProcessor
{
    static bool _done = false;

    static AutoSceneGen()
    {
        if (_done) return;
        _done = true;
        
        var path = "Assets/Scenes/Sample.unity";
        if (!File.Exists(path)) GenerateScene(path);
    }

    public static void GenerateScene(string path)
    {
        var newScene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene);
        SceneManager.SetActiveScene(newScene);

        // Ground plane
        var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
        ground.name = "Ground";
        ground.transform.position = new Vector3(5f, 0f, 5f);
        ground.transform.localScale = new Vector3(20f, 1f, 20f);
        var groundMat = new Material(Shader.Find("Legacy Shaders/Diffuse"));
        groundMat.color = new Color(0.28f, 0.52f, 0.22f);
        ground.GetComponent<Renderer>().sharedMaterial = groundMat;

        // Grid lines
        var lineMat = new Material(Shader.Find("Legacy Shaders/Diffuse"));
        lineMat.color = new Color(0.55f, 0.55f, 0.55f);
        for (int i = 0; i <= 10; i++)
        {
            MakeLine(new Vector3(5f, 0.005f, i), new Vector3(10f, 0.001f, 0.02f), lineMat);
            MakeLine(new Vector3(i, 0.005f, 5f), new Vector3(0.02f, 0.001f, 10f), lineMat);
        }

        // Decorative items pre-placed
        PlaceDecor("chair", 1f, 3f, 0f, new Color(0.85f, 0.65f, 0.45f), new Vector3(0.8f, 0.7f, 0.8f));
        PlaceDecor("table", 5f, 5f, 90f, new Color(0.65f, 0.48f, 0.35f), new Vector3(0.9f, 0.5f, 0.9f));
        PlaceDecor("bed", 7f, 2f, 0f, new Color(0.45f, 0.55f, 0.75f), new Vector3(0.95f, 0.6f, 1.8f));
        PlaceDecor("sofa", 3f, 7f, 0f, new Color(0.55f, 0.35f, 0.55f), new Vector3(0.9f, 0.75f, 0.95f));
        PlaceDecor("lamp", 0f, 9f, 0f, new Color(0.95f, 0.9f, 0.7f), new Vector3(0.3f, 0.9f, 0.3f));

        // Player capsule
        var player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        player.name = "Player";
        player.transform.position = new Vector3(5f, 1f, 9f);
        DestroyObj(player.GetComponent<Collider>());
        player.AddComponent<BloxburgLite.Player.PlayerController>();
        var pMat = new Material(Shader.Find("Legacy Shaders/Diffuse"));
        pMat.color = new Color(0.35f, 0.55f, 0.9f);
        player.GetComponent<Renderer>().sharedMaterial = pMat;

        // Camera - high diagonal view of whole plot
        var cam = new GameObject("Main Camera");
        cam.transform.position = new Vector3(5f, 14f, -4f);
        cam.transform.LookAt(new Vector3(5f, 0f, 6f));
        cam.tag = "MainCamera";
        cam.AddComponent<Camera>();
        cam.AddComponent<AudioListener>();
        var mainCam = cam.GetComponent<Camera>();
        mainCam.clearFlags = CameraClearFlags.SolidColor;
        mainCam.backgroundColor = new Color(0.4f, 0.6f, 0.8f, 1f);

        // Systems + auto-demo
        var systems = new GameObject("Systems");
        systems.AddComponent<GridPlacementService>();
        systems.AddComponent<PlotSaveService>();
        systems.AddComponent<AutoDemo>();

        // Hidden ghost reference object: guarantees Legacy Transparent shader is included in builds
        var ghostRef = GameObject.CreatePrimitive(PrimitiveType.Cube);
        ghostRef.name = "ShaderRef_Ghost";
        ghostRef.SetActive(false);
        DestroyObj(ghostRef.GetComponent<Collider>());
        var ghostMatRef = new Material(Shader.Find("Legacy Shaders/Transparent/Diffuse"));
        ghostMatRef.color = new Color(0.25f, 1f, 0.35f, 0.5f);
        ghostRef.GetComponent<Renderer>().sharedMaterial = ghostMatRef;

        EditorSceneManager.MarkSceneDirty(newScene);
        EditorSceneManager.SaveScene(newScene, path);
        Debug.Log("Auto scene generated: " + path);
    }

    static void MakeLine(Vector3 pos, Vector3 scale, Material mat)
    {
        var obj = GameObject.CreatePrimitive(PrimitiveType.Cube);
        obj.transform.position = pos;
        obj.transform.localScale = scale;
        DestroyObj(obj.GetComponent<Collider>());
        obj.GetComponent<Renderer>().sharedMaterial = mat;
    }

    static void PlaceDecor(string id, float x, float z, float rotDeg, Color col, Vector3 scale)
    {
        int ci = Catalog.IndexOf(id);
        if (ci < 0) return;
        var item = Catalog.Items[ci];
        int w, d;
        item.EffectiveSize(0, out w, out d);
        var obj = GameObject.CreatePrimitive(PrimitiveType.Cube);
        obj.name = id;
        obj.transform.position = new Vector3(x + w * 0.5f, item.height * 0.5f, z + d * 0.5f);
        obj.transform.localRotation = Quaternion.Euler(0f, rotDeg, 0f);
        obj.transform.localScale = scale;
        DestroyObj(obj.GetComponent<Collider>());
        var mat = new Material(Shader.Find("Legacy Shaders/Diffuse"));
        mat.color = col;
        obj.GetComponent<Renderer>().sharedMaterial = mat;
    }

    static void DestroyObj(UnityEngine.Object o) { if (o != null) UnityEngine.Object.DestroyImmediate(o); }

    // Build entry point
    [MenuItem("BloxburgLite/AutoBuild &B")]
    public static void AutoBuildWin64()
    {
        GenerateScene("Assets/Scenes/Sample.unity");
        System.Threading.Thread.Sleep(300);
        UnityEditor.EditorBuildSettings.scenes = new[] { new UnityEditor.EditorBuildSettingsScene("Assets/Scenes/Sample.unity", true) };
        UnityEditor.PlayerSettings.SetScriptingBackend(UnityEditor.BuildTargetGroup.Standalone, UnityEditor.ScriptingImplementation.Mono2x);
        var opts = new UnityEditor.BuildPlayerOptions();
        opts.scenes = new[] { "Assets/Scenes/Sample.unity" };
        opts.locationPathName = Path.Combine(Path.GetDirectoryName(Application.dataPath), "BloxburgLite_Win64.exe");
        opts.target = BuildTarget.StandaloneWindows64;
        opts.options = UnityEditor.BuildOptions.None;
        var result = UnityEditor.BuildPipeline.BuildPlayer(opts);
        bool ok = File.Exists(opts.locationPathName);
        Debug.Log("EXE " + (ok ? "OK" : "FAIL") + " -> " + opts.locationPathName);
    }
}
