import { isShioriApiEnabled } from '../lib/shioriApi'
import * as shiori from './shioriNotifications'
import * as shioriUsers from './shioriUsers'
import * as shioriList from './shioriUserList'

export type {
  AnimeFavoriteCountMap,
  UserAnimeListRow,
  UserAnimeListStats,
} from '../utils/userListStats'

export type {
  NotificationPreferences,
  UserNotificationRow,
} from './supabaseNotifications'

export type { TelegramUserPayload } from './supabaseUsers'

export {
  computeUserListStats,
  userAnimeListEntryKey,
} from '../utils/userListStats'

const loadSupabaseUserList = () => import('./supabaseUserList')
const loadSupabaseNotifications = () => import('./supabaseNotifications')
const loadSupabaseUsers = () => import('./supabaseUsers')

export const getUserAnimeList = async (telegramUserId: number) =>
  isShioriApiEnabled()
    ? shioriList.getUserAnimeList(telegramUserId)
    : (await loadSupabaseUserList()).getUserAnimeList(telegramUserId)

export const upsertUserAnimeListEntry = async (
  telegramUserId: number,
  animeId: number | string,
  payload: Parameters<
    Awaited<ReturnType<typeof loadSupabaseUserList>>['upsertUserAnimeListEntry']
  >[2]
) =>
  isShioriApiEnabled()
    ? shioriList.upsertUserAnimeListEntry(telegramUserId, animeId, payload)
    : (await loadSupabaseUserList()).upsertUserAnimeListEntry(
        telegramUserId,
        animeId,
        payload
      )

export const removeUserAnimeListEntry = async (
  telegramUserId: number,
  animeId: number | string
) =>
  isShioriApiEnabled()
    ? shioriList.removeUserAnimeListEntry(telegramUserId, animeId)
    : (await loadSupabaseUserList()).removeUserAnimeListEntry(telegramUserId, animeId)

export const getAnimeFavoriteCounts = async () =>
  isShioriApiEnabled()
    ? shioriList.getAnimeFavoriteCounts()
    : (await loadSupabaseUserList()).getAnimeFavoriteCounts()

export const getAnimeFavoriteCount = async (animeId: number | string) =>
  isShioriApiEnabled()
    ? shioriList.getAnimeFavoriteCount(animeId)
    : (await loadSupabaseUserList()).getAnimeFavoriteCount(animeId)

export const registerTelegramUserVisit = async (
  user: import('./supabaseUsers').TelegramUserPayload
) =>
  isShioriApiEnabled()
    ? shioriUsers.registerTelegramUserVisit(user)
    : (await loadSupabaseUsers()).registerTelegramUserVisit(user)

export const getMyNotifications = async () =>
  isShioriApiEnabled()
    ? shiori.getMyNotifications()
    : (await loadSupabaseNotifications()).getMyNotifications()

export const markMyNotificationRead = async (id: string) =>
  isShioriApiEnabled()
    ? shiori.markMyNotificationRead(id)
    : (await loadSupabaseNotifications()).markMyNotificationRead(id)

export const markAllMyNotificationsRead = async () =>
  isShioriApiEnabled()
    ? shiori.markAllMyNotificationsRead()
    : (await loadSupabaseNotifications()).markAllMyNotificationsRead()

export const getMyNotificationPreferences = async () =>
  isShioriApiEnabled()
    ? shiori.getMyNotificationPreferences()
    : (await loadSupabaseNotifications()).getMyNotificationPreferences()

export const updateMyNotificationPreferences = async (
  prefs: Partial<import('./supabaseNotifications').NotificationPreferences>
) =>
  isShioriApiEnabled()
    ? shiori.updateMyNotificationPreferences(prefs)
    : (await loadSupabaseNotifications()).updateMyNotificationPreferences(prefs)

export const debugTelegramInitStatus = async () =>
  (await loadSupabaseUserList()).debugTelegramInitStatus()
