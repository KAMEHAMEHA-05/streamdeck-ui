"use client";
import { useState } from "react";
import { Bug, RefreshCw, Server, HardDrive, Globe, FileText } from "lucide-react";
import { getDebug } from "@/lib/api";
import { useToast } from "@/lib/toast";

interface DebugFile {
  key: string;
  size: number;
}

interface DebugData {
  workerUrl: string;
  r2PublicUrl: string;
  filesInBucket: DebugFile[];
  requestedPath: string;
  requestedHost: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DebugPage() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const d = await getDebug();
      setData(d);
      toast("Debug info loaded", "success");
    } catch (e: unknown) {
      toast((e as Error).message || "Failed to load debug info", "error");
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 16,
      padding: "12px 0",
      borderBottom: "1px solid var(--border)"
    }}>
      <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", width: 140, flexShrink: 0, paddingTop: 2 }}>
        {label}
      </span>
      <span className="mono" style={{ color: "var(--text-primary)", wordBreak: "break-all", flex: 1 }}>
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
            Debug
          </h2>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            System information and bucket preview
          </p>
        </div>
        <button className="btn-primary" onClick={load} disabled={loading}>
          {loading ? <RefreshCw size={14} className="spin" /> : <Bug size={14} />}
          {loading ? "Loading..." : "Fetch Debug Info"}
        </button>
      </div>

      {!data && !loading && (
        <div className="glass-card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <Bug size={32} style={{ margin: "0 auto 16px", display: "block", opacity: 0.15 }} />
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", letterSpacing: "0.06em", marginBottom: 20 }}>
            Click the button above to fetch system debug information
          </p>
          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", opacity: 0.6 }}>
            Returns worker URL, R2 config, and first 10 bucket files
          </p>
        </div>
      )}

      {loading && (
        <div className="glass-card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <RefreshCw size={24} className="spin" color="var(--accent)" style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Fetching system info...</p>
        </div>
      )}

      {data && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="page-enter">
          {/* Quick stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div className="stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Server size={14} color="var(--accent)" />
                <span className="label" style={{ margin: 0 }}>Worker</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--success)" }}>
                <span className="badge badge-success">Online</span>
              </div>
            </div>
            <div className="stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <HardDrive size={14} color="var(--accent)" />
                <span className="label" style={{ margin: 0 }}>Bucket Preview</span>
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                {data.filesInBucket.length}
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginLeft: 4 }}>files shown</span>
              </div>
            </div>
            <div className="stat-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Globe size={14} color="var(--accent)" />
                <span className="label" style={{ margin: 0 }}>R2 URL</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: data.r2PublicUrl ? "var(--success)" : "var(--danger)" }}>
                {data.r2PublicUrl ? <span className="badge badge-success">Configured</span> : <span className="badge badge-danger">Not Set</span>}
              </div>
            </div>
          </div>

          {/* Worker info */}
          <div className="glass-card" style={{ padding: "0 24px" }}>
            <div style={{ padding: "14px 0", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <Server size={14} color="var(--accent)" />
              <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                Worker Configuration
              </span>
            </div>
            <InfoRow label="Worker URL" value={data.workerUrl} />
            <InfoRow label="R2 Public URL" value={data.r2PublicUrl || "Not configured"} />
            <InfoRow label="Requested Host" value={data.requestedHost} />
            <InfoRow label="Requested Path" value={data.requestedPath} />
          </div>

          {/* Bucket files preview */}
          <div className="glass-card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={14} color="var(--accent)" />
              <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
                Bucket Preview
              </span>
              <span className="badge badge-muted" style={{ marginLeft: "auto" }}>
                First 10 files
              </span>
            </div>

            {data.filesInBucket.length === 0 ? (
              <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                No files in bucket
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>File Key</th>
                    <th>Size</th>
                  </tr>
                </thead>
                <tbody>
                  {data.filesInBucket.map((file, i) => (
                    <tr key={file.key}>
                      <td>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 700 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ color: "var(--text-primary)" }}>{file.key}</span>
                      </td>
                      <td>
                        <span className="mono">{formatBytes(file.size)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Raw JSON */}
          <details style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <summary style={{
              padding: "12px 18px",
              cursor: "pointer",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              userSelect: "none",
              listStyle: "none",
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <Bug size={13} color="var(--text-muted)" />
              Raw JSON Response
            </summary>
            <div style={{ borderTop: "1px solid var(--border)", padding: 18 }}>
              <pre style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "0.75rem",
                color: "var(--text-secondary)",
                overflowX: "auto",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                wordBreak: "break-all"
              }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
