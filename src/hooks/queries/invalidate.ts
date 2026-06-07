import { queryClient } from '../../lib/queryClient'
import { invalidateAnimeCache } from '../../utils/api'
import { queryKeys } from './keys'

/** بعد از ویرایش انیمه در پنل ادمین صدا بزن */
export const invalidateAnimeQueries = () => {
  invalidateAnimeCache()
  queryClient.invalidateQueries({ queryKey: queryKeys.animeCards })
  queryClient.invalidateQueries({ queryKey: queryKeys.animeList })
  queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
  queryClient.invalidateQueries({ queryKey: queryKeys.adminAnimeList })
  queryClient.invalidateQueries({ queryKey: ['anime', 'detail'] })
  queryClient.invalidateQueries({ queryKey: ['anime', 'search'] })
}

export const invalidateAnimeDetailQuery = (animeId: string | number) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.animeDetail(animeId) })
}
