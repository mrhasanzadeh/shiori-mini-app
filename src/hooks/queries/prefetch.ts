import { queryClient } from '../../lib/queryClient'
import { fetchAnimeById, fetchSimilarAnime } from '../../utils/api'
import { queryKeys } from './keys'

/** پیش‌بارگذاری جزئیات انیمه (مثلاً قبل از کلیک روی کارت) */
export const prefetchAnimeDetail = (id: string | number) => {
  void queryClient.prefetchQuery({
    queryKey: queryKeys.animeDetail(id),
    queryFn: () => fetchAnimeById(id),
  })
}

/** پیش‌بارگذاری آثار مشابه (هنگام فعال شدن تب) */
export const prefetchSimilarAnime = (
  animeId: string | number,
  genreSlugs: string[],
  limit = 12
) => {
  if (!genreSlugs.length) return
  void queryClient.prefetchQuery({
    queryKey: queryKeys.similarAnime(animeId, genreSlugs),
    queryFn: () => fetchSimilarAnime(animeId, genreSlugs, limit),
  })
}
