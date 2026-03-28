export interface Source {
  id: string;
  content_id: string;
  source_name: string;
  watch_mode: "in_app" | "external";
  external_url: string | null;
  stream_url: string | null;
  quality_hint: string | null;
  subtitle_languages: string[];
  availability_note: string | null;
  region_hint: string | null;
  is_verified: boolean;
  last_checked_at: string | null;
  created_at: string;
}

export interface Content {
  id: string;
  title: string;
  original_title: string | null;
  year: number | null;
  country: string[] | null;
  genres: string[] | null;
  synopsis: string | null;
  poster_url: string | null;
  tmdb_id: number | null;
  audience: string | null;
  license_class: string | null;
  vote_average?: number;
  vote_count?: number;
  runtime?: number;
  popularity?: number;
  created_at: string;
  updated_at: string;
  sources: Source[];
}

export interface ContentListResponse {
  items: Content[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SearchParams {
  q?: string;
  genre?: string;
  country?: string;
  subtitle_lang?: string;
  watch_mode?: string;
  verified_only?: boolean;
  sort_by?: string;
  page?: number;
  page_size?: number;
}
