"use client";
import { Film, Database, Settings, Bug, Radio, LogOut, Menu, X, Tv2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

type Page = "browse" | "files" | "upload" | "kv" | "party" | "debug";

interface SidebarProps {
  current: Page;
  onChange: (p: Page) => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "browse", label: "Browse", icon: <Tv2 size={15} />, desc: "TMDB catalog" },
  { id: "files", label: "Media Files", icon: <Film size={15} />, desc: "R2 bucket" },
  { id: "upload", label: "Import", icon: <Database size={15} />, desc: "Google Drive" },
  { id: "kv", label: "KV Store", icon: <Settings size={15} />, desc: "Config values" },
  { id: "party", label: "Party Rooms", icon: <Radio size={15} />, desc: "Live sync" },
  { id: "debug", label: "Debug", icon: <Bug size={15} />, desc: "System info" },
];

export default function Sidebar({ current, onChange }: SidebarProps) {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <img
              src="/logo.png"   // Place your image in the public/ folder
              alt="Logo"
              style={{
                width: 44,
                height: 44,
                objectFit: "contain",
              }}
            />
          </div>
          <div>
            <div style={{ fontFamily: "'Satisfy', cursive", fontSize: "1.7rem", color: "var(--text-primary)", lineHeight: 1 }}>
              StreamDeck
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 0" }}>
        <div className="section-title">Navigation</div>
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${current === item.id ? "active" : ""}`}
            onClick={() => { onChange(item.id); setMobileOpen(false); }}
          >
            {item.icon}
            <span style={{ flex: 1 }}>{item.label}</span>
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", letterSpacing: "0.04em" }}>{item.desc}</span>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px 0", borderTop: "1px solid var(--border)" }}>
        <button className="nav-item" onClick={logout}>
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
        <div style={{
          padding: "8px 16px",
          fontSize: "0.62rem",
          color: "var(--text-muted)",
          letterSpacing: "0.06em",
          lineHeight: 1.6
        }}>
          <div style={{ marginBottom: 2 }}>Cloudflare Workers</div>
          <div style={{ color: "var(--accent)", opacity: 0.7 }}>● Connected</div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: "none",
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 200,
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer"
        }}
        className="mobile-menu-btn"
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Desktop sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(10,10,10,0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        height: "100vh",
        zIndex: 10
      }}
        className="desktop-sidebar"
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 150,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)"
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside style={{
        position: "fixed",
        top: 0,
        left: mobileOpen ? 0 : -260,
        width: 240,
        height: "100vh",
        zIndex: 160,
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        background: "rgba(10,10,10,0.97)",
        backdropFilter: "blur(16px)",
        transition: "left 0.25s ease"
      }}
        className="mobile-sidebar"
      >
        <SidebarContent />
      </aside>

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
