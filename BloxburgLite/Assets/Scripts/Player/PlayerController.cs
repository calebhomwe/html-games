using UnityEngine;
using BloxburgLite.Build;

namespace BloxburgLite.Player
{
    public class PlayerController : MonoBehaviour
    {
        public const float WalkSpeed = 3f;
        public const float RunSpeed = 6f;
        public const float OrbitDistance = 6f;
        public const float DefaultPitch = 35f;
        public const float MinPitch = 10f;
        public const float MaxPitch = 70f;

        const float SmoothTime = 0.1f;
        const float MouseSensitivity = 2f;
        const float LookHeight = 1.5f;

        Transform cam;
        float yaw;
        float pitch = DefaultPitch;
        float smoothYaw;
        float smoothPitch;
        float baseY;
        Vector3 lookTarget;

        void Start()
        {
            Camera mainCam = Camera.main;
            if (mainCam != null) cam = mainCam.transform;
            baseY = transform.position.y;
            yaw = transform.eulerAngles.y;
            smoothYaw = yaw;
            smoothPitch = pitch;
        }

        void Update()
        {
            float dt = Time.deltaTime;
            if (!GridPlacementService.BuildModeActive) UpdatePlay(dt);
            else UpdateBuild(dt);
            UpdateCamera(dt);
        }

        void UpdatePlay(float dt)
        {
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                Cursor.lockState = CursorLockMode.None;
                Cursor.visible = true;
                return;
            }
            if (Cursor.lockState != CursorLockMode.Locked)
            {
                if (Input.GetMouseButtonDown(0))
                {
                    Cursor.lockState = CursorLockMode.Locked;
                    Cursor.visible = false;
                }
                return;
            }
            yaw += Input.GetAxis("Mouse X") * MouseSensitivity;
            pitch = Mathf.Clamp(pitch - Input.GetAxis("Mouse Y") * MouseSensitivity, MinPitch, MaxPitch);
            float h = Input.GetAxisRaw("Horizontal");
            float v = Input.GetAxisRaw("Vertical");
            if (h == 0f && v == 0f) return;
            float speed = Input.GetKey(KeyCode.LeftShift) ? RunSpeed : WalkSpeed;
            float r = yaw * Mathf.Deg2Rad;
            float sy = Mathf.Sin(r);
            float cy = Mathf.Cos(r);
            float step = speed * dt;
            Vector3 p = transform.position;
            p.x += (sy * v + cy * h) * step;
            p.z += (cy * v - sy * h) * step;
            p.y = baseY;
            transform.position = p;
        }

        void UpdateBuild(float dt)
        {
            if (!Input.GetMouseButton(2)) return;
            yaw += Input.GetAxis("Mouse X") * MouseSensitivity;
            pitch = Mathf.Clamp(pitch - Input.GetAxis("Mouse Y") * MouseSensitivity, MinPitch, MaxPitch);
        }

        void UpdateCamera(float dt)
        {
            if (cam == null)
            {
                Camera mainCam = Camera.main;
                if (mainCam == null) return;
                cam = mainCam.transform;
            }
            float k = 1f - Mathf.Exp(-dt / SmoothTime);
            smoothYaw = Mathf.LerpAngle(smoothYaw, yaw, k);
            smoothPitch = Mathf.Lerp(smoothPitch, pitch, k);
            float pr = smoothPitch * Mathf.Deg2Rad;
            float yr = smoothYaw * Mathf.Deg2Rad;
            float horiz = OrbitDistance * Mathf.Cos(pr);
            Vector3 p = transform.position;
            lookTarget.Set(p.x, p.y + LookHeight, p.z);
            Vector3 cp;
            cp.x = lookTarget.x - Mathf.Sin(yr) * horiz;
            cp.y = lookTarget.y + OrbitDistance * Mathf.Sin(pr);
            cp.z = lookTarget.z - Mathf.Cos(yr) * horiz;
            cam.position = cp;
            cam.LookAt(lookTarget);
        }
    }
}
