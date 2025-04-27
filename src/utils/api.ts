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

interface Episode {
  id: number;
  number: number;
  title: string;
}

interface Anime {
  id: number;
  title: string;
  image: string;
  description: string;
  status: string;
  genres: string[];
  episodes: Episode[];
  isNew?: boolean;
  episode?: string;
}

interface ScheduleItem {
  id: number;
  title: string;
  time: string;
  episode: string;
}

interface Schedule {
  [key: string]: ScheduleItem[];
}

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
