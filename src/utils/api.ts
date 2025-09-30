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

export const fetchAnimeList = async (section: string = "latest") => {
  switch (section) {
    case "latest":
      return getLatestAnime();
    case "popular":
      return getPopularAnime();
    case "episodes":
      return getNewEpisodes();
    case "movies":
      return getAnimeMovies();
    default:
      return getLatestAnime();
  }
};

export const fetchAnimeById = async (id: number) => {
  return getAnimeById(id);
};

export const fetchSchedule = async () => {
  return getSchedule();
};

export const fetchSearch = async (q: string, page: number = 1) => {
  // page is ignored in mock; included for future compatibility
  return searchAnime(q);
};

export const fetchSimilar = async (id: number) => {
  return getSimilarAnime(id);
};
