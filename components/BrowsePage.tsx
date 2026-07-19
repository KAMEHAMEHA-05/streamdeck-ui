"use client";
import {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  Play, Plus, Star, ChevronLeft, ChevronRight, X,
  ChevronDown, Search, Tv2, Film, RefreshCw, Info,
  Volume2, VolumeX, Clock, Calendar, Users, Award,
} from "lucide-react";
import {
  fetchHome, fetchMovie, fetchShow, fetchSeason, searchTMDB,
  img, mediaTitle, mediaYear, isShow, ratingColor, fmtRuntime, bestTrailer,
  type HomeData, type TMDBMovie, type TMDBShow,
  type TMDBMovieDetail, type TMDBShowDetail,
  type TMDBEpisode, type TMDBSeason, type TMDBCastMember,
} from "@/lib/tmdb";
import { useToast } from "@/lib/toast";
//import StreamSelector from "@/components/StreamSelector";
// import MediaPlayer, { type TorrentStream } from "@/components/StreamSelector";
import StreamSelector, { type TorrentStream } from "@/components/StreamSelector";
import MediaPlayer from "@/components/MediaPlayer";

// ─── Aliases ──────────────────────────────────────────────────────────────────
type AnyMedia    = TMDBMovie | TMDBShow;
type AnyDetail   = TMDBMovieDetail | TMDBShowDetail;
type DetailType  = "movie" | "tv";

const BACK   = (p: string | null | undefined) => img(p, "original");
const POSTER = (p: string | null | undefined) => img(p, "w342");
const STILL  = (p: string | null | undefined) => img(p, "w300");
const FACE   = (p: string | null | undefined) => img(p, "w92");

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
function Sk({ w, h, style }: { w?: string | number; h?: string | number; style?: React.CSSProperties }) {
  return (
    <div style={{
      width: w ?? "100%", height: h ?? "100%", flexShrink: 0,
      background: "linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.09) 50%,rgba(255,255,255,.04) 100%)",
      backgroundSize: "200% 100%",
      animation: "sk-shimmer 1.5s ease-in-out infinite",
      ...style,
    }} />
  );
}

// ─── Star rating badge ────────────────────────────────────────────────────────
function RatingBadge({ v }: { v: number }) {
  const c = ratingColor(v);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em",
      color: c, border: `1px solid ${c}`, padding: "2px 6px",
      background: `${c}1a`, flexShrink: 0,
    }}>
      <Star size={9} fill="currentColor" />{v.toFixed(1)}
    </span>
  );
}

// ─── Pill badge ───────────────────────────────────────────────────────────────
function Pill({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={accent ? "badge badge-accent" : "badge badge-muted"}>
      {children}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// POSTER CARD
// ──────────────────────────────────────────────────────────────────────────────
function PosterCard({
  item, onClick, size = "md",
}: {
  item: AnyMedia;
  onClick: () => void;
  size?: "sm" | "md";
}) {
  const [hov, setHov] = useState(false);
  const W = size === "sm" ? 130 : 170;
  const H = size === "sm" ? 195 : 255;
  const poster = POSTER(item.poster_path);
  const title  = mediaTitle(item);
  const year   = mediaYear(item);
  const tv     = isShow(item);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{
        width: W, flexShrink: 0, cursor: "pointer",
        transform: hov ? "translateY(-5px) scale(1.03)" : "none",
        transition: "transform 0.2s ease",
        zIndex: hov ? 3 : 1, position: "relative",
      }}
    >
      {/* ── Poster image ── */}
      <div style={{
        width: W, height: H, position: "relative", overflow: "hidden",
        border: `1px solid ${hov ? "var(--accent-border)" : "var(--border)"}`,
        background: "var(--bg-raised)",
        transition: "border-color 0.2s",
      }}>
        {poster
          ? <img src={poster} alt={title} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {tv ? <Tv2 size={22} style={{ opacity: 0.12 }} /> : <Film size={22} style={{ opacity: 0.12 }} />}
            </div>
        }

        {/* TV/Film tag */}
        <div style={{
          position: "absolute", top: 5, left: 5,
          padding: "1px 5px", fontSize: "0.52rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          background: "rgba(0,0,0,0.8)", border: "1px solid var(--border)",
          color: tv ? "var(--accent)" : "var(--text-muted)",
        }}>
          {tv ? "TV" : "FILM"}
        </div>

        {/* Hover overlay */}
        {hov && (
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.15) 55%,transparent 100%)",
            display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 8, gap: 6,
          }}>
            <div style={{ display: "flex", gap: 5 }}>
              <ActionBtn icon={<Play size={11} color="#0a0a0a" />} gold onClick={onClick} />
              <ActionBtn icon={<Info size={11} />} onClick={onClick} />
            </div>
          </div>
        )}
      </div>

      {/* ── Meta below ── */}
      <div style={{ paddingTop: 7 }}>
        <p style={{
          fontSize: "0.73rem", fontWeight: 600, lineHeight: 1.3,
          color: hov ? "var(--accent)" : "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          transition: "color 0.15s", marginBottom: 4,
        }}>
          {title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {year && <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>{year}</span>}
          {item.vote_average > 0 && <RatingBadge v={item.vote_average} />}
        </div>
      </div>
    </div>
  );
}

