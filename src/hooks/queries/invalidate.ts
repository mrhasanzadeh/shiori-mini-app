import { queryClient } from '../../lib/queryClient'
import { invalidateAnimeCache } from '../../utils/api'
import { queryKeys } from './keys'

/** Invalidate catalog queries after backend data changes */
export const invalidateAnimeQueries = () => {
  invalidateAnimeCache()
  queryClient.invalidateQueries({ queryKey: queryKeys.animeCards })
  queryClient.invalidateQueries({ queryKey: queryKeys.animeList })
  queryClient.invalidateQueries({ queryKey: queryKeys.schedule })
  queryClient.invalidateQueries({ queryKey: ['anime', 'detail'] })
  queryClient.invalidateQueries({ queryKey: ['anime', 'search'] })
}

export const invalidateAnimeDetailQuery = (animeId: string | number) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.animeDetail(animeId) })
}
