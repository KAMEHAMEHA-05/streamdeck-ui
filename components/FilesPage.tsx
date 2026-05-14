"use client";
import { useState, useEffect, useCallback } from "react";
import { Film, Trash2, RefreshCw, Search, HardDrive, FileVideo, Copy, ExternalLink, Play, Pause, Music } from "lucide-react";
import { listFiles, deleteFile } from "@/lib/api";
import { useToast } from "@/lib/toast";
import MediaPlayer, { PlayerFile } from "@/components/MediaPlayer";

interface FileItem {
  name: string;
  url: string;
  size: number;
  uploaded: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024, sizes = ["B","KB","MB","GB"], i = Math.floor(Math.log(bytes)/Math.log(k));
  return `${parseFloat((bytes/Math.pow(k,i)).toFixed(1))} ${sizes[i]}`;
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) +
    " · " + d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"});
}
function getExt(name: string): string { return name.split(".").pop()?.toUpperCase() || "FILE"; }
function isVideo(name: string) { return /\.(mp4|webm|mov|avi|mkv|m4v|ogv)$/i.test(name); }
function isAudio(name: string) { return /\.(mp3|wav|ogg|aac|flac|m4a|opus)$/i.test(name); }
function isPlayable(name: string) { return isVideo(name) || isAudio(name); }

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [totalMB, setTotalMB] = useState("0");
  const [nowPlaying, setNowPlaying] = useState<PlayerFile | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFiles();
      setFiles(data.files || []);
      setTotalMB(data.totalSizeMB || "0");
    } catch (e: unknown) { toast((e as Error).message || "Failed to load files", "error"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (name: string) => {
    if (nowPlaying?.name === name) setNowPlaying(null);
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(name);
    try {
      await deleteFile(name);
      setFiles(prev => prev.filter(f => f.name !== name));
      toast(`Deleted "${name}"`, "success");
    } catch (e: unknown) { toast((e as Error).message || "Delete failed", "error"); }
    finally { setDeleting(null); }
  };

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast("URL copied","success"); };

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const playlist: PlayerFile[] = files.filter(f => isPlayable(f.name));

  return (
    <>
      {nowPlaying && (
        <MediaPlayer
          file={nowPlaying}
          playlist={playlist}
          onClose={() => setNowPlaying(null)}
          onNavigate={f => setNowPlaying(f)}
        />
      )}

      <div className="page-enter" style={{ display:"flex", flexDirection:"column", gap:24 }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
          <div>
            <h2 style={{ fontSize:"1.3rem", fontWeight:600, color:"var(--text-primary)", marginBottom:4 }}>Media Files</h2>
            <p style={{ fontSize:"0.78rem", color:"var(--text-secondary)" }}>Manage files stored in your R2 bucket</p>
          </div>
          <button className="btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px,1fr))", gap:12 }}>
          <div className="stat-card">
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <Film size={14} color="var(--accent)" />
              <span className="label" style={{ margin:0 }}>Total Files</span>
            </div>
            <div style={{ fontSize:"1.8rem", fontWeight:700, color:"var(--text-primary)", lineHeight:1 }}>{loading ? "—" : files.length}</div>
          </div>
          <div className="stat-card">
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <HardDrive size={14} color="var(--accent)" />
              <span className="label" style={{ margin:0 }}>Total Size</span>
            </div>
            <div style={{ fontSize:"1.8rem", fontWeight:700, color:"var(--text-primary)", lineHeight:1 }}>
              {loading ? "—" : parseFloat(totalMB).toFixed(1)}<span style={{ fontSize:"0.9rem", color:"var(--text-secondary)", marginLeft:4 }}>MB</span>
            </div>
            <div className="progress-track" style={{ marginTop:10 }}>
              <div className="progress-fill" style={{ width:`${Math.min((parseFloat(totalMB)/10240)*100,100)}%` }} />
            </div>
            <div style={{ fontSize:"0.62rem", color:"var(--text-muted)", marginTop:4 }}>of 10 GB quota</div>
          </div>
          <div className="stat-card">
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <Play size={14} color="var(--accent)" />
              <span className="label" style={{ margin:0 }}>Playable</span>
            </div>
            <div style={{ fontSize:"1.8rem", fontWeight:700, color:"var(--text-primary)", lineHeight:1 }}>
              {loading ? "—" : files.filter(f => isPlayable(f.name)).length}
            </div>
            <div style={{ fontSize:"0.62rem", color:"var(--text-muted)", marginTop:4 }}>audio + video</div>
          </div>
        </div>

        {/* Now playing bar */}
        {nowPlaying && (
          <div style={{
            padding:"10px 16px", background:"var(--accent-dim)", border:"1px solid var(--accent-border)",
            display:"flex", alignItems:"center", gap:12
          }}>
            <div className="pulse" style={{ width:7, height:7, background:"var(--accent)", flexShrink:0 }} />
            <span style={{ fontSize:"0.72rem", color:"var(--accent)", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase" }}>Now Playing</span>
            <span style={{ fontSize:"0.8rem", color:"var(--text-primary)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nowPlaying.name}</span>
            <button onClick={() => setNowPlaying(null)} className="btn-ghost" style={{ padding:"4px 10px", fontSize:"0.68rem" }}>
              Stop
            </button>
          </div>
        )}

        {/* Search */}
        <div style={{ position:"relative" }}>
          <Search size={14} color="var(--text-muted)" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)" }} />
          <input className="input-field" placeholder="Search files…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft:42 }} />
        </div>

        {/* Table */}
        <div className="glass-card" style={{ overflow:"hidden" }}>
          {loading ? (
            <div style={{ padding:"48px 24px", textAlign:"center", color:"var(--text-muted)" }}>
              <RefreshCw size={20} className="spin" color="var(--accent)" style={{ margin:"0 auto 12px", display:"block" }} />
              <span style={{ fontSize:"0.8rem", letterSpacing:"0.08em", textTransform:"uppercase" }}>Loading files…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding:"48px 24px", textAlign:"center", color:"var(--text-muted)" }}>
              <FileVideo size={28} style={{ margin:"0 auto 12px", display:"block", opacity:0.3 }} />
              <p style={{ fontSize:"0.8rem" }}>{search ? "No files match your search" : "No files in bucket"}</p>
            </div>
          ) : (
            <div className="overflow-table">
              <table>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th style={{ textAlign:"right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(file => {
                    const playable = isPlayable(file.name);
                    const isActive = nowPlaying?.name === file.name;
                    const vid = isVideo(file.name);
                    return (
                      <tr key={file.name} style={{ background: isActive ? "rgba(201,168,76,0.05)" : undefined }}>
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            {/* Play icon box */}
                            <div
                              onClick={() => playable && (isActive ? setNowPlaying(null) : setNowPlaying(file))}
                              style={{
                                width:32, height:32, flexShrink:0,
                                background: isActive ? "var(--accent)" : playable ? "var(--accent-dim)" : "rgba(255,255,255,0.04)",
                                border:`1px solid ${isActive ? "var(--accent)" : playable ? "var(--accent-border)" : "var(--border)"}`,
                                display:"flex", alignItems:"center", justifyContent:"center",
                                cursor: playable ? "pointer" : "default", transition:"all 0.15s"
                              }}
                            >
                              {isActive
                                ? <Pause size={13} color="#0a0a0a" />
                                : playable
                                  ? (vid ? <Play size={13} color="var(--accent)" /> : <Music size={12} color="var(--accent)" />)
                                  : <Film size={13} color="var(--text-muted)" />
                              }
                            </div>
                            <span
                              onClick={() => playable && (isActive ? setNowPlaying(null) : setNowPlaying(file))}
                              style={{
                                color: isActive ? "var(--accent)" : "var(--text-primary)",
                                fontWeight:500, fontSize:"0.82rem", wordBreak:"break-all",
                                cursor: playable ? "pointer" : "default"
                              }}
                            >
                              {file.name}
                            </span>
                            {isActive && <span className="badge badge-accent pulse" style={{ flexShrink:0 }}>● live</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${isVideo(file.name) ? "badge-accent" : isAudio(file.name) ? "badge-success" : "badge-muted"}`}>
                            {getExt(file.name)}
                          </span>
                        </td>
                        <td><span className="mono">{formatBytes(file.size)}</span></td>
                        <td><span style={{ fontSize:"0.78rem", color:"var(--text-muted)" }}>{formatDate(file.uploaded)}</span></td>
                        <td>
                          <div style={{ display:"flex", gap:6, justifyContent:"flex-end", alignItems:"center" }}>
                            {playable && (
                              <button
                                onClick={() => isActive ? setNowPlaying(null) : setNowPlaying(file)}
                                className={isActive ? "btn-primary" : "btn-ghost"}
                                style={{ padding:"5px 10px" }}
                              >
                                {isActive ? <Pause size={11} /> : <Play size={11} />}
                              </button>
                            )}
                            <button
                              onClick={() => copyUrl(file.url)}
                              title="Copy URL"
                              style={{ background:"none", border:"1px solid var(--border)", color:"var(--text-muted)", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
                            ><Copy size={12} /></button>
                            <a href={file.url} target="_blank" rel="noreferrer" title="Open"
                              style={{ background:"none", border:"1px solid var(--border)", color:"var(--text-muted)", width:30, height:30, display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none" }}
                            ><ExternalLink size={12} /></a>
                            <button className="btn-danger" onClick={() => handleDelete(file.name)} disabled={deleting === file.name} style={{ padding:"6px 10px" }}>
                              {deleting === file.name ? <RefreshCw size={11} className="spin" /> : <Trash2 size={11} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
