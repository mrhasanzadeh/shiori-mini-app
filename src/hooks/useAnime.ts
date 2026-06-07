import { useEffect } from 'react'
import { useAnimeStore } from '../store/animeStore'
import { useAnimeListQuery } from './queries/useAnimeQueries'
import { useUserAnimeList } from './useUserAnimeList'

export const useAnime = () => {
  const { animeList, setAnimeList } = useAnimeStore()
  const userList = useUserAnimeList()

  const { data: listData, isLoading, error: queryError } = useAnimeListQuery()

  useEffect(() => {
    if (listData && listData.length > 0) {
      setAnimeList(listData)
    }
  }, [listData, setAnimeList])

  const loading = isLoading && animeList.length === 0
  const error = queryError ? 'خطا در بارگذاری لیست انیمه‌ها' : null

  return {
    animeList,
    loading,
    error,
    toggleFavorite: userList.toggleFavorite,
    isFavorite: userList.isFavorite,
    getProgress: userList.getProgress,
    saveProgress: userList.saveProgress,
    listStats: userList.stats,
    isSavingProgress: userList.isSaving,
  }
}
