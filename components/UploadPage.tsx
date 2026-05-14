"use client";
import { useState } from "react";
import { Upload, Link, Loader, CheckCircle, XCircle, HardDrive, ChevronDown, ChevronUp, ExternalLink, Key, AlertTriangle, Database } from "lucide-react";
import { uploadFromDrive } from "@/lib/api";
import { useToast } from "@/lib/toast";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type SourceType = "GoogleDrive" | "S3";

interface UploadedFile {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface UploadError {
  name: string;
  error: string;
}

interface UploadResult {
  success: boolean;
  files: UploadedFile[];
  errors?: UploadError[];
  quota: {
    deletedFiles: number;
    freedSpaceMB: string;
    uploadedSizeMB: string;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (!bytes) return "Unknown size";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 22, height: 22, background: "var(--accent-dim)", border: "1px solid var(--accent-border)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1
      }}>
        <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent)" }}>{n}</span>
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>{text}</p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function GDriveGuide() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "var(--bg-card)", border: "none", cursor: "pointer",
          padding: "13px 18px", display: "flex", alignItems: "center", gap: 10, textAlign: "left"
        }}
      >
        <Key size={14} color="var(--accent)" />
        <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", flex: 1 }}>
          How to get a Google Drive API Key
        </span>
        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginRight: 8 }}>
          Required for large files &amp; folders
        </span>
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>

      {open && (
        <div style={{ padding: "20px 20px 24px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14, background: "rgba(0,0,0,0.2)" }}>
          <Step n={1} text={<>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>console.cloud.google.com <ExternalLink size={11} style={{ verticalAlign: "middle" }} /></a> and sign in.</>} />
          <Step n={2} text={<>Click <strong style={{ color: "var(--text-primary)" }}>Select a project → New Project</strong>. Give it any name and click <strong style={{ color: "var(--text-primary)" }}>Create</strong>.</>} />
          <Step n={3} text={<>In the sidebar go to <strong style={{ color: "var(--text-primary)" }}>APIs &amp; Services → Library</strong>. Search for <strong style={{ color: "var(--text-primary)" }}>"Google Drive API"</strong> and click <strong style={{ color: "var(--text-primary)" }}>Enable</strong>.</>} />
          <Step n={4} text={<>Go to <strong style={{ color: "var(--text-primary)" }}>APIs &amp; Services → Credentials → + Create Credentials → API key</strong>. Copy the key.</>} />
          <Step n={5} text={<><strong style={{ color: "var(--text-primary)" }}>Restrict the key:</strong> Edit the key → API restrictions → select <strong style={{ color: "var(--text-primary)" }}>Google Drive API</strong> → Save.</>} />
          <Step n={6} text={<>In <strong style={{ color: "var(--text-primary)" }}>KV Store</strong> save: Key: <span className="mono" style={{ color: "var(--accent)" }}>GoogleDrive</span> · Value: <span className="mono">AIzaSy…</span></>} />

          <div style={{ marginTop: 4, padding: "12px 14px", background: "rgba(201,168,76,0.08)", border: "1px solid var(--accent-border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={13} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--accent)" }}>Without an API key</strong> — small public files (&lt;~25 MB) may still import,
              but large files and folders always require one.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function S3Guide() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", background: "var(--bg-card)", border: "none", cursor: "pointer",
          padding: "13px 18px", display: "flex", alignItems: "center", gap: 10, textAlign: "left"
        }}
      >
        <Key size={14} color="var(--accent)" />
        <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)", flex: 1 }}>
          How to set up S3 credentials
        </span>
        <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginRight: 8 }}>
          Works with AWS S3 &amp; S3-compatible stores
        </span>
        {open ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>

      {open && (
        <div style={{ padding: "20px 20px 24px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14, background: "rgba(0,0,0,0.2)" }}>
          <Step n={1} text={<>Go to <a href="https://console.aws.amazon.com/iam" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>AWS IAM Console <ExternalLink size={11} style={{ verticalAlign: "middle" }} /></a> → <strong style={{ color: "var(--text-primary)" }}>Users → Create user</strong>.</>} />
          <Step n={2} text={<>Attach the <strong style={{ color: "var(--text-primary)" }}>AmazonS3ReadOnlyAccess</strong> policy (or a custom policy scoped to just your bucket).</>} />
          <Step n={3} text={<>Go to the user → <strong style={{ color: "var(--text-primary)" }}>Security credentials → Create access key</strong>. Copy the Access Key ID and Secret.</>} />
          <Step n={4} text={<>In <strong style={{ color: "var(--text-primary)" }}>KV Store</strong> save all required keys:</>} />

          {/* KV table */}
          <div style={{ marginLeft: 34, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { k: "S3_ACCESS_KEY_ID",     v: "AKIA…",           req: true  },
              { k: "S3_SECRET_ACCESS_KEY", v: "wJalrXUtn…",      req: true  },
              { k: "S3_REGION",            v: "us-east-1",        req: false },
              { k: "S3_BUCKET",            v: "my-bucket",        req: false },
              { k: "S3_ENDPOINT",          v: "https://…",        req: false },
              { k: "S3_SESSION_TOKEN",     v: "FQoGZXIvYXdz…",   req: false },
            ].map(row => (
              <div key={row.k} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--accent)", width: 200, flexShrink: 0 }}>{row.k}</span>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--text-secondary)", flex: 1 }}>{row.v}</span>
                <span style={{ fontSize: "0.62rem", color: row.req ? "var(--danger)" : "var(--text-muted)", flexShrink: 0 }}>
                  {row.req ? "required" : "optional"}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 4, padding: "12px 14px", background: "rgba(201,168,76,0.08)", border: "1px solid var(--accent-border)", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={13} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--accent)" }}>S3_ENDPOINT</strong> is only needed for S3-compatible stores like MinIO, Cloudflare R2, or Backblaze B2.
              Leave it empty for standard AWS S3. <strong style={{ color: "var(--accent)" }}>S3_BUCKET</strong> can also be included directly in the link.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Link format tables
// ─────────────────────────────────────────────

const GDRIVE_FORMATS = [
  { label: "File share link",   example: "https://drive.google.com/file/d/FILE_ID/view?usp=sharing", note: "Any public file" },
  { label: "Folder share link", example: "https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing", note: "Requires API key" },
  { label: "Direct file ID",    example: "1fsytk7EIZSzKEKGTy…", note: "Bare ID also works" },
];

const S3_FORMATS = [
  { label: "s3:// URI",          example: "s3://my-bucket/videos/clip.mp4", note: "Recommended" },
  { label: "Prefix / folder",    example: "s3://my-bucket/videos/", note: "Trailing / = all objects" },
  { label: "Virtual-hosted URL", example: "https://my-bucket.s3.us-east-1.amazonaws.com/clip.mp4", note: "" },
  { label: "bucket:key",         example: "my-bucket:videos/clip.mp4", note: "Shorthand" },
  { label: "Key only",           example: "videos/clip.mp4", note: "Uses S3_BUCKET from KV" },
];

function LinkFormats({ rows }: { rows: typeof GDRIVE_FORMATS }) {
  return (
    <div style={{ border: "1px solid var(--border)", padding: "14px 18px", background: "var(--bg-card)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 2 }}>
        Accepted Link Formats
      </div>
      {rows.map(row => (
        <div key={row.label} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <span style={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", width: 140, flexShrink: 0 }}>{row.label}</span>
          <span className="mono" style={{ flex: 1, fontSize: "0.72rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>{row.example}</span>
          {row.note && <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", flexShrink: 0 }}>{row.note}</span>}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function UploadPage() {
  const [source, setSource] = useState<SourceType>("GoogleDrive");
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await uploadFromDrive(source, link.trim());
      setResult(data);
      toast(`Imported ${data.files?.length || 0} file(s)`, "success");
    } catch (e: unknown) {
      toast((e as Error).message || "Import failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const isGDrive = source === "GoogleDrive";

  const placeholder = isGDrive
    ? "https://drive.google.com/file/d/…/view?usp=sharing"
    : "s3://my-bucket/videos/clip.mp4";

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Import Media</h2>
        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          Pull files from Google Drive or Amazon S3 directly into your R2 bucket
        </p>
      </div>

      {/* ── Source selector ── */}
      <div style={{ display: "flex", gap: 10 }}>
        {(["GoogleDrive", "S3"] as SourceType[]).map(s => (
          <button
            key={s}
            onClick={() => { setSource(s); setLink(""); setResult(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 18px", border: "1px solid",
              borderColor: source === s ? "var(--accent-border)" : "var(--border)",
              background: source === s ? "var(--accent-dim)" : "var(--bg-card)",
              cursor: "pointer", transition: "all 0.15s"
            }}
          >
            {s === "GoogleDrive"
              ? <HardDrive size={14} color={source === s ? "var(--accent)" : "var(--text-muted)"} />
              : <Database size={14} color={source === s ? "var(--accent)" : "var(--text-muted)"} />
            }
            <span style={{
              fontSize: "0.75rem", fontWeight: 600,
              color: source === s ? "var(--accent)" : "var(--text-secondary)"
            }}>
              {s === "GoogleDrive" ? "Google Drive" : "Amazon S3"}
            </span>
            {source === s && <span className="badge badge-accent">Active</span>}
          </button>
        ))}
      </div>

      {/* ── Guides (source-specific) ── */}
      {isGDrive ? <GDriveGuide /> : <S3Guide />}

      {/* ── Link format reference ── */}
      <LinkFormats rows={isGDrive ? GDRIVE_FORMATS : S3_FORMATS} />

      {/* ── Import form ── */}
      <div className="glass-card" style={{ padding: 24 }}>
        <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">{isGDrive ? "Google Drive Link" : "S3 URI / Key"}</label>
            <div style={{ position: "relative" }}>
              <Link size={14} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
              <input
                className="input-field"
                type="text"
                placeholder={placeholder}
                value={link}
                onChange={e => setLink(e.target.value)}
                style={{ paddingLeft: 42 }}
              />
            </div>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 6, letterSpacing: "0.04em" }}>
              {isGDrive
                ? <>File must be shared as <strong style={{ color: "var(--text-secondary)" }}>"Anyone with the link"</strong> — viewer access is enough</>
                : <>Use a trailing <span className="mono" style={{ color: "var(--text-secondary)" }}>/</span> to import all objects under a prefix, or a full key for a single file</>
              }
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {isGDrive
                ? <HardDrive size={13} color="var(--accent)" />
                : <Database size={13} color="var(--accent)" />
              }
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                {isGDrive ? "Google Drive" : "Amazon S3"}
              </span>
              <span className="badge badge-accent">Active</span>
            </div>
            <button type="submit" className="btn-primary" disabled={loading || !link.trim()}>
              {loading ? <Loader size={14} className="spin" /> : <Upload size={14} />}
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card" style={{ padding: "36px 28px", textAlign: "center" }}>
          <Loader size={24} className="spin" color="var(--accent)" style={{ margin: "0 auto 16px", display: "block" }} />
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 6 }}>
            Fetching from {isGDrive ? "Google Drive" : "Amazon S3"}…
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
            Large files may take a moment to transfer into R2
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="page-enter">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <div className="stat-card">
              <div className="label">Imported</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--success)" }}>
                {result.files?.length || 0}<span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginLeft: 4 }}>files</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="label">Size Uploaded</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {result.quota?.uploadedSizeMB || "0"}<span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginLeft: 4 }}>MB</span>
              </div>
            </div>
            {parseInt(result.quota?.deletedFiles as unknown as string) > 0 && (
              <div className="stat-card">
                <div className="label">Quota Freed</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--danger)" }}>
                  {result.quota.deletedFiles}<span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginLeft: 4 }}>purged</span>
                </div>
              </div>
            )}
          </div>

          {result.files?.length > 0 && (
            <div className="glass-card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={13} color="var(--success)" />
                <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--success)" }}>Imported Successfully</span>
              </div>
              <table>
                <thead><tr><th>Name</th><th>Size</th><th>Type</th></tr></thead>
                <tbody>
                  {result.files.map((f, i) => (
                    <tr key={i}>
                      <td><a href={f.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.82rem" }}>{f.name}</a></td>
                      <td><span className="mono">{formatBytes(f.size)}</span></td>
                      <td><span className="badge badge-muted">{f.mimeType?.split("/")[1]?.toUpperCase() || "—"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="glass-card" style={{ overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
                <XCircle size={13} color="var(--danger)" />
                <span style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--danger)" }}>Errors</span>
              </div>
              <table>
                <thead><tr><th>File</th><th>Error</th></tr></thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i}>
                      <td>{e.name}</td>
                      <td style={{ color: "var(--danger)", fontSize: "0.78rem" }}>{e.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}