import { isShioriApiEnabled } from '../lib/shioriApi'
import * as shiori from './shioriCatalog'
import * as supa from './supabaseAnime'

export type {
  AnimeCard,
  AnimeSearchParams,
  AnimeSearchResult,
  GenreAdminItem,
  GenreItem,
  StudioPublicItem,
  TranslatorAnimeLink,
  TranslatorItem,
} from './supabaseAnime'

export const getAllAnime = () =>
  isShioriApiEnabled() ? shiori.getAllAnime() : supa.getAllAnime()

export const searchAnimeCards = (params: supa.AnimeSearchParams) =>
  isShioriApiEnabled() ? shiori.searchAnimeCards(params) : supa.searchAnimeCards(params)

export const getSimilarAnimeCards = (
  animeId: string | number,
  genreSlugs: string[],
  limit?: number
) =>
  isShioriApiEnabled()
    ? shiori.getSimilarAnimeCards(animeId, genreSlugs, limit)
    : supa.getSimilarAnimeCards(animeId, genreSlugs, limit)

export const getAnimeCardById = (animeId: string | number) =>
  isShioriApiEnabled() ? shiori.getAnimeCardById(animeId) : supa.getAnimeCardById(animeId)

export const getLocalAnimeIdsByAniListIds = (anilistIds: number[]) =>
  isShioriApiEnabled()
    ? shiori.getLocalAnimeIdsByAniListIds(anilistIds)
    : supa.getLocalAnimeIdsByAniListIds(anilistIds)

export const getAnimeCardsByStudioSlug = (slug: string) =>
  isShioriApiEnabled() ? shiori.getAnimeCardsByStudioSlug(slug) : supa.getAnimeCardsByStudioSlug(slug)

export const getGenreBySlug = (slug: string) =>
  isShioriApiEnabled() ? shiori.getGenreBySlug(slug) : supa.getGenreBySlug(slug)

export const getStudioBySlug = (slug: string) =>
  isShioriApiEnabled() ? shiori.getStudioBySlug(slug) : supa.getStudioBySlug(slug)

export const getTranslatorBySlug = (slug: string) =>
  isShioriApiEnabled() ? shiori.getTranslatorBySlug(slug) : supa.getTranslatorBySlug(slug)

export const getAnimeCardsByTranslatorSlug = (slug: string) =>
  isShioriApiEnabled()
    ? shiori.getAnimeCardsByTranslatorSlug(slug)
    : supa.getAnimeCardsByTranslatorSlug(slug)

export const getTranslatorLinksByAnimeId = (animeId: string | number) =>
  isShioriApiEnabled()
    ? shiori.getTranslatorLinksByAnimeId(animeId)
    : supa.getTranslatorLinksByAnimeId(animeId)

export { isShioriApiEnabled }
