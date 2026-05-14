"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import LoginPage from "@/components/LoginPage";
import Sidebar from "@/components/Sidebar";
import FilesPage from "@/components/FilesPage";
import UploadPage from "@/components/UploadPage";
import KVPage from "@/components/KVPage";
import PartyPage from "@/components/PartyPage";
import DebugPage from "@/components/DebugPage";
import BrowsePage from "./BrowsePage";

type Page = "browse" | "files" | "upload" | "kv" | "party" | "debug";

export default function Dashboard() {
  const { token } = useAuth();
  const [page, setPage] = useState<Page>("browse");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  if (!token) {
    return <LoginPage onSuccess={() => setPage("files")} />;
  }

  return (
    <div style={{
      display: "flex",
      minHeight: "100vh",
      position: "relative",
      zIndex: 1
    }}>
      <Sidebar current={page} onChange={setPage} />

      <main style={{
        flex: 1,
        padding: "32px 28px",
        maxWidth: "100%",
        overflow: "hidden",
        minWidth: 0
      }}>
        {/* Mobile top padding for menu button */}
        <div className="mobile-topbar-pad" />

        {page === "browse" && <BrowsePage />}
        {page === "files" && <FilesPage />}
        {page === "upload" && <UploadPage />}
        {page === "kv" && <KVPage />}
        {page === "party" && <PartyPage />}
        {page === "debug" && <DebugPage />}
      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          main { padding: 20px 16px; }
          .mobile-topbar-pad { height: 52px; }
        }
      `}</style>
    </div>
  );
}
