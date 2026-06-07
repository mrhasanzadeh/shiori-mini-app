import { queryClient } from '../../lib/queryClient'
import { fetchAnimeById } from '../../utils/api'
import { queryKeys } from './keys'

/** پیش‌بارگذاری جزئیات انیمه (مثلاً قبل از کلیک روی کارت) */
export const prefetchAnimeDetail = (id: string | number) => {
  void queryClient.prefetchQuery({
    queryKey: queryKeys.animeDetail(id),
    queryFn: () => fetchAnimeById(id),
  })
}
