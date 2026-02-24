import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GenreItem } from '../services/supabaseAnime'

export interface AnimeListItem {
  id: number | string
  title: string
  image: string
  description: string
  status: string
  genres: GenreItem[]
  episodes: number
  isNew: boolean
  episode: string
}

interface AnimeState {
  animeList: AnimeListItem[]
  favoriteAnime: (number | string)[]
  recentlyWatched: (number | string)[]
  addToFavorites: (animeId: number | string) => void
  removeFromFavorites: (animeId: number | string) => void
  addToRecentlyWatched: (animeId: number | string) => void
  setAnimeList: (animeList: AnimeListItem[]) => void
}

export const useAnimeStore = create<AnimeState>()(
  persist(
    (set) => ({
      animeList: [],
      favoriteAnime: [],
      recentlyWatched: [],
      addToFavorites: (animeId) =>
        set((state) => ({
          favoriteAnime: state.favoriteAnime.includes(animeId)
            ? state.favoriteAnime
            : [...state.favoriteAnime, animeId],
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
      name: 'anime-storage',
    }
  )
)
