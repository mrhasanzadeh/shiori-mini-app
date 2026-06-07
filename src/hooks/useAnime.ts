import { useEffect } from 'react'
import { useAnimeStore } from '../store/animeStore'
import { useAnimeListQuery } from './queries/useAnimeQueries'

export const useAnime = () => {
  const { animeList, setAnimeList, favoriteAnime, addToFavorites, removeFromFavorites } =
    useAnimeStore()

  const { data: listData, isLoading, error: queryError } = useAnimeListQuery()

  useEffect(() => {
    if (listData && listData.length > 0) {
      setAnimeList(listData)
    }
  }, [listData, setAnimeList])

  const loading = isLoading && animeList.length === 0
  const error = queryError
    ? 'خطا در بارگذاری لیست انیمه‌ها'
    : null

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

  return {
    animeList,
    loading,
    error,
    toggleFavorite,
    isFavorite,
  }
}
