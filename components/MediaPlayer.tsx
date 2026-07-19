"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  Copy,
  Music,
  Film,
  Users,
  Zap,
  Activity,
  Settings,
  Clock,
  Eye,
  XCircle,
} from "lucide-react";

// Optional: replace with your own toast implementation
function useToast() {
  return {
    toast: (message: string) => {
      console.log(message);
    },
  };
}

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface PlayerFile {
  name: string;
  url: string; // Can be absolute or relative (/torrent/...)
  size: number;
  uploaded?: string;
  torrentHash?: string;
}

interface Props {
  file: PlayerFile;
  playlist?: PlayerFile[];
  onClose: () => void;
  onNavigate?: (file: PlayerFile) => void;
}

interface TorrentStatus {
  name: string;
  state: string;
  progress: number;
  total_size: number;
  downloaded: number;
  download_speed: number;
  upload_speed: number;
  peers: number;
  seeds: number;
  eta: number;
}

interface DebugLog {
  timestamp: number;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

// --------------------------------------------------
// Config
// --------------------------------------------------

const API_BASE =
  process.env.NEXT_PUBLIC_TORR_URL?.replace(/\/$/, "") ||
  "http://localhost:8000";

// Formats that browsers can natively play
const BROWSER_VIDEO_FORMATS = [
  "mp4",
  "webm",
  "ogv",
  "mov",
  "mpeg",
  "mpg",
  "m4v",
];
const BROWSER_AUDIO_FORMATS = ["mp3", "wav", "m4a", "aac", "ogg", "flac"];

// Formats that need transcoding
const TRANSCODE_FORMATS = ["mkv", "avi", "flv", "wmv", "m2ts", "ts", "mts"];

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function fmtTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function fmtSpeed(bytesPerSec: number) {
  return `${fmtBytes(bytesPerSec)}/s`;
}

function fmtETA(seconds: number) {
  if (!isFinite(seconds) || seconds < 0 || seconds > 8640000) return "--";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  if (h > 24) return `${Math.floor(h / 24)}d`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;

  return `${Math.floor(seconds)}s`;
}

function ext(name: string) {
  return name.split(".").pop()?.toLowerCase() || "";
}

function isVideo(name: string) {
  return /\.(mp4|webm|mov|avi|mkv|m4v|ogv|flv|wmv|ts|mts|m2ts)$/i.test(name);
}

function resolveUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url}`;
}

function isBrowserSupported(fileName: string): boolean {
  const extension = ext(fileName).toLowerCase();

  // Check if it's a video that we support
  if (isVideo(fileName)) {
    return BROWSER_VIDEO_FORMATS.includes(extension);
  }

  // Check if it's audio
  return BROWSER_AUDIO_FORMATS.includes(extension);
}

function needsTranscoding(fileName: string): boolean {
  const extension = ext(fileName).toLowerCase();
  return TRANSCODE_FORMATS.includes(extension);
}

// --------------------------------------------------
// Component
// --------------------------------------------------

export default function MediaPlayer({
  file,
  playlist = [],
  onClose,
  onNavigate,
}: Props) {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const debugRef = useRef<DebugLog[]>([]);
  const retryCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);

  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);

  const [torrentStatus, setTorrentStatus] = useState<TorrentStatus | null>(
    null
  );

  const [torrentError, setTorrentError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [isTranscoding, setIsTranscoding] = useState(false);

  const vidMode = isVideo(file.name);
  const fileExt = ext(file.name).toLowerCase();
  const isSupportedFormat = isBrowserSupported(file.name);
  const shouldTranscode = needsTranscoding(file.name);

  const mediaUrl = resolveUrl(file.url);

  // Backend handles transcoding automatically - don't append /transcode
  const finalMediaUrl = mediaUrl;

  const idx = playlist.findIndex((f) => f.name === file.name);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < playlist.length - 1;

  const { toast } = useToast();

  // --------------------------------------------------
  // Debug logging
  // --------------------------------------------------

  const addLog = useCallback(
    (
      message: string,
      level: "info" | "warn" | "error" | "success" = "info"
    ) => {
      const log = {
        timestamp: Date.now(),
        level,
        message,
      };

      debugRef.current.push(log);
      if (debugRef.current.length > 200) debugRef.current.shift();
      setDebugLogs([...debugRef.current]);
      console.log(`[${level}]`, message);
    },
    []
  );

  // --------------------------------------------------
  // Poll torrent status
  // --------------------------------------------------

  useEffect(() => {
    if (!file.torrentHash) {
      setTorrentStatus(null);
      return;
    }

    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/torrent/${file.torrentHash}/status`
        );

        if (!res.ok) {
          throw new Error(`Status ${res.status}`);
        }

        const data = await res.json();

        if (!cancelled) {
          setTorrentStatus(data);
          setTorrentError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const msg =
            err instanceof Error ? err.message : "Failed to fetch status";
          setTorrentError(msg);
        }
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [file.torrentHash]);

  // --------------------------------------------------
  // Retry Playback
  // --------------------------------------------------

  useEffect(() => {
    if (!file.torrentHash) return;
    if (!torrentStatus) return;
    if (loaded) return;
    if (fatalError) return; // Don't retry if there's a fatal error

    // qBittorrent states that indicate metadata is available
    const readyStates = [
      "downloading",
      "stalledDL",
      "forcedDL",
      "uploading",
      "stalledUP",
      "queuedDL",
      "queuedUP",
      "checkingDL",
      "checkingUP",
    ];

    if (!readyStates.includes(torrentStatus.state)) return;

    const media = mediaRef.current;
    if (!media) return;

    // Increment retry count
    retryCountRef.current += 1;
    const currentRetry = retryCountRef.current;

    // Exponential backoff: 1s, 2s, 4s, 8s, etc. (max 10s)
    const delayMs = Math.min(1000 * Math.pow(2, currentRetry - 1), 10000);

    addLog(
      `Torrent ready (state: ${torrentStatus.state}), retry #${currentRetry} in ${delayMs}ms`,
      "info"
    );
    
    if (shouldTranscode) {
      setLoadingStatus(`Waiting for file and transcode... (attempt ${currentRetry})`);
      setIsTranscoding(true);
    } else {
      setLoadingStatus(`Waiting to load... (attempt ${currentRetry})`);
    }

    const timeoutId = setTimeout(() => {
      if (!media) return;

      addLog(
        `[Retry ${currentRetry}] Loading from: ${finalMediaUrl}`,
        "info"
      );
      
      if (shouldTranscode) {
        setLoadingStatus(`Transcoding in progress... (attempt ${currentRetry})`);
      } else {
        setLoadingStatus(`Loading... (attempt ${currentRetry})`);
      }

      media.load();
      media.play().catch((err) => {
        addLog(
          `Play failed on retry ${currentRetry}: ${err.message}`,
          "warn"
        );
      });
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [torrentStatus, loaded, file.torrentHash, fatalError, addLog, finalMediaUrl, shouldTranscode]);

  // --------------------------------------------------
  // Media listeners
  // --------------------------------------------------

  const tick = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    setCurrentTime(media.currentTime);

    if (media.buffered.length > 0 && media.duration > 0) {
      const end = media.buffered.end(media.buffered.length - 1);
      setBufferedPercent((end / media.duration) * 100);
    }

    animationRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const onPlay = () => {
      setPlaying(true);
      setLoadingStatus("");
      setIsTranscoding(false);
      retryCountRef.current = 0; // Reset retry count on successful play
      errorCountRef.current = 0;
      animationRef.current = requestAnimationFrame(tick);
      addLog("Playback started", "success");
    };

    const onPause = () => {
      setPlaying(false);
      cancelAnimationFrame(animationRef.current);
    };

    const onLoadedMetadata = () => {
      setDuration(media.duration || 0);
      setLoaded(true);
      setIsTranscoding(false);
      addLog(
        `Metadata loaded (duration: ${fmtTime(media.duration || 0)})`,
        "success"
      );
    };

    const onEnded = () => {
      setPlaying(false);
      if (hasNext && onNavigate) {
        onNavigate(playlist[idx + 1]);
      }
    };

    const onError = (e: Event) => {
      errorCountRef.current += 1;
      const mediaError = media.error;
      let errorMsg = "Unknown playback error";
      let isFatal = false;

      if (mediaError) {
        switch (mediaError.code) {
          case 1:
            errorMsg = "Aborted";
            break;
          case 2:
            errorMsg = "Network error — file not found or connection lost";
            break;
          case 3:
            errorMsg =
              "Decode error — codec not supported by browser";
            isFatal = true;
            break;
          case 4:
            errorMsg =
              "Unsupported format — browser cannot play this file type";
            isFatal = true;
            break;
        }
      }

      addLog(
        `Playback error #${errorCountRef.current}: ${errorMsg}${isFatal ? " [FATAL]" : ""}`,
        "error"
      );

      if (isFatal) {
        setIsTranscoding(false);
        const suggestion = shouldTranscode
          ? `\n\nBackend is transcoding ${fileExt.toUpperCase()} to MP4. This may take a few minutes on first play.`
          : `\n\nThis codec is not supported. Try converting to H.264/MP4.`;

        const fullError = errorMsg + suggestion;
        setFatalError(fullError);
        setLoadingStatus(fullError);
        addLog(
          `Stopping retries due to fatal error: ${fullError}`,
          "error"
        );
      } else {
        setLoadingStatus(`Error: ${errorMsg}`);
      }
    };

    media.addEventListener("play", onPlay);
    media.addEventListener("pause", onPause);
    media.addEventListener("loadedmetadata", onLoadedMetadata);
    media.addEventListener("ended", onEnded);
    media.addEventListener("error", onError);

    return () => {
      media.removeEventListener("play", onPlay);
      media.removeEventListener("pause", onPause);
      media.removeEventListener("loadedmetadata", onLoadedMetadata);
      media.removeEventListener("ended", onEnded);
      media.removeEventListener("error", onError);
      cancelAnimationFrame(animationRef.current);
    };
  }, [tick, addLog, hasNext, idx, onNavigate, playlist, shouldTranscode, fileExt]);

  // Reload when file changes
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    retryCountRef.current = 0;
    errorCountRef.current = 0;
    setLoaded(false);
    setCurrentTime(0);
    setBufferedPercent(0);
    setFatalError(null);
    setLoadingStatus("Preparing...");
    setIsTranscoding(false);

    addLog(`Loading file: ${file.name}`, "info");

    if (shouldTranscode) {
      addLog(`File format ${fileExt.toUpperCase()} requires transcoding to MP4`, "info");
      setIsTranscoding(true);
      setLoadingStatus(`Backend preparing to transcode ${fileExt.toUpperCase()} → MP4...`);
    }

    media.load();
    media.play().catch(() => {});
  }, [finalMediaUrl, file.name, addLog, shouldTranscode, fileExt]);

  // --------------------------------------------------
  // Keyboard shortcuts
  // --------------------------------------------------

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const media = mediaRef.current;
      if (!media) return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          if (playing) media.pause();
          else media.play();
          break;

        case "ArrowLeft":
          media.currentTime = Math.max(0, media.currentTime - 5);
          break;

        case "ArrowRight":
          media.currentTime = Math.min(
            media.duration,
            media.currentTime + 5
          );
          break;

        case "KeyM":
          media.muted = !media.muted;
          setMuted(media.muted);
          break;

        case "KeyD":
          setShowDebug((v) => !v);
          break;

        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, onClose]);

  // --------------------------------------------------
  // Controls
  // --------------------------------------------------

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (playing) media.pause();
    else media.play();
  };

  const restart = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = 0;
    media.play();
  };

  const toggleMute = () => {
    const media = mediaRef.current;
    if (!media) return;

    media.muted = !media.muted;
    setMuted(media.muted);
  };

  const updateVolume = (value: number) => {
    const media = mediaRef.current;
    if (!media) return;

    media.volume = value;
    setVolume(value);

    if (value > 0) {
      media.muted = false;
      setMuted(false);
    }
  };

  const updateSpeed = (rate: number) => {
    const media = mediaRef.current;
    if (!media) return;

    media.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const media = mediaRef.current;

    if (!bar || !media || !duration) return;

    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );

    media.currentTime = ratio * duration;
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(finalMediaUrl);
    toast("URL copied");
  };

  const progressPercent = duration
    ? (currentTime / duration) * 100
    : 0;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.95)",
        display: "flex",
        flexDirection: "column",
        color: "white",
      }}
    >
      {/* Debug Panel */}
      {showDebug && (
        <div
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 420,
            background: "#0a0a0a",
            borderLeft: "1px solid #333",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid #333",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <strong>Debug Console</strong>
            <button onClick={() => setShowDebug(false)}>
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              fontFamily: "monospace",
              fontSize: 12,
              padding: 12,
            }}
          >
            {debugLogs.map((log, i) => (
              <div
                key={i}
                style={{
                  color:
                    log.level === "error"
                      ? "#ef4444"
                      : log.level === "warn"
                        ? "#eab308"
                        : log.level === "success"
                          ? "#22c55e"
                          : "#94a3b8",
                  marginBottom: 4,
                }}
              >
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {vidMode ? <Film size={18} /> : <Music size={18} />}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.name}
          </div>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {ext(file.name).toUpperCase()} · {fmtBytes(file.size)}
            {shouldTranscode && (
              <span style={{ color: "#f59e0b", marginLeft: 8 }}>
                ⚙ Will be transcoded to MP4
              </span>
            )}
          </div>
        </div>

        {torrentStatus && !fatalError && (
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 12,
              opacity: 0.85,
            }}
          >
            <span>
              <Users size={12} /> {torrentStatus.peers}
            </span>
            <span>Seeds {torrentStatus.seeds}</span>
            <span>
              <Zap size={12} /> {fmtSpeed(torrentStatus.download_speed)}
            </span>
            <span>↑ {fmtSpeed(torrentStatus.upload_speed)}</span>
            <span>{(torrentStatus.progress * 100).toFixed(1)}%</span>
            <span>
              <Clock size={12} /> {fmtETA(torrentStatus.eta)}
            </span>
          </div>
        )}

        <button onClick={copyUrl}>
          <Copy size={16} />
        </button>

        <a href={finalMediaUrl} download={file.name}>
          <Download size={16} />
        </a>

        {file.torrentHash && (
          <button onClick={() => setShowDebug((v) => !v)}>
            <Eye size={16} />
          </button>
        )}

        <button onClick={onClose}>
          <XCircle size={18} />
        </button>
      </div>

      {/* Media Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {vidMode ? (
          <video
            ref={mediaRef}
            src={finalMediaUrl}
            style={{ maxWidth: "100%", maxHeight: "100%" }}
            onClick={togglePlay}
            playsInline
          />
        ) : (
          <>
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={finalMediaUrl}
            />
            <div style={{ textAlign: "center" }}>
              <Music size={96} />
              <div style={{ marginTop: 16 }}>{file.name}</div>
            </div>
          </>
        )}

        {loadingStatus && !loaded && (
          <div
            style={{
              position: "absolute",
              bottom: 40,
              padding: 16,
              background: fatalError
                ? "rgba(220, 38, 38, 0.2)"
                : isTranscoding
                  ? "rgba(249, 115, 22, 0.2)"
                  : "rgba(59, 130, 246, 0.2)",
              border: `1px solid ${
                fatalError
                  ? "rgba(220, 38, 38, 0.5)"
                  : isTranscoding
                    ? "rgba(249, 115, 22, 0.5)"
                    : "rgba(59, 130, 246, 0.5)"
              }`,
              borderRadius: 4,
              maxWidth: "80%",
              whiteSpace: "pre-wrap",
              textAlign: "center",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {isTranscoding && (
              <div style={{ marginBottom: 8, fontSize: 12 }}>
                ⚙ Transcoding in progress...
              </div>
            )}
            {loadingStatus}
          </div>
        )}

        {torrentError && !fatalError && (
          <div
            style={{
              position: "absolute",
              top: 20,
              left: 20,
              padding: 10,
              background: "rgba(220,38,38,0.2)",
              border: "1px solid rgba(220,38,38,0.5)",
            }}
          >
            {torrentError}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div
        style={{
          padding: 20,
          background: "rgba(0,0,0,0.8)",
        }}
      >
        {/* Progress */}
        <div
          ref={progressRef}
          onClick={seek}
          style={{
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              height: 4,
              background: "rgba(255,255,255,0.1)",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                height: "100%",
                width: `${bufferedPercent}%`,
                background: "rgba(255,255,255,0.2)",
              }}
            />
            <div
              style={{
                position: "absolute",
                height: "100%",
                width: `${progressPercent}%`,
                background: "#d4af37",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              marginTop: 4,
              opacity: 0.75,
            }}
          >
            <span>{fmtTime(currentTime)}</span>
            <span>Buffered: {bufferedPercent.toFixed(1)}%</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {hasPrev && onNavigate && !fatalError && (
            <button onClick={() => onNavigate(playlist[idx - 1])}>
              <ChevronLeft size={20} />
            </button>
          )}

          <button onClick={restart} disabled={fatalError ? true : false}>
            <SkipBack size={18} />
          </button>

          <button
            onClick={togglePlay}
            disabled={fatalError ? true : false}
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: fatalError ? "#666" : "#d4af37",
              color: "black",
              cursor: fatalError ? "not-allowed" : "pointer",
            }}
          >
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {hasNext && onNavigate && !fatalError && (
            <button onClick={() => onNavigate(playlist[idx + 1])}>
              <ChevronRight size={20} />
            </button>
          )}

          <button onClick={toggleMute} disabled={fatalError ? true : false}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => updateVolume(parseFloat(e.target.value))}
            disabled={fatalError ? true : false}
          />

          <select
            value={playbackRate}
            onChange={(e) => updateSpeed(parseFloat(e.target.value))}
            disabled={fatalError ? true : false}
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>

          <div style={{ flex: 1 }} />

          {vidMode && !fatalError && (
            <button onClick={() => mediaRef.current?.requestFullscreen()}>
              <Maximize2 size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}