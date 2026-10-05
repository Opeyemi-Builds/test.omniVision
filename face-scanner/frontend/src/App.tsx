import { useCallback, useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const SCAN_INTERVAL_MS = 800;

type Mode = "camera" | "upload";
type Status = "idle" | "scanning" | "match" | "unknown" | "noface" | "error";
type ApiResult = { face_found: boolean; name?: string; confidence?: number };

const STATUS_TEXT: Record<Status, string> = {
  idle: "Standing by",
  scanning: "Scanning",
  match: "Identity confirmed",
  unknown: "Unknown subject",
  noface: "No face in frame",
  error: "Backend unreachable",
};

export default function App() {
  const [mode, setMode] = useState<Mode>("camera");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);

  const send = useCallback(async (blob: Blob) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const body = new FormData();
      body.append("file", blob, "frame.jpg");
      const res = await fetch(`${API}/getface`, { method: "POST", body });
      if (!res.ok) throw new Error(String(res.status));
      const data: ApiResult = await res.json();
      setResult(data);
      if (!data.face_found) setStatus("noface");
      else if (data.name === "unknown") setStatus("unknown");
      else setStatus("match");
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }, []);

  // Live camera: open stream, grab a frame on an interval
  useEffect(() => {
    if (mode !== "camera") return;
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    let cancelled = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: 640, height: 480 },
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        setCamError(null);
        setStatus("scanning");
        timer = window.setInterval(() => {
          const c = canvasRef.current;
          if (!c || !v.videoWidth) return;
          c.width = v.videoWidth;
          c.height = v.videoHeight;
          c.getContext("2d")!.drawImage(v, 0, 0);
          c.toBlob((b) => b && send(b), "image/jpeg", 0.85);
        }, SCAN_INTERVAL_MS);
      } catch {
        setCamError("Camera blocked. Allow camera access in your browser, or upload an image.");
        setStatus("idle");
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [mode, send]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setResult(null);
    setStatus("idle");
    setPreview(null);
  };

  const onFile = (file?: File) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setStatus("scanning");
    send(file);
  };

  const conf = Math.round((result?.confidence ?? 0) * 100);
  const name = status === "match" || status === "unknown" ? result?.name : null;

  return (
    <main className="app">
      <header>
        <h1>FACE//SCAN</h1>
        <div className="tabs">
          <button className={mode === "camera" ? "on" : ""} onClick={() => switchMode("camera")}>
            Live camera
          </button>
          <button className={mode === "upload" ? "on" : ""} onClick={() => switchMode("upload")}>
            Upload image
          </button>
        </div>
      </header>

      <section className={`stage ${status}`}>
        {mode === "camera" && <video ref={videoRef} playsInline muted className="feed mirror" />}
        {mode === "upload" && preview && <img src={preview} className="feed" alt="Uploaded subject" />}
        {mode === "upload" && !preview && (
          <label className="drop">
            <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <span>Drop in a photo or click to choose one</span>
          </label>
        )}

        <div className="grid" />
        <div className="vignette" />
        <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
        {(status === "scanning" || status === "match" || status === "unknown") && <div className="beam" />}
        <div className="reticle"><span /><span /><span /><span /></div>

        <div className="hud top">
          <span>{STATUS_TEXT[status]}</span>
          <span className="blink">REC</span>
        </div>
        <div className="hud bottom">
          <span>{mode === "camera" ? "SRC: FRONT CAM" : "SRC: IMAGE FILE"}</span>
          <span>{API.replace(/^https?:\/\//, "")}</span>
        </div>
        {camError && <p className="err">{camError}</p>}
      </section>

      <section className={`readout ${status}`}>
        <div>
          <label>Subject</label>
          <strong key={name ?? "none"} className="name">{name ? name.toUpperCase() : "—"}</strong>
        </div>
        <div className="meter">
          <label>Confidence {result?.face_found ? `${conf}%` : ""}</label>
          <div className="bar"><div style={{ width: `${result?.face_found ? conf : 0}%` }} /></div>
        </div>
        {mode === "upload" && preview && (
          <button className="again" onClick={() => switchMode("upload")}>Scan another image</button>
        )}
      </section>

      <canvas ref={canvasRef} hidden />
    </main>
  );
}
