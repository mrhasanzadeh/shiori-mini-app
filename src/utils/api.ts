// Mock API functions for demonstration
// In a real application, these would be replaced with actual API calls

import {
  getLatestAnime,
  getPopularAnime,
  getNewEpisodes,
  getAnimeById,
  getSchedule,
  getAnimeMovies,
} from "../services/anilist";

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
