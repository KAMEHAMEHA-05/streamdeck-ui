// lib/tmdb.ts

const WORKER = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export const IMG_BASE = "https://image.tmdb.org/t/p";
export const img = (path: string | null | undefined, size = "w500"): string | null =>
  path ? `${IMG_BASE}/${size}${path}` : null;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sd_token");
}

function authHeaders(): HeadersInit {
  const t = getToken();
  return {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${WORKER}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: TMDBGenre[];
  runtime?: number;
  tagline?: string;
  status?: string;
  budget?: number;
  revenue?: number;
  media_type?: "movie";
}

export interface TMDBShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: TMDBGenre[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: TMDBSeason[];
  tagline?: string;
  status?: string;
  media_type?: "tv";
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
  air_date: string;
  overview: string;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number | null;
  vote_average: number;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TMDBVideo {
  id: string;
  key: string;
  site: string;
  type: string;
  name: string;
  official: boolean;
  published_at: string;
}

export interface TMDBMovieDetail extends TMDBMovie {
  credits: { cast: TMDBCastMember[]; crew: { id: number; name: string; job: string; department: string }[] };
  videos: { results: TMDBVideo[] };
  images: { backdrops: { file_path: string }[]; logos: { file_path: string; iso_639_1: string }[] };
  similar: { results: TMDBMovie[] };
  recommendations: { results: TMDBMovie[] };
}

export interface TMDBShowDetail extends TMDBShow {
  credits: { cast: TMDBCastMember[]; crew: { id: number; name: string; job: string; department: string }[] };
  videos: { results: TMDBVideo[] };
  images: { backdrops: { file_path: string }[]; logos: { file_path: string; iso_639_1: string }[] };
  similar: { results: TMDBShow[] };
  recommendations: { results: TMDBShow[] };
  created_by?: { id: number; name: string; profile_path: string | null }[];
  networks?: { id: number; name: string; logo_path: string | null }[];
  episode_run_time?: number[];
}

export interface HomeData {
  trendingMovies: TMDBMovie[];
  trendingShows:  TMDBShow[];
  popularMovies:  TMDBMovie[];
  popularShows:   TMDBShow[];
  topRatedMovies: TMDBMovie[];
  topRatedShows:  TMDBShow[];
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function fetchHome(): Promise<HomeData> {
  const res = await get<{ success: boolean; data: HomeData }>("/tmdb/home");
  return res.data;
}

export async function fetchMovie(id: number): Promise<TMDBMovieDetail> {
  const res = await get<{ success: boolean; data: TMDBMovieDetail }>(`/tmdb/movie/${id}`);
  return res.data;
}

export async function fetchShow(id: number): Promise<TMDBShowDetail> {
  const res = await get<{ success: boolean; data: TMDBShowDetail }>(`/tmdb/show/${id}`);
  return res.data;
}

export async function fetchSeason(
  showId: number,
  seasonNum: number
): Promise<{ episodes: TMDBEpisode[] }> {
  // Requires this route in your worker (inside the /tmdb/ block):
  //
  //   if (/^\/tmdb\/show\/\d+\/season\/\d+$/.test(url.pathname) && req.method === "GET") {
  //     const parts = url.pathname.split("/");
  //     const data = await fetchTMDB(`/tv/${parts[3]}/season/${parts[5]}`, apiKey);
  //     return jsonOk({ success: true, data });
  //   }
  //
  // Without it, season 1 still works (append_to_response on show detail).
  const res = await get<{ success: boolean; data: { episodes: TMDBEpisode[] } }>(
    `/tmdb/show/${showId}/season/${seasonNum}`
  );
  return res.data;
}

export async function searchTMDB(q: string): Promise<(TMDBMovie | TMDBShow)[]> {
  const res = await get<{ success: boolean; results: (TMDBMovie | TMDBShow)[] }>(
    `/tmdb/search?q=${encodeURIComponent(q)}&type=multi`
  );
  return res.results || [];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function mediaTitle(item: TMDBMovie | TMDBShow): string {
  return (item as TMDBMovie).title || (item as TMDBShow).name || "Untitled";
}

export function mediaDate(item: TMDBMovie | TMDBShow): string {
  return (item as TMDBMovie).release_date || (item as TMDBShow).first_air_date || "";
}

export function mediaYear(item: TMDBMovie | TMDBShow): string {
  const d = mediaDate(item);
  return d ? d.slice(0, 4) : "";
}

export function isShow(item: TMDBMovie | TMDBShow): item is TMDBShow {
  if (item.media_type === "tv")    return true;
  if (item.media_type === "movie") return false;
  // Fallback: TV shows have `name`, movies have `title`
  return !!(item as TMDBShow).name && !(item as TMDBMovie).title;
}

export function ratingColor(r: number): string {
  if (r >= 7.5) return "var(--success)";
  if (r >= 6)   return "var(--accent)";
  return "var(--danger)";
}

export function fmtRuntime(min: number | null | undefined): string | null {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Pick the best English logo from images array, fallback null
export function bestLogo(
  images?: { file_path: string; iso_639_1: string }[]
): string | null {
  if (!images || images.length === 0) return null;
  const en = images.find(l => l.iso_639_1 === "en");
  return en ? img(en.file_path, "w300") : img(images[0].file_path, "w300");
}

// Pick best trailer — prefer official YouTube trailers
export function bestTrailer(videos?: TMDBVideo[]): TMDBVideo | null {
  if (!videos || videos.length === 0) return null;
  const yt = videos.filter(v => v.site === "YouTube");
  return (
    yt.find(v => v.type === "Trailer" && v.official) ||
    yt.find(v => v.type === "Trailer") ||
    yt[0] ||
    null
  );
}