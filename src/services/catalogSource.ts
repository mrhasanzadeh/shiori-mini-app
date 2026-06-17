import { isShioriApiEnabled } from '../lib/shioriApi'
import * as shiori from './shioriCatalog'

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

const loadSupabaseCatalog = () => import('./supabaseAnime')

export const getAllAnime = async () =>
  isShioriApiEnabled() ? shiori.getAllAnime() : (await loadSupabaseCatalog()).getAllAnime()

export const searchAnimeCards = async (params: import('./supabaseAnime').AnimeSearchParams) =>
  isShioriApiEnabled()
    ? shiori.searchAnimeCards(params)
    : (await loadSupabaseCatalog()).searchAnimeCards(params)

export const getSimilarAnimeCards = async (
  animeId: string | number,
  genreSlugs: string[],
  limit?: number
) =>
  isShioriApiEnabled()
    ? shiori.getSimilarAnimeCards(animeId, genreSlugs, limit)
    : (await loadSupabaseCatalog()).getSimilarAnimeCards(animeId, genreSlugs, limit)

export const getAnimeCardById = async (animeId: string | number) =>
  isShioriApiEnabled()
    ? shiori.getAnimeCardById(animeId)
    : (await loadSupabaseCatalog()).getAnimeCardById(animeId)

export const getLocalAnimeIdsByAniListIds = async (anilistIds: number[]) =>
  isShioriApiEnabled()
    ? shiori.getLocalAnimeIdsByAniListIds(anilistIds)
    : (await loadSupabaseCatalog()).getLocalAnimeIdsByAniListIds(anilistIds)

export const getAnimeCardsByStudioSlug = async (slug: string) =>
  isShioriApiEnabled()
    ? shiori.getAnimeCardsByStudioSlug(slug)
    : (await loadSupabaseCatalog()).getAnimeCardsByStudioSlug(slug)

export const getGenreBySlug = async (slug: string) =>
  isShioriApiEnabled()
    ? shiori.getGenreBySlug(slug)
    : (await loadSupabaseCatalog()).getGenreBySlug(slug)

export const getStudioBySlug = async (slug: string) =>
  isShioriApiEnabled()
    ? shiori.getStudioBySlug(slug)
    : (await loadSupabaseCatalog()).getStudioBySlug(slug)

export const getTranslatorBySlug = async (slug: string) =>
  isShioriApiEnabled()
    ? shiori.getTranslatorBySlug(slug)
    : (await loadSupabaseCatalog()).getTranslatorBySlug(slug)

export const getAnimeCardsByTranslatorSlug = async (slug: string) =>
  isShioriApiEnabled()
    ? shiori.getAnimeCardsByTranslatorSlug(slug)
    : (await loadSupabaseCatalog()).getAnimeCardsByTranslatorSlug(slug)

export const getTranslatorLinksByAnimeId = async (animeId: string | number) =>
  isShioriApiEnabled()
    ? shiori.getTranslatorLinksByAnimeId(animeId)
    : (await loadSupabaseCatalog()).getTranslatorLinksByAnimeId(animeId)

export { isShioriApiEnabled }