// ─── Small icon action button ─────────────────────────────────────────────────
function ActionBtn({
  icon, gold, onClick,
}: {
  icon: React.ReactNode; gold?: boolean; onClick?: () => void;
}) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick?.(); }} style={{
      width: 28, height: 28, flexShrink: 0,
      background: gold ? "var(--accent)" : "rgba(255,255,255,0.15)",
      border: gold ? "none" : "1px solid rgba(255,255,255,0.3)",
      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {icon}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// HORIZONTAL ROW
// ──────────────────────────────────────────────────────────────────────────────
function MediaRow({
  title, badge, items, onSelect,
}: {
  title: string; badge?: string; items: AnyMedia[]; onSelect: (i: AnyMedia) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: 1 | -1) =>
    ref.current?.scrollBy({ left: d * 500, behavior: "smooth" });

  if (!items.length) return null;

  return (
    <section>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h3 style={{
          fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em",
          textTransform: "uppercase", color: "var(--text-secondary)", margin: 0,
        }}>
          {title}
        </h3>
        {badge && <Pill accent>{badge}</Pill>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {([-1, 1] as const).map(d => (
            <button key={d} onClick={() => scroll(d)} style={{
              width: 26, height: 26, background: "var(--bg-card)", border: "1px solid var(--border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-secondary)",
            }}>
              {d === -1 ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            </button>
          ))}
        </div>
      </div>

      {/* Scroll strip */}
      <div ref={ref} style={{
        display: "flex", gap: 20, overflowX: "auto",
        paddingBottom: 10, scrollbarWidth: "none",
      }}>
        {items.map(item => (
          <PosterCard
            key={`${item.id}-${isShow(item) ? "tv" : "mv"}`}
            item={item}
            onClick={() => onSelect(item)}
          />
        ))}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// HERO BANNER
// ──────────────────────────────────────────────────────────────────────────────
function HeroBanner({
  items, onSelect,
}: {
  items: AnyMedia[]; onSelect: (i: AnyMedia) => void;
}) {
  const pool  = useMemo(() => items.slice(0, 8), [items]);
  const [idx, setIdx]       = useState(0);
  const [prev, setPrev]     = useState<number | null>(null);
  const [fading, setFading] = useState(false);
  const [logos, setLogos]   = useState<Record<number, string | null>>({});
  //const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((next: number) => {
    if (fading) return;
    setFading(true);
    setPrev(idx);
    setTimeout(() => {
      setIdx(next);
      setPrev(null);
      setFading(false);
    }, 450);
  }, [fading, idx]);

  useEffect(() => {
    timerRef.current = setTimeout(() => goTo((idx + 1) % pool.length), 7000);
    return () => {
      timerRef.current && clearTimeout(timerRef.current);
    };
  }, [idx, pool.length, goTo]);

  // Fetch logos for items from backend
  useEffect(() => {
    pool.forEach(item => {
      if (logos[item.id] !== undefined) return; // Already fetched or attempted
      
      const isTV = isShow(item);
      // Use explicit worker URL - update this with your actual worker domain
      const workerBaseUrl = process.env.NEXT_PUBLIC_WORKER_URL || '';
      const endpoint = isTV 
        ? `${workerBaseUrl}/tmdb/show/${item.id}`
        : `${workerBaseUrl}/tmdb/movie/${item.id}`;
      
      console.log(`[Logo Fetch] Requesting:`, endpoint);
      
      fetch(endpoint)
        .then(res => {
          console.log(`[Logo Fetch] Response status:`, res.status, res.statusText);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          // Handle nested response structure
          const mediaData = data.data || data;
          const logos_arr = mediaData?.images?.logos || [];
          
          // Debug logging
          console.log(`[Logo Debug] ${isTV ? 'Show' : 'Movie'} ${item.id}:`, {
            hasImages: !!mediaData?.images,
            logosCount: logos_arr.length,
            firstLogo: logos_arr[0],
          });
          
          // Try to find English logo, fallback to any logo
          let logoPath = null;
          if (logos_arr.length > 0) {
            const enLogo = logos_arr.find((l: any) => l.iso_639_1 === 'en');
            logoPath = enLogo?.file_path || logos_arr[0]?.file_path || null;
          }
          
          console.log(`[Logo Debug] Selected logo path:`, logoPath);
          setLogos(prev => ({ ...prev, [item.id]: logoPath }));
        })
        .catch(err => {
          console.warn(`Failed to fetch logo for ${isTV ? 'show' : 'movie'} ${item.id}:`, err);
          setLogos(prev => ({ ...prev, [item.id]: null }));
        });
    });
  }, [pool, logos]);

  const item  = pool[idx];
  const back  = BACK(item?.backdrop_path);
  const logoPath = logos[item.id];
  // Construct full TMDB image URL for logos (they need full width, not size variants)
  const logo = logoPath ? `https://image.tmdb.org/t/p/original${logoPath}` : null;
  const title = item ? mediaTitle(item) : "";
  const tv    = item ? isShow(item) : false;

  if (!item) return null;

  return (
    <div style={{
      position: "relative", width: "100%",
      height: "clamp(320px, 50vw, 580px)",
      overflow: "hidden", marginBottom: 36, flexShrink: 0,
    }}>
      {/* ── Background layers ── */}
      {back && (
        <img key={idx} src={back} alt={title} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          objectFit: "cover", objectPosition: "center top",
          opacity: fading ? 0 : 1,
          transition: "opacity 0.45s ease",
        }} />
      )}
      {/* Dark overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,.82) 0%, rgba(0,0,0,.28) 55%, transparent 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0a0a0a 0%, transparent 42%)" }} />

      {/* ── Content ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 clamp(24px,4vw,56px) clamp(28px,4vw,44px)",
        opacity: fading ? 0 : 1, transition: "opacity 0.45s ease",
      }}>
        {/* Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <Pill accent>{tv ? "Series" : "Film"}</Pill>
          {item.vote_average > 0 && <RatingBadge v={item.vote_average} />}
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.5)" }}>{mediaYear(item)}</span>
        </div>

        {/* Logo or Title */}
        {logo ? (
          <img
            src={logo}
            alt={title}
            style={{
              maxHeight: "clamp(80px, 15vw, 180px)",
              maxWidth: "min(600px, 85vw)",
              height: "auto",
              width: "auto",
              marginBottom: 20,
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,.7))",
              objectFit: "contain",
            }}
            onError={(e) => {
              // If logo fails to load, hide it
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <h2 style={{
            fontSize: "clamp(1.7rem, 4.5vw, 3.2rem)",
            color: "#fff", lineHeight: 1.1, marginBottom: 20,
            maxWidth: 580, textShadow: "0 2px 20px rgba(0,0,0,.7)",
            fontWeight: 800, letterSpacing: "-0.015em",
          }}>
            {title}
          </h2>
        )}

        {/* Synopsis — 3 lines max */}
        {item.overview && (
          <p style={{
            fontSize: "clamp(0.75rem, 1.4vw, 0.85rem)",
            color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
            maxWidth: 460, marginBottom: 22,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}>
            {item.overview}
          </p>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => onSelect(item)}
            className="btn-primary"
            style={{ padding: "10px 26px", fontSize: "0.82rem" }}
          >
            <Play size={15} /> Play
          </button>
          <button
            onClick={() => onSelect(item)}
            className="btn-ghost"
            style={{ padding: "10px 20px", fontSize: "0.82rem" }}
          >
            <Info size={14} /> More Info
          </button>
        </div>
      </div>

      {/* ── Dot indicators ── */}
      <div style={{
        position: "absolute", bottom: 20, right: "clamp(20px,4vw,52px)",
        display: "flex", gap: 6, alignItems: "center",
      }}>
        {pool.map((_, i) => (
          <button key={i} onClick={() => goTo(i)} style={{
            width: i === idx ? 22 : 6, height: 3, padding: 0, border: "none",
            background: i === idx ? "var(--accent)" : "rgba(255,255,255,0.22)",
            cursor: "pointer", transition: "all 0.3s ease",
          }} />
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// EPISODE LIST (inside detail panel)
// ──────────────────────────────────────────────────────────────────────────────
function EpisodeList({
  showId, season,
}: {
  showId: number; season: TMDBSeason;
}) {
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setEpisodes([]);
    fetchSeason(showId, season.season_number)
      .then(d => setEpisodes(d.episodes ?? []))
      .catch(e => setError(e.message || "Could not load episodes"))
      .finally(() => setLoading(false));
  }, [showId, season.season_number]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)", alignItems: "flex-start" }}>
          <Sk w={116} h={66} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Sk h={13} style={{ width: "45%" }} />
            <Sk h={11} style={{ width: "85%" }} />
            <Sk h={11} style={{ width: "60%" }} />
          </div>
        </div>
      ))}
    </div>
  );

  if (error) return (
    <div style={{
      padding: "18px 14px", border: "1px solid var(--border)",
      background: "var(--bg-card)", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6,
    }}>
      <p style={{ color: "var(--danger)", marginBottom: 6 }}>{error}</p>
      <p>
        Add this route to your worker inside the <span className="mono">/tmdb/</span> block:
      </p>
      <pre style={{
        marginTop: 8, padding: "8px 12px",
        background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)",
        fontSize: "0.68rem", color: "var(--text-secondary)",
        overflowX: "auto", lineHeight: 1.7,
      }}>
{`if (/^\\/tmdb\\/show\\/\\d+\\/season\\/\\d+$/.test(url.pathname)) {
  const [,,, showId,, seasonNum] = url.pathname.split("/");
  const data = await fetchTMDB(\`/tv/\${showId}/season/\${seasonNum}\`, apiKey);
  return jsonOk({ success: true, data });
}`}
      </pre>
    </div>
  );

  if (!episodes.length) return (
    <p style={{ padding: "20px 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
      No episodes found for this season.
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {episodes.map(ep => (
        <EpisodeRow key={ep.id} ep={ep} />
      ))}
    </div>
  );
}

function EpisodeRow({ ep }: { ep: TMDBEpisode }) {
  const [hov, setHov] = useState(false);
  const still = STILL(ep.still_path);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", gap: 14, padding: "11px 0",
        borderBottom: "1px solid var(--border)",
        background: hov ? "rgba(255,255,255,0.03)" : "transparent",
        cursor: "pointer", transition: "background 0.15s",
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: 116, height: 66, flexShrink: 0,
        background: "var(--bg-raised)", border: "1px solid var(--border)",
        position: "relative", overflow: "hidden",
      }}>
        {still
          ? <img src={still} alt={ep.name} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Tv2 size={18} style={{ opacity: 0.12 }} />
            </div>
        }
        {/* Play overlay on hover */}
        {hov && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 30, height: 30, background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Play size={13} color="#0a0a0a" />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 700, flexShrink: 0 }}>
            E{ep.episode_number}
          </span>
          <span style={{
            fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
          }}>
            {ep.name}
          </span>
          {ep.runtime != null && (
            <span style={{ fontSize: "0.62rem", color: "var(--text-muted)", flexShrink: 0 }}>
              {ep.runtime}m
            </span>
          )}
        </div>
        <p style={{
          fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden", marginBottom: 4,
        }}>
          {ep.overview || "No description available."}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {ep.air_date && (
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>{ep.air_date}</span>
          )}
          {ep.vote_average > 0 && <RatingBadge v={ep.vote_average} />}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DETAIL PANEL (slides in from right)
// ──────────────────────────────────────────────────────────────────────────────
function DetailPanel({
  id, type, onClose, onPlay,
}: {
  id: number; type: DetailType; onClose: () => void; onPlay: (id: number, type: DetailType, title: string, season?: number, episode?: number) => void;
}) {
  const [detail,       setDetail]       = useState<AnyDetail | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [activeSeason, setActiveSeason] = useState<TMDBSeason | null>(null);
  const [seasonOpen,   setSeasonOpen]   = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    setDetail(null);
    setActiveSeason(null);
    const fn = type === "movie" ? fetchMovie : fetchShow;
    fn(id)
      .then(d => {
        setDetail(d);
        if (type === "tv") {
          const seasons = ((d as TMDBShowDetail).seasons ?? []).filter(s => s.season_number > 0);
          if (seasons.length) setActiveSeason(seasons[0]);
        }
      })
      .catch(e => toast(e.message ?? "Failed to load", "error"))
      .finally(() => setLoading(false));
  }, [id, type, toast]);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const show    = type === "tv" ? (detail as TMDBShowDetail | null) : null;
  const movie   = type === "movie" ? (detail as TMDBMovieDetail | null) : null;
  const seasons = useMemo(
    () => (show?.seasons ?? []).filter(s => s.season_number > 0),
    [show]
  );
  const cast    = useMemo(() => detail?.credits?.cast?.slice(0, 10) ?? [], [detail]);
  const trailer = useMemo(() => bestTrailer(detail?.videos?.results), [detail]);
  const similar = useMemo(
    () => (type === "movie"
      ? (movie?.similar?.results ?? []).slice(0, 12)
      : (show?.similar?.results ?? []).slice(0, 12)
    ) as AnyMedia[],
    [type, movie, show]
  );
  const director = useMemo(
    () => movie?.credits?.crew?.find(c => c.job === "Director"),
    [movie]
  );
  const creator = useMemo(
    () => show?.created_by?.[0],
    [show]
  );

  const back   = BACK(detail?.backdrop_path);
  const poster = POSTER(detail?.poster_path);
  const title  = detail ? mediaTitle(detail) : "";

  // ── Navigate to similar item without closing panel ──
  const [stack, setStack] = useState<{ id: number; type: DetailType }[]>([]);
  const pushSimilar = (item: AnyMedia) => {
    if (!detail) return;
    setStack(s => [...s, { id, type }]);
    setDetail(null);
    setLoading(true);
    const nId   = item.id;
    const nType = isShow(item) ? "tv" : "movie";
    const fn    = nType === "movie" ? fetchMovie : fetchShow;
    fn(nId)
      .then(d => {
        setDetail(d);
        if (nType === "tv") {
          const ss = ((d as TMDBShowDetail).seasons ?? []).filter(s => s.season_number > 0);
          if (ss.length) setActiveSeason(ss[0]);
        }
      })
      .catch(e => toast(e.message ?? "Failed to load", "error"))
      .finally(() => setLoading(false));
  };
  const popStack = () => {
    if (!stack.length) return;
    const prev = stack[stack.length - 1];
    setStack(s => s.slice(0, -1));
    setDetail(null);
    setLoading(true);
    const fn = prev.type === "movie" ? fetchMovie : fetchShow;
    fn(prev.id)
      .then(d => {
        setDetail(d);
        if (prev.type === "tv") {
          const ss = ((d as TMDBShowDetail).seasons ?? []).filter(s => s.season_number > 0);
          if (ss.length) setActiveSeason(ss[0]);
        }
      })
      .catch(e => toast(e.message ?? "Failed to load", "error"))
      .finally(() => setLoading(false));
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 8000,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
      }} />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 8001,
        width: "min(720px, 100vw)",
        background: "#0c0c0c",
        borderLeft: "1px solid var(--border)",
        overflowY: "auto", overflowX: "hidden",
        animation: "detail-slide-in 0.28s cubic-bezier(.22,.68,0,1.2)",
      }}>

        {/* ── Sticky top bar ── */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 16px",
          background: "rgba(12,12,12,0.92)", backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            {stack.length > 0 && (
              <button onClick={popStack} className="btn-ghost" style={{ padding: "5px 12px", fontSize: "0.7rem" }}>
                <ChevronLeft size={12} /> Back
              </button>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, background: "var(--bg-card)",
            border: "1px solid var(--border)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-secondary)",
          }}>
            <X size={15} />
          </button>
        </div>

        {/* ── Loading state ── */}
        {loading && (
          <div style={{ padding: "0 0 40px" }}>
            <Sk h={280} />
            <div style={{ padding: "20px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
              <Sk h={16} style={{ width: "30%" }} />
              <Sk h={30} style={{ width: "70%" }} />
              <Sk h={13} />
              <Sk h={13} style={{ width: "85%" }} />
              <Sk h={13} style={{ width: "55%" }} />
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {detail && !loading && (
          <>
            {/* Hero backdrop */}
            <div style={{ position: "relative", height: 280, overflow: "hidden" }}>
              {back
                ? <img src={back} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }} />
                : <div style={{ width: "100%", height: "100%", background: "var(--bg-raised)" }} />
              }
              {/* Bottom fade */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0c0c0c 0%, rgba(12,12,12,0.1) 60%, transparent 100%)" }} />
              {/* Left fade */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(12,12,12,0.7) 0%, transparent 60%)" }} />
            </div>

            <div style={{ padding: "0 28px 48px", marginTop: -80, position: "relative", zIndex: 2 }}>

              {/* ── Poster + title block ── */}
              <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
                {/* Poster */}
                <div style={{
                  width: 100, height: 150, flexShrink: 0,
                  border: "1px solid var(--border-strong)",
                  overflow: "hidden", background: "var(--bg-raised)",
                }}>
                  {poster
                    ? <img src={poster} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {type === "tv" ? <Tv2 size={24} style={{ opacity: 0.12 }} /> : <Film size={24} style={{ opacity: 0.12 }} />}
                      </div>
                  }
                </div>

                {/* Meta column */}
                <div style={{ flex: 1, paddingTop: 60 }}>
                  {/* Pills */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    <Pill accent>{type === "movie" ? "Film" : "Series"}</Pill>
                    {detail.vote_average > 0 && <RatingBadge v={detail.vote_average} />}
                    {mediaYear(detail) && <Pill>{mediaYear(detail)}</Pill>}
                    {movie && fmtRuntime(movie.runtime) && <Pill>{fmtRuntime(movie.runtime)}</Pill>}
                    {show?.number_of_seasons && (
                      <Pill>{show.number_of_seasons} Season{show.number_of_seasons > 1 ? "s" : ""}</Pill>
                    )}
                    {show?.episode_run_time?.[0] && (
                      <Pill>~{show.episode_run_time[0]}m / ep</Pill>
                    )}
                    {(detail as TMDBMovieDetail).status && (
                      <Pill>{(detail as TMDBMovieDetail).status}</Pill>
                    )}
                  </div>

                  {/* Title */}
                  <h2 style={{
                    fontSize: "clamp(1.4rem, 3vw, 2rem)",
                    color: "var(--text-primary)", lineHeight: 1.15,
                    marginBottom: 6, fontWeight: 800, letterSpacing: "-0.01em",
                  }}>
                    {title}
                  </h2>

                  {/* Tagline */}
                  {detail.tagline && (
                    <p style={{ fontSize: "0.72rem", color: "var(--accent)", fontStyle: "italic", marginBottom: 6 }}>
                      "{detail.tagline}"
                    </p>
                  )}

                  {/* Director / Creator */}
                  {director && (
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: 2 }}>
                      Directed by <strong style={{ color: "var(--text-secondary)" }}>{director.name}</strong>
                    </p>
                  )}
                  {creator && (
                    <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      Created by <strong style={{ color: "var(--text-secondary)" }}>{creator.name}</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* ── Genres ── */}
              {detail.genres && detail.genres.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
                  {detail.genres.map(g => (
                    <Pill key={g.id}>{g.name}</Pill>
                  ))}
                </div>
              )}

              {/* ── Synopsis ── */}
              {detail.overview && (
                <p style={{
                  fontSize: "0.82rem", color: "var(--text-secondary)",
                  lineHeight: 1.8, marginBottom: 24,
                }}>
                  {detail.overview}
                </p>
              )}

              {/* ── Stats row (movie) ── */}
              {movie && (movie.budget || movie.revenue) ? (
                <div style={{
                  display: "flex", gap: 16, marginBottom: 22, flexWrap: "wrap",
                  padding: "12px 16px", background: "var(--bg-card)", border: "1px solid var(--border)",
                }}>
                  {movie.budget ? (
                    <div>
                      <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 3 }}>Budget</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        ${(movie.budget / 1e6).toFixed(0)}M
                      </div>
                    </div>
                  ) : null}
                  {movie.revenue ? (
                    <div>
                      <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 3 }}>Box Office</div>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--success)" }}>
                        ${(movie.revenue / 1e6).toFixed(0)}M
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 3 }}>Votes</div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {(movie.vote_count ?? 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ── CTA buttons ── */}
              <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap" }}>
                <button 
                  className="btn-primary" 
                  style={{ padding: "11px 30px" }}
                  onClick={() => {
                    if (type === "tv" && activeSeason) {
                      onPlay(detail.id, type, title, activeSeason.season_number, 1);
                    } else {
                      onPlay(detail.id, type, title);
                    }
                  }}
                >
                  <Play size={15} /> Play
                </button>
                <button className="btn-ghost" style={{ padding: "11px 18px" }}>
                  <Plus size={14} /> Add to List
                </button>
                {trailer && (
                  <a
                    href={`https://youtube.com/watch?v=${trailer.key}`}
                    target="_blank" rel="noreferrer"
                    className="btn-ghost"
                    style={{ padding: "11px 18px", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 }}
                  >
                    ▶ Trailer
                  </a>
                )}
              </div>

              {/* ════════════════════════════════════════════
                  SERIES ONLY: Season selector + episodes
              ════════════════════════════════════════════ */}
              {type === "tv" && seasons.length > 0 && (
                <div style={{ marginBottom: 36 }}>
                  <SectionHeader icon={<Tv2 size={13} />} title="Episodes" />

                  {/* Season dropdown */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                    <div style={{ position: "relative" }}>
                      <button
                        onClick={() => setSeasonOpen(v => !v)}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "8px 16px",
                          background: "var(--bg-card)", border: "1px solid var(--border-strong)",
                          color: "var(--text-primary)", cursor: "pointer",
                          fontSize: "0.8rem", fontFamily: "Comfortaa", fontWeight: 600,
                          minWidth: 180,
                        }}
                      >
                        <Tv2 size={12} color="var(--accent)" />
                        {activeSeason?.name ?? "Select Season"}
                        <ChevronDown size={12} color="var(--text-muted)" style={{
                          marginLeft: "auto",
                          transform: seasonOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }} />
                      </button>

                      {seasonOpen && (
                        <div style={{
                          position: "absolute", top: "calc(100% + 4px)", left: 0,
                          background: "var(--bg-raised)", border: "1px solid var(--border-strong)",
                          zIndex: 50, minWidth: 220, maxHeight: 300, overflowY: "auto",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                        }}>
                          {seasons.map(s => (
                            <button key={s.id} onClick={() => { setActiveSeason(s); setSeasonOpen(false); }}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                width: "100%", padding: "10px 16px",
                                background: activeSeason?.id === s.id ? "var(--accent-dim)" : "transparent",
                                border: "none", borderBottom: "1px solid var(--border)",
                                color: activeSeason?.id === s.id ? "var(--accent)" : "var(--text-secondary)",
                                cursor: "pointer", fontSize: "0.78rem", fontFamily: "Comfortaa",
                                textAlign: "left", gap: 8,
                              }}
                            >
                              <span>{s.name}</span>
                              <span style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>
                                {s.episode_count} ep
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {activeSeason?.air_date && (
                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                        <Calendar size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />
                        {activeSeason.air_date.slice(0, 4)}
                      </span>
                    )}
                    {activeSeason?.episode_count && (
                      <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                        {activeSeason.episode_count} episodes
                      </span>
                    )}
                  </div>

                  {/* Season overview */}
                  {activeSeason?.overview && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 14 }}>
                      {activeSeason.overview}
                    </p>
                  )}

                  {activeSeason && show && (
                    <EpisodeList showId={show.id} season={activeSeason} />
                  )}
                </div>
              )}

              {/* ── Cast ── */}
              {cast.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                  <SectionHeader icon={<Users size={13} />} title="Cast" />
                  <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                    {cast.map(p => <CastCard key={p.id} person={p} />)}
                  </div>
                </div>
              )}

              {/* ── Similar ── */}
              {similar.length > 0 && (
                <div>
                  <SectionHeader icon={<Film size={13} />} title="More Like This" />
                  <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
                    {similar.map(item => (
                      <PosterCard
                        key={item.id}
                        item={item}
                        size="sm"
                        onClick={() => pushSimilar(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes detail-slide-in {
          from { transform: translateX(32px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes sk-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </>
  );
}

// ─── Section header with icon ─────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <span style={{ color: "var(--accent)" }}>{icon}</span>
      <span style={{
        fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "var(--text-secondary)",
      }}>
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: "var(--border)", marginLeft: 6 }} />
    </div>
  );
}

// ─── Cast card ────────────────────────────────────────────────────────────────
function CastCard({ person }: { person: TMDBCastMember }) {
  const face = FACE(person.profile_path);
  return (
    <div style={{ flexShrink: 0, width: 72, textAlign: "center" }}>
      <div style={{
        width: 72, height: 72, overflow: "hidden",
        border: "1px solid var(--border)", background: "var(--bg-raised)",
        marginBottom: 6,
      }}>
        {face
          ? <img src={face} alt={person.name} loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: "1.4rem", opacity: 0.12 }}>👤</span>
            </div>
        }
      </div>
      <p style={{ fontSize: "0.62rem", color: "var(--text-primary)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {person.name}
      </p>
      <p style={{ fontSize: "0.57rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
        {person.character}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SEARCH BAR
// ──────────────────────────────────────────────────────────────────────────────
function SearchBar({
  onResults,
}: {
  onResults: (r: AnyMedia[], q: string) => void;
}) {
  const [q,      setQ]      = useState("");
  const [active, setActive] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current !== null) {
      clearTimeout(debounce.current);
    }

    if (!q.trim()) {
      onResults([], "");
      return;
    }

    debounce.current = setTimeout(() => {
      searchTMDB(q)
        .then((r) => onResults(r as AnyMedia[], q))
        .catch(() => onResults([], q));
    }, 380);

    return () => {
      if (debounce.current !== null) {
        clearTimeout(debounce.current);
      }
    };
  }, [q, onResults]);

  return (
    <div style={{ position: "relative", width: active ? 300 : 190, transition: "width 0.25s ease" }}>
      <Search size={13} color="var(--text-muted)" style={{
        position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
      }} />
      <input
        className="input-field"
        placeholder="Search…"
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        style={{ paddingLeft: 32, paddingRight: q ? 28 : 12, fontSize: "0.78rem", height: 36 }}
      />
      {q && (
        <button onClick={() => { setQ(""); onResults([], ""); }} style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
          display: "flex", padding: 0,
        }}>
          <X size={12} />
        </button>
      )}
    </div>
  );
}


export async function fetchTorrentioStreams(
  imdbId: string,
  mediaType: "movie" | "tv",
  season?: number,
  episode?: number
) {
  const workerBase = process.env.NEXT_PUBLIC_WORKER_URL!;

  // Fetch configured base URL from your worker
  const configRes = await fetch(`${workerBase}/config/torrentio`);
  if (!configRes.ok) {
    throw new Error("Failed to load Torrentio configuration");
  }

  const config = await configRes.json();
  const base = config.base;

  let torrentioUrl: string;

  if (mediaType === "movie") {
    torrentioUrl = `${base}/stream/movie/${imdbId}.json`;
  } else {
    if (season == null || episode == null) {
      throw new Error("Season and episode are required for TV shows");
    }

    torrentioUrl =
      `${base}/stream/series/${imdbId}:${season}:${episode}.json`;
  }

  const res = await fetch(torrentioUrl, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`Torrentio returned HTTP ${res.status}`);
  }

  return res.json();
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN BROWSE PAGE
// ──────────────────────────────────────────────────────────────────────────────
type Tab = "home" | "movies" | "shows";

export default function BrowsePage() {
  const [data,          setData]          = useState<HomeData | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<Tab>("home");
  const [selected,      setSelected]      = useState<{ id: number; type: DetailType } | null>(null);
  const [searchResults, setSearchResults] = useState<AnyMedia[]>([]);
  const [searchQuery,   setSearchQuery]   = useState("");
  
  // Stream selector state
  const [showStreamSelector, setShowStreamSelector] = useState(false);
  const [streamSelectorConfig, setStreamSelectorConfig] = useState<{
    tmdbId: number;
    mediaType: "movie" | "tv";
    title: string;
    season?: number;
    episode?: number;
  } | null>(null);

  // Media player state
  const [playingStream, setPlayingStream] = useState<TorrentStream | null>(null);

  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchHome());
    } catch (e: unknown) {
      toast(
        (e as Error).message || "Failed to load. Is TMDB_API_KEY saved in KV Store?",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openItem = useCallback((item: AnyMedia) => {
    setSelected({ id: item.id, type: isShow(item) ? "tv" : "movie" });
  }, []);

  const handleSearchResults = useCallback((r: AnyMedia[], q: string) => {
    setSearchResults(r);
    setSearchQuery(q);
  }, []);

  // Called from DetailPanel when Play is clicked
  const handlePlayClick = useCallback((tmdbId: number, mediaType: DetailType, title: string, season?: number, episode?: number) => {
    setStreamSelectorConfig({
      tmdbId,
      mediaType,
      title,
      season,
      episode,
    });
    setShowStreamSelector(true);
  }, []);

  // Called from StreamSelector when a stream is selected
  const handleStreamSelected = useCallback(
    async (stream: TorrentStream) => {
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_TORR_URL || "http://localhost:8000";

        // Build magnet from info hash
        const magnet = `magnet:?xt=urn:btih:${stream.infoHash}`;

        // Add torrent to backend/qBittorrent
        const res = await fetch(`${apiBase}/torrent/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            magnet,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to add torrent: ${text}`);
        }

        const data = await res.json();
        console.log("Torrent added:", data);

        // Use returned hash (normalized by qBittorrent)
        setPlayingStream({
          ...stream,
          infoHash: data.hash,
        });

        setShowStreamSelector(false);
      } catch (err) {
        console.error(err);
        toast(
          err instanceof Error
            ? err.message
            : "Failed to add torrent",
          "error"
        );
      }
    },
    [toast]
  );

  const hasSearch = searchResults.length > 0 || searchQuery.length > 0;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home",   label: "Home",   icon: <Award size={12} /> },
    { id: "movies", label: "Movies", icon: <Film  size={12} /> },
    { id: "shows",  label: "Series", icon: <Tv2   size={12} /> },
  ];

  const heroItems = useMemo<AnyMedia[]>(() => {
    if (!data) return [];
    if (tab === "movies") return data.trendingMovies;
    if (tab === "shows")  return data.trendingShows;
    return [
      ...data.trendingMovies.slice(0, 4),
      ...data.trendingShows.slice(0, 4),
    ];
  }, [data, tab]);

  return (
    <div
      className="page-enter"
      style={{ margin: "0 -28px", minHeight: "100vh", background: "var(--bg-base)" }}
    >
      {/* ════════════════ TOP NAV ════════════════ */}
      <div style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(10,10,10,0.93)",
        backdropFilter: "blur(14px)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        paddingLeft: 28, paddingRight: 20, gap: 0,
      }}>
        {/* Logo mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28, padding: "13px 0", flexShrink: 0 }}>
          <div style={{
            width: 28, height: 28,
            background: "var(--accent-dim)", border: "1.5px solid var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 3,
          }}>
            <div style={{
              width: 12, height: 12, background: "var(--accent)",
              clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)",
            }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            BROWSE
          </span>
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ border: "none", flex: 1 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-item ${tab === t.id ? "active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Search + refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
          <SearchBar onResults={handleSearchResults} />
          <button onClick={load} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", display: "flex", padding: 6,
          }}>
            <RefreshCw size={13} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* ════════════════ SEARCH RESULTS ════════════════ */}
      {hasSearch && (
        <div style={{ padding: "24px 40px 40px" }}>
          <p style={{
            fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 16,
          }}>
            {searchResults.length > 0
              ? `${searchResults.length} results for "${searchQuery}"`
              : `No results for "${searchQuery}"`}
          </p>
          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              {searchResults.map(item => (
                <PosterCard
                  key={`${item.id}-${isShow(item) ? "tv" : "mv"}`}
                  item={item}
                  onClick={() => openItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ LOADING SKELETONS ════════════════ */}
      {loading && !hasSearch && (
        <div style={{ padding: "0 0 48px" }}>
          {/* Hero skeleton */}
          <Sk h="clamp(300px,46vw,540px)" style={{ marginBottom: 36 }} />
          {/* Row skeletons */}
          <div style={{ padding: "0 40px", display: "flex", flexDirection: "column", gap: 40 }}>
            {[0, 1, 2].map(r => (
              <div key={r}>
                <Sk h={14} style={{ width: 160, marginBottom: 16 }} />
                <div style={{ display: "flex", gap: 12 }}>
                  {[...Array(7)].map((_, i) => (
                    <div key={i} style={{ flexShrink: 0 }}>
                      <Sk w={140} h={210} style={{ marginBottom: 8 }} />
                      <Sk h={12} style={{ width: 120, marginBottom: 5 }} />
                      <Sk h={10} style={{ width: 80 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════ MAIN CONTENT ════════════════ */}
      {data && !loading && !hasSearch && (
        <>
          {/* Hero */}
          <HeroBanner items={heroItems} onSelect={openItem} />

          {/* Rows */}
          <div style={{ padding: "0 40px 64px", display: "flex", flexDirection: "column", gap: 56 }}>
            {tab === "home" && (
              <>
                <MediaRow title="Trending Movies"  badge="This Week" items={data.trendingMovies}  onSelect={openItem} />
                <MediaRow title="Trending Series"  badge="This Week" items={data.trendingShows}   onSelect={openItem} />
                <MediaRow title="Popular Movies"                      items={data.popularMovies}   onSelect={openItem} />
                <MediaRow title="Popular Series"                      items={data.popularShows}    onSelect={openItem} />
                <MediaRow title="Top Rated Movies"                    items={data.topRatedMovies}  onSelect={openItem} />
                <MediaRow title="Top Rated Series"                    items={data.topRatedShows}   onSelect={openItem} />
              </>
            )}
            {tab === "movies" && (
              <>
                <MediaRow title="Trending"           badge="This Week" items={data.trendingMovies}  onSelect={openItem} />
                <MediaRow title="Popular Right Now"                    items={data.popularMovies}   onSelect={openItem} />
                <MediaRow title="Top Rated"                            items={data.topRatedMovies}  onSelect={openItem} />
              </>
            )}
            {tab === "shows" && (
              <>
                <MediaRow title="Trending Series"   badge="This Week" items={data.trendingShows}   onSelect={openItem} />
                <MediaRow title="Popular Series"                       items={data.popularShows}    onSelect={openItem} />
                <MediaRow title="Top Rated Series"                     items={data.topRatedShows}   onSelect={openItem} />
              </>
            )}
          </div>
        </>
      )}

      {/* ════════════════ DETAIL PANEL ════════════════ */}
      {selected && (
        <DetailPanel
          id={selected.id}
          type={selected.type}
          onClose={() => setSelected(null)}
          onPlay={handlePlayClick}
        />
      )}

      {/* ════════════════ STREAM SELECTOR ════════════════ */}
      {showStreamSelector && streamSelectorConfig && (
        <StreamSelector
          tmdbId={streamSelectorConfig.tmdbId}
          mediaType={streamSelectorConfig.mediaType}
          title={streamSelectorConfig.title}
          season={streamSelectorConfig.season}
          episode={streamSelectorConfig.episode}
          onSelect={handleStreamSelected}
          fetchStreams={fetchTorrentioStreams}
          onClose={() => {
            setShowStreamSelector(false);
            setStreamSelectorConfig(null);
          }}
        />
      )}

      {/* ════════════════ MEDIA PLAYER ════════════════ */}
      {playingStream && streamSelectorConfig && (
        <MediaPlayer
          file={{
            name:
              playingStream.behaviorHints?.filename ||
              `${streamSelectorConfig.title}${
                streamSelectorConfig.mediaType === "movie"
                  ? ".mkv"
                  : ` S${String(streamSelectorConfig.season ?? 1).padStart(2, "0")}E${String(streamSelectorConfig.episode ?? 1).padStart(2, "0")}.mkv`
              }`,

            // Your FastAPI server will prepend NEXT_PUBLIC_API_URL automatically
            url: `/torrent/${playingStream.infoHash}/file/${encodeURIComponent(
              playingStream.behaviorHints?.filename || ""
            )}`,

            size: 0,

            // Used by MediaPlayer to poll torrent stats
            torrentHash: playingStream.infoHash,
          }}
          onClose={() => {
            setPlayingStream(null);
            setStreamSelectorConfig(null);
          }}
        />
      )}
    </div>
  );
}