import type { Content, ContentListResponse, SearchParams } from "@/types/content";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchJSON<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }
  let res = await fetch(url.toString(), { next: { revalidate: 60 }, redirect: "follow" });
  // Handle FastAPI 307 redirect manually (Next.js SSR may not follow)
  if (res.status === 307 || res.status === 308) {
    const location = res.headers.get("location");
    if (location) {
      const redirectUrl = location.startsWith("http") ? location : `${API_BASE}${location}`;
      res = await fetch(redirectUrl, { next: { revalidate: 60 } });
    }
  }
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function getContents(page = 1, pageSize = 20): Promise<ContentListResponse> {
  return fetchJSON<ContentListResponse>("/api/contents/", {
    page: String(page),
    page_size: String(pageSize),
  });
}

export async function getContent(id: string): Promise<Content> {
  return fetchJSON<Content>(`/api/contents/${id}`);
}

export async function searchContents(params: SearchParams): Promise<ContentListResponse> {
  const p: Record<string, string> = {};
  if (params.q) p.q = params.q;
  if (params.genre) p.genre = params.genre;
  if (params.country) p.country = params.country;
  if (params.subtitle_lang) p.subtitle_lang = params.subtitle_lang;
  if (params.watch_mode) p.watch_mode = params.watch_mode;
  if (params.verified_only) p.verified_only = "true";
  if (params.sort_by) p.sort_by = params.sort_by;
  p.page = String(params.page ?? 1);
  p.page_size = String(params.page_size ?? 20);
  return fetchJSON<ContentListResponse>("/api/search/", p);
}

/** Trending contents (sorted by popularity) */
export async function getTrendingContents(page = 1, pageSize = 20): Promise<ContentListResponse> {
  return fetchJSON<ContentListResponse>("/api/contents/trending", {
    page: String(page),
    page_size: String(pageSize),
  });
}

/** Top rated contents (sorted by rating, filtered by min votes) */
export async function getTopRatedContents(page = 1, pageSize = 20, minVotes = 50): Promise<ContentListResponse> {
  return fetchJSON<ContentListResponse>("/api/contents/top-rated", {
    page: String(page),
    page_size: String(pageSize),
    min_votes: String(minVotes),
  });
}

/** Contents filtered by country code */
export async function getContentsByCountry(countryCode: string, page = 1, pageSize = 20): Promise<ContentListResponse> {
  return fetchJSON<ContentListResponse>(`/api/contents/by-country/${countryCode}`, {
    page: String(page),
    page_size: String(pageSize),
  });
}

/** Search contents by genre */
export async function searchByGenre(genre: string, page = 1, pageSize = 20): Promise<ContentListResponse> {
  return fetchJSON<ContentListResponse>("/api/search/", {
    genre,
    page: String(page),
    page_size: String(pageSize),
  });
}
