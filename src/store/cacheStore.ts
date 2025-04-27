import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Anime {
  id: number;
  title: string;
  image: string;
  episode: string;
  isNew: boolean;
}

interface CacheState {
  latestAnime: Anime[];
  popularAnime: Anime[];
  newEpisodes: Anime[];
  movies: Anime[];
  mostPopular: Anime[];
  setLatestAnime: (anime: Anime[]) => void;
  setPopularAnime: (anime: Anime[]) => void;
  setNewEpisodes: (anime: Anime[]) => void;
  setMovies: (anime: Anime[]) => void;
  setMostPopular: (anime: Anime[]) => void;
  getAnimeBySection: (section: string) => Anime[];
}

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      latestAnime: [],
      popularAnime: [],
      newEpisodes: [],
      movies: [],
      mostPopular: [],
      setLatestAnime: (anime) => set({ latestAnime: anime }),
      setPopularAnime: (anime) => set({ popularAnime: anime }),
      setNewEpisodes: (anime) => set({ newEpisodes: anime }),
      setMovies: (anime) => set({ movies: anime }),
      setMostPopular: (anime) => set({ mostPopular: anime }),
      getAnimeBySection: (section) => {
        switch (section) {
          case "latest":
            return get().latestAnime;
          case "popular":
            return get().popularAnime;
          case "episodes":
            return get().newEpisodes;
          case "movies":
            return get().movies;
          case "most-popular":
            return get().mostPopular;
          default:
            return get().latestAnime;
        }
      },
    }),
    {
      name: "anime-cache",
    }
  )
);
