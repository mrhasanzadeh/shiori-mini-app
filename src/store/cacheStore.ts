import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Anime {
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
}

interface Schedule {
  [key: string]: Anime[];
}

interface CacheState {
  latestAnime: Anime[];
  popularAnime: Anime[];
  newEpisodes: Anime[];
  movies: Anime[];
  featuredAnime: Anime[];
  mostPopular: Anime[];
  schedule: Schedule;
  animeDetails: Record<number, AnimeDetails>;
  setLatestAnime: (anime: Anime[]) => void;
  setPopularAnime: (anime: Anime[]) => void;
  setNewEpisodes: (anime: Anime[]) => void;
  setMovies: (anime: Anime[]) => void;
  setFeaturedAnime: (anime: Anime[]) => void;
  setMostPopular: (anime: Anime[]) => void;
  setSchedule: (schedule: Schedule) => void;
  setAnimeDetails: (id: number, details: AnimeDetails) => void;
  getAnimeBySection: (section: string) => Anime[];
  getSchedule: () => Schedule;
  getAnimeDetails: (id: number) => AnimeDetails | undefined;
}

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      latestAnime: [],
      popularAnime: [],
      newEpisodes: [],
      movies: [],
      featuredAnime: [],
      mostPopular: [],
      schedule: {},
      animeDetails: {},
      setLatestAnime: (anime) => set({ latestAnime: anime }),
      setPopularAnime: (anime) => set({ popularAnime: anime }),
      setNewEpisodes: (anime) => set({ newEpisodes: anime }),
      setMovies: (anime) => set({ movies: anime }),
      setFeaturedAnime: (anime) => set({ featuredAnime: anime }),
      setMostPopular: (anime) => set({ mostPopular: anime }),
      setSchedule: (schedule) => set({ schedule }),
      setAnimeDetails: (id, details) =>
        set((state) => ({
          animeDetails: { ...state.animeDetails, [id]: details },
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
          case "most-popular":
            return state.mostPopular;
          default:
            return [];
        }
      },
      getSchedule: () => get().schedule,
      getAnimeDetails: (id) => get().animeDetails[id],
    }),
    {
      name: "anime-cache",
    }
  )
);
