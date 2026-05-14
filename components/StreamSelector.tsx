"use client";
import { useState, useEffect } from "react";
import { Play, X, Download, Users, HardDrive, Zap, Film, Tv2 } from "lucide-react";

interface TorrentStream {
  name: string;
  title: string;
  infoHash: string;
  fileIdx: number;
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
  };
}

interface StreamResponse {
  streams: TorrentStream[];
  cacheMaxAge?: number;
}

interface Props {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  season?: number;
  episode?: number;
  onSelect: (stream: TorrentStream) => void;
  onClose: () => void;
}

export default function StreamSelector({
  tmdbId,
  mediaType,
  title,
  season,
  episode,
  onSelect,
  onClose,
}: Props) {
  const [streams, setStreams] = useState<TorrentStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const workerUrl = process.env.NEXT_PUBLIC_WORKER_URL || '';
    let endpoint = `${workerUrl}/torrentio/${mediaType}/${tmdbId}`;
    
    if (mediaType === "tv" && season && episode) {
      endpoint += `?season=${season}&episode=${episode}`;
    }

    fetch(endpoint)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: StreamResponse) => {
        setStreams(data.streams || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load streams");
        setLoading(false);
      });
  }, [tmdbId, mediaType, season, episode]);

  // Parse quality from stream name
  const getQuality = (name: string) => {
    if (name.includes("4k") || name.includes("2160p")) return "4K";
    if (name.includes("1080p")) return "1080p";
    if (name.includes("720p")) return "720p";
    if (name.includes("480p")) return "480p";
    return "SD";
  };

  // Parse size from title
  const getSize = (title: string) => {
    const match = title.match(/💾\s*([\d.]+\s*[GMK]B)/i);
    return match ? match[1] : null;
  };

  // Parse seeders from title
  const getSeeders = (title: string) => {
    const match = title.match(/👤\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9500,
          background: "rgba(0,0,0,0.8)",
          backdropFilter: "blur(12px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9501,
          width: "min(700px, 90vw)",
          maxHeight: "80vh",
          background: "var(--bg-raised)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {mediaType === "tv" ? (
              <Tv2 size={14} color="var(--accent)" />
            ) : (
              <Film size={14} color="var(--accent)" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h3
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Select Stream
            </h3>
            <p
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                margin: "2px 0 0",
              }}
            >
              {title}
              {season && episode && ` · S${season}E${episode}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)",
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted)",
              }}
            >
              Loading streams...
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "20px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
              }}
            >
              <p style={{ color: "var(--danger)", marginBottom: 8 }}>
                {error}
              </p>
              <p>
                Make sure <code>TORRENTIO_URL</code> is set in your KV Store.
              </p>
            </div>
          )}

          {!loading && !error && streams.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 20px",
                color: "var(--text-muted)",
              }}
            >
              No streams available for this title.
            </div>
          )}

          {!loading && !error && streams.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {streams.map((stream, i) => {
                const quality = getQuality(stream.name);
                const size = getSize(stream.title);
                const seeders = getSeeders(stream.title);
                const filename =
                  stream.behaviorHints?.filename ||
                  stream.title.split("\n")[0];

                return (
                  <button
                    key={i}
                    onClick={() => onSelect(stream)}
                    style={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      padding: "14px 16px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-border)";
                      e.currentTarget.style.background = "var(--accent-dim)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--bg-card)";
                    }}
                  >
                    {/* Top row */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {/* Quality badge */}
                      <span
                        style={{
                          padding: "3px 8px",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          background:
                            quality === "4K"
                              ? "var(--accent)"
                              : "rgba(255,255,255,0.1)",
                          color:
                            quality === "4K" ? "#0a0a0a" : "var(--text-primary)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {quality}
                      </span>

                      {/* Stats */}
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {seeders > 0 && (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Users size={11} />
                            {seeders}
                          </span>
                        )}
                        {size && (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <HardDrive size={11} />
                            {size}
                          </span>
                        )}
                      </div>

                      <div style={{ flex: 1 }} />

                      <Play size={14} color="var(--accent)" />
                    </div>

                    {/* Filename */}
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {filename}
                    </div>

                    {/* Source */}
                    <div
                      style={{
                        fontSize: "0.62rem",
                        color: "var(--text-muted)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {stream.name.replace("\n", " · ")}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}