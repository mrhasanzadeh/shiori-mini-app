import { useEffect, useState } from 'react'
import { useAnimeStore } from '../store/animeStore'
import { fetchAnimeList, fetchAnimeById } from '../utils/api'
import type { GenreItem } from '../services/supabaseAnime'

interface Episode {
  id: string | number
  season_number?: number
  number: number
  title: string
  download_link?: string
}

interface AnimeDetails {
  id: number | string
  title: string
  image: string
  featured_image: string
  description: string
  status: string
  genres: GenreItem[]
  episodes: Episode[]
  episodes_count?: number
  studios: string[]
  producers: string[]
  season: string
  startDate: string
  endDate: string
}

export const useAnime = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { animeList, setAnimeList, favoriteAnime, addToFavorites, removeFromFavorites } =
    useAnimeStore()

  const loadAnimeList = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAnimeList()
      setAnimeList(data)
    } catch (err) {
      setError('خطا در بارگذاری لیست انیمه‌ها')
      console.error('Failed to load anime list:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAnimeById = async (id: number | string): Promise<AnimeDetails | null> => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAnimeById(id)
      return data as unknown as AnimeDetails
    } catch (err) {
      setError('خطا در بارگذاری اطلاعات انیمه')
      console.error('Failed to load anime:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (animeId: number | string) => {
    if (favoriteAnime.includes(animeId)) {
      removeFromFavorites(animeId)
    } else {
      addToFavorites(animeId)
    }
  }

  const isFavorite = (animeId: number | string) => {
    return favoriteAnime.includes(animeId)
  }

  useEffect(() => {
    if (animeList.length === 0) {
      loadAnimeList()
    }
  }, [])

  return {
    animeList,
    loading,
    error,
    loadAnimeList,
    loadAnimeById,
    toggleFavorite,
    isFavorite,
  }
}
