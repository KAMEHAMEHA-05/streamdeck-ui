"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Play, Pause, SkipBack, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Maximize2, Download, Copy,
  Music, Film, Users, Zap, HardDrive, Activity, Settings
} from "lucide-react";
import { useToast } from "@/lib/toast";

export interface PlayerFile {
  name: string;
  url: string;
  size: number;
  uploaded?: string;
}

export interface TorrentStream {
  infoHash: string;
  fileIdx: number;
  behaviorHints?: {
    filename?: string;
  };
}

interface Props {
  file?: PlayerFile;
  torrentStream?: TorrentStream;
  playlist?: PlayerFile[];
  onClose: () => void;
  onNavigate?: (f: PlayerFile) => void;
}

interface TorrentStats {
  downloaded: number;
  downloadSpeed: number;
  uploadSpeed: number;
  numPeers: number;
  progress: number;
}

function fmt(s: number) {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function fmtBytes(b: number) {
  if (!b) return "0 B";
  const k = 1024, sz = ["B","KB","MB","GB"], i = Math.floor(Math.log(b)/Math.log(k));
  return `${parseFloat((b/Math.pow(k,i)).toFixed(1))} ${sz[i]}`;
}

function fmtSpeed(bps: number) {
  return `${fmtBytes(bps)}/s`;
}

function ext(name: string) { return name.split(".").pop()?.toLowerCase() || ""; }
function isVid(name: string) { return /\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i.test(name); }

export default function MediaPlayer({ file, torrentStream, playlist = [], onClose, onNavigate }: Props) {
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const webTorrentRef = useRef<any>(null);
  const torrentRef = useRef<any>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showVolSlider, setShowVolSlider] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);

  // WebTorrent stats
  const [torrentStats, setTorrentStats] = useState<TorrentStats | null>(null);
  const [torrentReady, setTorrentReady] = useState(false);

  const currentFile = file || (torrentStream?.behaviorHints?.filename ? {
    name: torrentStream.behaviorHints.filename,
    url: '',
    size: 0
  } : { name: 'Stream', url: '', size: 0 });

  const vidMode = isVid(currentFile.name);
  const idx = file && playlist ? playlist.findIndex(f => f.name === file.name) : -1;
  const hasPrev = idx > 0;
  const hasNext = idx < playlist.length - 1;

  // ── Initialize WebTorrent ────────────────────────────────────────
  useEffect(() => {
    if (!torrentStream) return;

    // Dynamically import WebTorrent (client-side only)
    import('webtorrent').then((WebTorrent) => {
      const client = new WebTorrent.default();
      webTorrentRef.current = client;

      const magnetURI = `magnet:?xt=urn:btih:${torrentStream.infoHash}`;
      
      client.add(magnetURI, (torrent: any) => {
        torrentRef.current = torrent;

        const file = torrent.files[torrentStream.fileIdx || 0];
        
        file.renderTo(mediaRef.current!, { autoplay: true, controls: false }, (err: Error) => {
          if (err) {
            console.error('Error rendering:', err);
            return;
          }
          setTorrentReady(true);
        });

        // Update stats periodically
        const statsInterval = setInterval(() => {
          setTorrentStats({
            downloaded: torrent.downloaded,
            downloadSpeed: torrent.downloadSpeed,
            uploadSpeed: torrent.uploadSpeed,
            numPeers: torrent.numPeers,
            progress: torrent.progress,
          });
        }, 1000);

        return () => clearInterval(statsInterval);
      });
    });

    return () => {
      if (torrentRef.current) {
        torrentRef.current.destroy();
      }
      if (webTorrentRef.current) {
        webTorrentRef.current.destroy();
      }
    };
  }, [torrentStream]);

  // ── Tick loop ────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const m = mediaRef.current;
    if (!m) return;
    setCurrentTime(m.currentTime);
    if (m.buffered.length && m.duration) {
      setBuffered((m.buffered.end(m.buffered.length - 1) / m.duration) * 100);
    }
    animRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Attach media element listeners ──────────────────────────────
  useEffect(() => {
    const m = mediaRef.current;
    if (!m) return;
    const onPlay = () => { setPlaying(true); animRef.current = requestAnimationFrame(tick); };
    const onPause = () => { setPlaying(false); cancelAnimationFrame(animRef.current); };
    const onMeta = () => { setDuration(m.duration); setLoaded(true); };
    const onEnded = () => {
      setPlaying(false);
      cancelAnimationFrame(animRef.current);
      if (hasNext && onNavigate) onNavigate(playlist[idx + 1]);
    };
    m.addEventListener("play", onPlay);
    m.addEventListener("pause", onPause);
    m.addEventListener("loadedmetadata", onMeta);
    m.addEventListener("ended", onEnded);
    return () => {
      m.removeEventListener("play", onPlay);
      m.removeEventListener("pause", onPause);
      m.removeEventListener("loadedmetadata", onMeta);
      m.removeEventListener("ended", onEnded);
      cancelAnimationFrame(animRef.current);
    };
  }, [file, hasNext, idx, playlist, onNavigate, tick]);

  // ── Auto-play on file change (non-torrent) ─────────────────────────
  useEffect(() => {
    if (!file || torrentStream) return;
    setLoaded(false);
    setCurrentTime(0);
    setBuffered(0);
    const m = mediaRef.current;
    if (!m) return;
    m.load();
    m.play().catch(() => {});
  }, [file?.url, torrentStream]);

  // ── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT","TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const m = mediaRef.current;
      if (!m) return;
      if (e.code === "Space") { e.preventDefault(); playing ? m.pause() : m.play(); }
      if (e.code === "ArrowLeft") { e.preventDefault(); m.currentTime = Math.max(0, m.currentTime - 5); }
      if (e.code === "ArrowRight") { e.preventDefault(); m.currentTime = Math.min(m.duration, m.currentTime + 5); }
      if (e.code === "KeyM") { m.muted = !m.muted; setMuted(m.muted); }
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, onClose]);

  // ── Controls ─────────────────────────────────────────────────────
  const togglePlay = () => {
    const m = mediaRef.current;
    if (!m) return;
    playing ? m.pause() : m.play();
  };

  const toggleMute = () => {
    const m = mediaRef.current;
    if (!m) return;
    m.muted = !m.muted;
    setMuted(m.muted);
  };

  const setVol = (v: number) => {
    const m = mediaRef.current;
    if (!m) return;
    m.volume = v;
    setVolume(v);
    if (v > 0) { m.muted = false; setMuted(false); }
  };

  const setSpeed = (rate: number) => {
    const m = mediaRef.current;
    if (!m) return;
    m.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const restart = () => { if (mediaRef.current) { mediaRef.current.currentTime = 0; mediaRef.current.play(); } };

  // ── Progress bar scrub ───────────────────────────────────────────
  const calcSeek = (e: React.MouseEvent | MouseEvent) => {
    const bar = progressRef.current;
    if (!bar || !duration) return 0;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const onProgressMouseDown = (e: React.MouseEvent) => {
    setScrubbing(true);
    const t = calcSeek(e);
    setScrubTime(t);
    const onMove = (ev: MouseEvent) => setScrubTime(calcSeek(ev));
    const onUp = (ev: MouseEvent) => {
      const t2 = calcSeek(ev);
      if (mediaRef.current) mediaRef.current.currentTime = t2;
      setCurrentTime(t2);
      setScrubbing(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const displayTime = scrubbing ? scrubTime : currentTime;
  const progress = duration ? (displayTime / duration) * 100 : 0;

  const { toast } = useToast();
  const copyUrl = () => { 
    if (file?.url) {
      navigator.clipboard.writeText(file.url); 
      toast("URL copied", "success"); 
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(0,0,0,0.94)",
        backdropFilter: "blur(20px)",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 20px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,10,10,0.7)",
        backdropFilter: "blur(8px)",
        flexShrink: 0,
      }}>
        {/* Icon */}
        <div style={{
          width: 30, height: 30, flexShrink: 0,
          background: "var(--accent-dim)", border: "1px solid var(--accent-border)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          {vidMode ? <Film size={13} color="var(--accent)" /> : <Music size={13} color="var(--accent)" />}
        </div>

        {/* File info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "0.84rem", color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentFile.name}
          </div>
          <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 1, display: "flex", gap: 8 }}>
            <span>{ext(currentFile.name).toUpperCase()}</span>
            {currentFile.size > 0 && <span>· {fmtBytes(currentFile.size)}</span>}
            {playlist.length > 1 && <span>· {idx + 1} / {playlist.length}</span>}
            {loaded && <span>· {fmt(duration)}</span>}
            {torrentStream && <span>· TORRENT</span>}
          </div>
        </div>

        {/* Torrent stats */}
        {torrentStats && (
          <div style={{ display: "flex", gap: 12, fontSize: "0.65rem", color: "var(--text-muted)", marginRight: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={11} />
              {torrentStats.numPeers}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={11} />
              {fmtSpeed(torrentStats.downloadSpeed)}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Activity size={11} />
              {(torrentStats.progress * 100).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {file?.url && (
            <>
              <button onClick={copyUrl} className="btn-ghost" style={{ padding: "5px 10px", fontSize: "0.68rem" }}>
                <Copy size={11} /> Copy URL
              </button>
              <a href={file.url} download={file.name} className="btn-ghost" style={{ padding: "5px 10px", fontSize: "0.68rem", textDecoration: "none" }}>
                <Download size={11} /> Save
              </a>
            </>
          )}
          <button onClick={onClose} style={{
            background: "none", border: "1px solid var(--border)", color: "var(--text-secondary)",
            width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
          }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Media area ─────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: vidMode ? 0 : "40px 24px",
        overflow: "hidden",
        position: "relative",
      }}>
        {vidMode ? (
          <video
            ref={mediaRef}
            src={!torrentStream ? file?.url : undefined}
            style={{ maxWidth: "100%", maxHeight: "100%", display: "block", cursor: "pointer" }}
            onClick={togglePlay}
            playsInline
          />
        ) : (
          <>
            <audio ref={mediaRef as React.RefObject<HTMLAudioElement>} src={!torrentStream ? file?.url : undefined} />
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
              width: "100%", maxWidth: 480,
            }}>
              <div style={{
                width: 200, height: 200,
                border: "1px solid var(--border-strong)",
                background: "var(--bg-card)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1fr 1fr", opacity: 0.06 }}>
                  {[...Array(4)].map((_, i) => (
                    <div key={i} style={{ border: "1px solid var(--accent)", margin: 2 }} />
                  ))}
                </div>
                <Music size={52} color="var(--accent)" style={{ opacity: playing ? 1 : 0.35, transition: "opacity 0.3s" }} />
                {playing && (
                  <div style={{
                    position: "absolute", bottom: 12, left: 0, right: 0,
                    display: "flex", gap: 3, justifyContent: "center", alignItems: "flex-end", height: 20
                  }}>
                    {[8, 14, 6, 18, 10, 16, 7, 12].map((h, i) => (
                      <div key={i} style={{
                        width: 3, background: "var(--accent)",
                        height: `${h}px`,
                        animation: `bar-bounce 0.${5 + i}s ease-in-out infinite alternate`,
                        animationDelay: `${i * 0.08}s`,
                      }} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{currentFile.name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {ext(currentFile.name).toUpperCase()} · {fmtBytes(currentFile.size)}
                </div>
              </div>
            </div>
          </>
        )}

        {vidMode && !playing && loaded && (
          <div
            onClick={togglePlay}
            style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", background: "rgba(0,0,0,0.25)"
            }}
          >
            <div style={{
              width: 64, height: 64, background: "rgba(201,168,76,0.9)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Play size={26} color="#0a0a0a" />
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom controls ────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: "0 24px 20px",
        background: vidMode ? "linear-gradient(transparent, rgba(0,0,0,0.95))" : "rgba(10,10,10,0.7)",
        borderTop: vidMode ? "none" : "1px solid var(--border)",
        ...(vidMode ? { position: "absolute", bottom: 0, left: 0, right: 0 } : {}),
      }}>
        {/* Progress bar */}
        <div
          ref={progressRef}
          onMouseDown={onProgressMouseDown}
          style={{ padding: "12px 0", cursor: "pointer", userSelect: "none" }}
        >
          <div style={{ position: "relative", height: 3, background: "rgba(255,255,255,0.08)" }}>
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${buffered}%`, background: "rgba(255,255,255,0.14)", transition: "width 0.4s" }} />
            <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${progress}%`, background: "var(--accent)" }} />
            <div style={{
              position: "absolute", top: "50%", left: `${progress}%`,
              width: 12, height: 12, background: "var(--accent)",
              transform: "translate(-50%, -50%)",
              transition: scrubbing ? "none" : "left 0.05s",
              pointerEvents: "none",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span className="mono" style={{ fontSize: "0.68rem", color: scrubbing ? "var(--accent)" : "var(--text-muted)" }}>
              {fmt(displayTime)}
            </span>
            <span className="mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              -{fmt(Math.max(0, duration - displayTime))}
            </span>
          </div>
        </div>

        {/* Button row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasPrev && onNavigate && (
            <button onClick={() => onNavigate(playlist[idx - 1])} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)", display: "flex", padding: 6
            }}><ChevronLeft size={20} /></button>
          )}

          <button onClick={restart} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", padding: 6 }}>
            <SkipBack size={16} />
          </button>

          <button onClick={togglePlay} style={{
            width: 48, height: 48, background: "var(--accent)", border: "none",
            color: "#0a0a0a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
          }}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>

          {hasNext && onNavigate && (
            <button onClick={() => onNavigate(playlist[idx + 1])} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)", display: "flex", padding: 6
            }}><ChevronRight size={20} /></button>
          )}

          <div style={{ flex: 1 }} />

          {/* Playback speed */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowSettings(!showSettings)} style={{
              background: "none", border: "none", color: "var(--text-secondary)",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 6, fontSize: "0.7rem"
            }}>
              <Settings size={15} />
              {playbackRate !== 1 && <span>{playbackRate}x</span>}
            </button>
            {showSettings && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 10px)", right: 0,
                background: "var(--bg-raised)", border: "1px solid var(--border)",
                padding: "8px", minWidth: 120,
              }}>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                  <button key={rate} onClick={() => setSpeed(rate)} style={{
                    width: "100%", padding: "6px 10px", textAlign: "left",
                    background: rate === playbackRate ? "var(--accent-dim)" : "transparent",
                    border: "none", color: rate === playbackRate ? "var(--accent)" : "var(--text-secondary)",
                    cursor: "pointer", fontSize: "0.75rem", display: "block"
                  }}>
                    {rate}x {rate === 1 && "(Normal)"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Volume */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}
            onMouseEnter={() => setShowVolSlider(true)}
            onMouseLeave={() => setShowVolSlider(false)}
          >
            {showVolSlider && (
              <div style={{
                position: "absolute", bottom: "calc(100% + 10px)", right: 0,
                background: "var(--bg-raised)", border: "1px solid var(--border)",
                padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, width: 140,
              }}>
                <Volume2 size={12} color="var(--text-muted)" />
                <input
                  type="range" min={0} max={1} step={0.02} value={muted ? 0 : volume}
                  onChange={e => setVol(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", width: 28, textAlign: "right" }}>
                  {Math.round((muted ? 0 : volume) * 100)}%
                </span>
              </div>
            )}
            <button onClick={toggleMute} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", padding: 6 }}>
              {(muted || volume === 0) ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>
          </div>

          {vidMode && (
            <button onClick={() => mediaRef.current?.requestFullscreen()} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", padding: 6 }}>
              <Maximize2 size={17} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bar-bounce {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}