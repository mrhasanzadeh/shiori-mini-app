// App-level API wrapper that points to our local service (mock for now)
import * as supa from "../services/supabaseAnime";

// Lightweight card shape used across Home/Search UIs
export type UiAnimeCard = {
  id: number;
  title: string;
  image: string;
  episode: string;
  isNew?: boolean;
  description?: string;
  genres?: string[];
};
import type { AnimeListItem } from "../store/animeStore";

const toCacheAnime = (c: any): UiAnimeCard => ({
  id: c.id,
  title: c.title,
  image: c.image,
  episode: c.episode ?? "قسمت ۱",
  isNew: Boolean(c.isNew || c.is_new),
  description: c.description ?? "",
  genres: Array.isArray(c.genres) ? c.genres : [],
});

const toListItem = (c: any): AnimeListItem => ({
  id: c.id,
  title: c.title,
  image: c.image,
  description: c.description ?? "",
  status: c.status ?? "RELEASING",
  genres: Array.isArray(c.genres) ? c.genres : [],
  episodes: typeof c.episodes === "number" ? c.episodes : 1,
  isNew: Boolean(c.isNew || c.is_new),
  episode: c.episode ?? "قسمت ۱",
});

// Returns items shaped for AnimeList store (AnimeListItem[])
export const fetchAnimeList = async (section: string = "latest"): Promise<AnimeListItem[]> => {
  let data: any[] = [];
  switch (section) {
    case "latest":
      data = await supa.getLatestAnime();
      break;
    case "popular":
      data = await supa.getPopularAnime();
      break;
    case "episodes":
      data = await supa.getNewEpisodes();
      break;
    case "movies":
      data = await supa.getAnimeMovies();
      break;
    default:
      data = await supa.getLatestAnime();
  }
  return data.map(toListItem);
};

// Returns items shaped for cache cards on Home/Search (Anime[])
export const fetchAnimeCards = async (section: string = "latest"): Promise<UiAnimeCard[]> => {
  let data: any[] = [];
  switch (section) {
    case "latest":
      data = await supa.getLatestAnime();
      break;
    case "popular":
      data = await supa.getPopularAnime();
      break;
    case "episodes":
      data = await supa.getNewEpisodes();
      break;
    case "movies":
      data = await supa.getAnimeMovies();
      break;
    default:
      data = await supa.getLatestAnime();
  }
  return data.map(toCacheAnime);
};

export const fetchAnimeById = async (id: number) => {
  return supa.getAnimeById(id);
};

export const fetchSchedule = async () => {
  return supa.getSchedule();
};

export const fetchSearch = async (q: string, _page: number = 1): Promise<UiAnimeCard[]> => {
  const data = await supa.searchAnime(q);
  return data.map(toCacheAnime);
};

export const fetchSimilar = async (id: number) => {
  return supa.getSimilarAnime(id);
};
