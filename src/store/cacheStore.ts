import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Anime {
  id: number;
  title: string;
  image: string;
  episode: string;
  isNew?: boolean;
  description?: string;
  genres?: string[];
  time?: string;
}

interface AnimeDetails {
  id: number;
  title: string;
  image: string;
  description: string;
  status: string;
  genres: string[];
  episodes: Array<{
    id: number;
    number: number;
    title: string;
  }>;
  studios: string[];
  producers: string[];
  season: string;
  startDate: string;
  endDate: string;
}

interface Schedule {
  [key: string]: Anime[];
}

export interface ScheduleInfo {
  schedule: Schedule;
  currentSeason: string;
  currentYear: number;
}

interface CacheState {
  latestAnime: Anime[];
  popularAnime: Anime[];
  newEpisodes: Anime[];
  movies: Anime[];
  featuredAnime: Anime[];
  scheduleInfo: ScheduleInfo;
  animeDetails: Record<number, AnimeDetails>;
  favoriteAnimeDetails: Record<number, Anime>;
  setLatestAnime: (anime: Anime[]) => void;
  setPopularAnime: (anime: Anime[]) => void;
  setNewEpisodes: (anime: Anime[]) => void;
  setMovies: (anime: Anime[]) => void;
  setFeaturedAnime: (anime: Anime[]) => void;
  setSchedule: (scheduleInfo: ScheduleInfo) => void;
  setAnimeDetails: (id: number, details: AnimeDetails) => void;
  setFavoriteAnimeDetails: (id: number, anime: Anime) => void;
  getAnimeBySection: (section: string) => Anime[];
  getSchedule: () => ScheduleInfo;
  getAnimeDetails: (id: number) => AnimeDetails | undefined;
  getFavoriteAnimeDetails: (id: number) => Anime | undefined;
  clearFavoriteAnimeDetails: () => void;
}

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      latestAnime: [],
      popularAnime: [],
      newEpisodes: [],
      movies: [],
      featuredAnime: [],
      scheduleInfo: {
        schedule: {},
        currentSeason: "",
        currentYear: 0,
      },
      animeDetails: {},
      favoriteAnimeDetails: {},
      setLatestAnime: (anime) => set({ latestAnime: anime }),
      setPopularAnime: (anime) => set({ popularAnime: anime }),
      setNewEpisodes: (anime) => set({ newEpisodes: anime }),
      setMovies: (anime) => set({ movies: anime }),
      setFeaturedAnime: (anime) => set({ featuredAnime: anime }),
      setSchedule: (scheduleInfo) => set({ scheduleInfo }),
      setAnimeDetails: (id, details) =>
        set((state) => ({
          animeDetails: { ...state.animeDetails, [id]: details },
        })),
      setFavoriteAnimeDetails: (id, anime) =>
        set((state) => ({
          favoriteAnimeDetails: { ...state.favoriteAnimeDetails, [id]: anime },
        })),
      getAnimeBySection: (section) => {
        const state = get();
        switch (section) {
          case "latest":
            return state.latestAnime;
          case "popular":
            return state.popularAnime;
          case "episodes":
            return state.newEpisodes;
          case "movies":
            return state.movies;
          case "featured":
            return state.featuredAnime;
          default:
            return [];
        }
      },
      getSchedule: () => get().scheduleInfo,
      getAnimeDetails: (id) => get().animeDetails[id],
      getFavoriteAnimeDetails: (id) => get().favoriteAnimeDetails[id],
      clearFavoriteAnimeDetails: () => set({ favoriteAnimeDetails: {} }),
    }),
    {
      name: "anime-cache",
    }
  )
);
