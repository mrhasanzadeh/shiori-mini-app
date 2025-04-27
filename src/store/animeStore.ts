import { create } from "zustand";
import { persist } from "zustand/middleware";

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

interface AnimeState {
  animeList: Anime[];
  favoriteAnime: number[];
  recentlyWatched: number[];
  addToFavorites: (animeId: number) => void;
  removeFromFavorites: (animeId: number) => void;
  addToRecentlyWatched: (animeId: number) => void;
  setAnimeList: (animeList: Anime[]) => void;
}

export const useAnimeStore = create<AnimeState>()(
  persist(
    (set) => ({
      animeList: [],
      favoriteAnime: [],
      recentlyWatched: [],
      addToFavorites: (animeId) =>
        set((state) => ({
          favoriteAnime: [...state.favoriteAnime, animeId],
        })),
      removeFromFavorites: (animeId) =>
        set((state) => ({
          favoriteAnime: state.favoriteAnime.filter((id) => id !== animeId),
        })),
      addToRecentlyWatched: (animeId) =>
        set((state) => ({
          recentlyWatched: [animeId, ...state.recentlyWatched.slice(0, 9)],
        })),
      setAnimeList: (animeList) => set({ animeList }),
    }),
    {
      name: "anime-storage",
    }
  )
);
