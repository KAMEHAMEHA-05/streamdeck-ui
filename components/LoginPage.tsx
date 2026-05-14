"use client";
import { useState } from "react";
import { KeyRound, Loader } from "lucide-react";
import { login } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const { setToken } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    try {
      const { token } = await login(key.trim());
      setToken(token);
      toast("Access granted", "success");
      onSuccess();
    } catch {
      toast("Invalid access key", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 1,
      padding: "24px"
    }}>
      {/* Decorative corner accent */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 120,
        height: 120,
        borderRight: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }} />
      <div style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 120,
        height: 120,
        borderLeft: "1px solid var(--border)",
        borderTop: "1px solid var(--border)",
      }} />

      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo area */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            width: 56,
            height: 56,
            border: "1px solid var(--accent-border)",
            background: "var(--accent-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px"
          }}>
            <div style={{
              width: 20,
              height: 20,
              background: "var(--accent)",
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
            }} />
          </div>
          <h1 style={{
            fontFamily: "'Satisfy', cursive",
            fontSize: "2rem",
            color: "var(--text-primary)",
            lineHeight: 1,
            marginBottom: 6
          }}>StreamDeck</h1>
          <p style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Media Control Panel
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card" style={{ padding: "32px" }}>
          <div style={{
            fontSize: "0.65rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span>Authentication Required</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="label">Access Key</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input-field"
                  type="password"
                  placeholder="Enter your access key"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  autoFocus
                  style={{ paddingLeft: 42 }}
                />
                <KeyRound
                  size={14}
                  color="var(--text-muted)"
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !key.trim()}
              style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
            >
              {loading ? <Loader size={14} className="spin" /> : null}
              {loading ? "Authenticating..." : "Access Dashboard"}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: "center",
          marginTop: 24,
          fontSize: "0.68rem",
          color: "var(--text-muted)",
          letterSpacing: "0.06em"
        }}>
          Cloudflare Workers · R2 · Durable Objects
        </p>
      </div>
    </div>
  );
}
