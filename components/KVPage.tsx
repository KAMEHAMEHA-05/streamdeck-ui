"use client";
import { useState } from "react";
import { Settings, Search, Plus, Trash2, Eye, EyeOff, Save, RefreshCw, Key } from "lucide-react";
import { getKV, setKV, deleteKV } from "@/lib/api";
import { useToast } from "@/lib/toast";

interface KVEntry {
  key: string;
  value: string;
  hidden: boolean;
}

const PRESET_KEYS = [
  { key: "GoogleDrive", label: "Google Drive API Key", placeholder: "AIzaSy..." },
  { key: "R2_PUBLIC_URL", label: "R2 Public URL", placeholder: "https://pub-xxx.r2.dev" },
];

export default function KVPage() {
  const [entries, setEntries] = useState<KVEntry[]>([]);
  const [lookupKey, setLookupKey] = useState("");
  const [lookupResult, setLookupResult] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const [deleteKey, setDeleteKey] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { toast } = useToast();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupKey.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const val = await getKV(lookupKey.trim());
      setLookupResult(val || "(empty)");
      // Add to local entries list if not already there
      setEntries(prev => {
        if (prev.find(e => e.key === lookupKey.trim())) return prev;
        return [...prev, { key: lookupKey.trim(), value: val || "", hidden: true }];
      });
    } catch (e: unknown) {
      toast((e as Error).message || "Key not found", "error");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    setSaveLoading(true);
    try {
      await setKV(newKey.trim(), newValue.trim());
      toast(`Saved key "${newKey.trim()}"`, "success");
      setEntries(prev => {
        const existing = prev.findIndex(e => e.key === newKey.trim());
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], value: newValue.trim() };
          return updated;
        }
        return [...prev, { key: newKey.trim(), value: newValue.trim(), hidden: true }];
      });
      setNewKey("");
      setNewValue("");
    } catch (e: unknown) {
      toast((e as Error).message || "Save failed", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteKey.trim()) return;
    if (!confirm(`Delete key "${deleteKey.trim()}"?`)) return;
    setDeleteLoading(true);
    try {
      await deleteKV(deleteKey.trim());
      toast(`Deleted key "${deleteKey.trim()}"`, "success");
      setEntries(prev => prev.filter(e => e.key !== deleteKey.trim()));
      setDeleteKey("");
    } catch (e: unknown) {
      toast((e as Error).message || "Delete failed", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const toggleHide = (key: string) => {
    setEntries(prev => prev.map(e => e.key === key ? { ...e, hidden: !e.hidden } : e));
  };

  const quickLoad = async (key: string) => {
    try {
      const val = await getKV(key);
      setEntries(prev => {
        const exists = prev.findIndex(e => e.key === key);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = { ...updated[exists], value: val || "" };
          return updated;
        }
        return [...prev, { key, value: val || "", hidden: true }];
      });
      toast(`Loaded "${key}"`, "success");
    } catch {
      setEntries(prev => {
        if (prev.find(e => e.key === key)) return prev;
        return [...prev, { key, value: "(not set)", hidden: false }];
      });
    }
  };

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
          KV Store
        </h2>
        <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
          Manage configuration values stored in Cloudflare KV
        </p>
      </div>

      {/* Preset keys quick-access */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Key size={14} color="var(--accent)" />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
            Known Keys
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          {PRESET_KEYS.map((pk) => (
            <button
              key={pk.key}
              onClick={() => quickLoad(pk.key)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                padding: "12px 14px",
                textAlign: "left",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
                display: "flex",
                flexDirection: "column",
                gap: 4
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-strong)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-card-hover)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-card)"; }}
            >
              <span style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em" }}>{pk.key}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{pk.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Read */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Search size={14} color="var(--accent)" />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Read Key
            </span>
          </div>
          <form onSubmit={handleLookup} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="label">Key Name</label>
              <input
                className="input-field"
                placeholder="e.g. R2_PUBLIC_URL"
                value={lookupKey}
                onChange={e => setLookupKey(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-ghost" disabled={lookupLoading || !lookupKey.trim()}>
              {lookupLoading ? <RefreshCw size={13} className="spin" /> : <Search size={13} />}
              Lookup
            </button>
            {lookupResult !== null && (
              <div style={{
                padding: "10px 12px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                fontSize: "0.78rem",
                wordBreak: "break-all",
                color: "var(--text-primary)",
                marginTop: 4
              }}>
                <div className="label" style={{ marginBottom: 6 }}>Value</div>
                <span className="mono">{lookupResult}</span>
              </div>
            )}
          </form>
        </div>

        {/* Write */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Save size={14} color="var(--accent)" />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Write Key
            </span>
          </div>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="label">Key</label>
              <input
                className="input-field"
                placeholder="e.g. GoogleDrive"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Value</label>
              <textarea
                className="input-field"
                placeholder="Value to store..."
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                rows={3}
                style={{ resize: "vertical", fontFamily: "'Courier New', monospace", fontSize: "0.8rem" }}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={saveLoading || !newKey.trim() || !newValue.trim()}>
              {saveLoading ? <RefreshCw size={13} className="spin" /> : <Plus size={13} />}
              Save
            </button>
          </form>
        </div>

        {/* Delete */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Trash2 size={14} color="var(--danger)" />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Delete Key
            </span>
          </div>
          <form onSubmit={handleDelete} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label className="label">Key Name</label>
              <input
                className="input-field"
                placeholder="e.g. GoogleDrive"
                value={deleteKey}
                onChange={e => setDeleteKey(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-danger" disabled={deleteLoading || !deleteKey.trim()} style={{ width: "100%", justifyContent: "center", padding: "10px 14px" }}>
              {deleteLoading ? <RefreshCw size={13} className="spin" /> : <Trash2 size={13} />}
              Delete Key
            </button>
          </form>
        </div>
      </div>

      {/* Loaded entries */}
      {entries.length > 0 && (
        <div className="glass-card" style={{ overflow: "hidden" }} >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <Settings size={14} color="var(--accent)" />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Loaded Entries
            </span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Value</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.key}>
                  <td>
                    <span style={{ color: "var(--accent)", fontFamily: "'Courier New', monospace", fontSize: "0.82rem" }}>
                      {entry.key}
                    </span>
                  </td>
                  <td>
                    <span className="mono" style={{ wordBreak: "break-all" }}>
                      {entry.hidden && entry.value && entry.value !== "(not set)"
                        ? "•".repeat(Math.min(entry.value.length, 24))
                        : entry.value || "(empty)"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button
                        onClick={() => toggleHide(entry.key)}
                        style={{
                          background: "none",
                          border: "1px solid var(--border)",
                          color: "var(--text-muted)",
                          width: 30,
                          height: 30,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        {entry.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      <button
                        onClick={() => { setNewKey(entry.key); setNewValue(entry.value); }}
                        style={{
                          background: "none",
                          border: "1px solid var(--border)",
                          color: "var(--text-muted)",
                          width: 30,
                          height: 30,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        <Save size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
