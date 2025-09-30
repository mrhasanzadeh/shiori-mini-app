// App-level API wrapper that points to our local service (mock for now)
import {
  getLatestAnime,
  getPopularAnime,
  getNewEpisodes,
  getAnimeById,
  getSchedule,
  getAnimeMovies,
  searchAnime,
  getSimilarAnime,
} from "../services/shiori";

import type { Anime as CacheAnime } from "../store/cacheStore";
import type { AnimeListItem } from "../store/animeStore";

const toCacheAnime = (c: any): CacheAnime => ({
  id: c.id,
  title: c.title,
  image: c.image,
  episode: c.episode ?? "قسمت ۱",
  isNew: Boolean(c.isNew),
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
  isNew: Boolean(c.isNew),
  episode: c.episode ?? "قسمت ۱",
});

// Returns items shaped for AnimeList store (AnimeListItem[])
export const fetchAnimeList = async (section: string = "latest"): Promise<AnimeListItem[]> => {
  let data: any[] = [];
  switch (section) {
    case "latest":
      data = await getLatestAnime();
      break;
    case "popular":
      data = await getPopularAnime();
      break;
    case "episodes":
      data = await getNewEpisodes();
      break;
    case "movies":
      data = await getAnimeMovies();
      break;
    default:
      data = await getLatestAnime();
  }
  return data.map(toListItem);
};

// Returns items shaped for cache cards on Home/Search (Anime[])
export const fetchAnimeCards = async (section: string = "latest"): Promise<CacheAnime[]> => {
  let data: any[] = [];
  switch (section) {
    case "latest":
      data = await getLatestAnime();
      break;
    case "popular":
      data = await getPopularAnime();
      break;
    case "episodes":
      data = await getNewEpisodes();
      break;
    case "movies":
      data = await getAnimeMovies();
      break;
    default:
      data = await getLatestAnime();
  }
  return data.map(toCacheAnime);
};

export const fetchAnimeById = async (id: number) => {
  return getAnimeById(id);
};

export const fetchSchedule = async () => {
  return getSchedule();
};

export const fetchSearch = async (q: string, _page: number = 1): Promise<CacheAnime[]> => {
  const data = await searchAnime(q);
  return data.map(toCacheAnime);
};

export const fetchSimilar = async (id: number) => {
  return getSimilarAnime(id);
};
