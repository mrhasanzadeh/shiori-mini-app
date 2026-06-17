import { isShioriApiEnabled } from '../lib/shioriApi'
import * as shiori from './shioriNotifications'
import * as shioriUsers from './shioriUsers'
import * as shioriList from './shioriUserList'
import * as supaList from './supabaseUserList'
import * as supaNotif from './supabaseNotifications'
import * as supaUsers from './supabaseUsers'

export type {
  AnimeFavoriteCountMap,
  UserAnimeListRow,
  UserAnimeListStats,
} from './supabaseUserList'

export type {
  NotificationPreferences,
  UserNotificationRow,
} from './supabaseNotifications'

export type { TelegramUserPayload } from './supabaseUsers'

export { computeUserListStats, userAnimeListEntryKey } from './supabaseUserList'

export const getUserAnimeList = (telegramUserId: number) =>
  isShioriApiEnabled()
    ? shioriList.getUserAnimeList(telegramUserId)
    : supaList.getUserAnimeList(telegramUserId)

export const upsertUserAnimeListEntry = (
  telegramUserId: number,
  animeId: number | string,
  payload: Parameters<typeof supaList.upsertUserAnimeListEntry>[2]
) =>
  isShioriApiEnabled()
    ? shioriList.upsertUserAnimeListEntry(telegramUserId, animeId, payload)
    : supaList.upsertUserAnimeListEntry(telegramUserId, animeId, payload)

export const removeUserAnimeListEntry = (
  telegramUserId: number,
  animeId: number | string
) =>
  isShioriApiEnabled()
    ? shioriList.removeUserAnimeListEntry(telegramUserId, animeId)
    : supaList.removeUserAnimeListEntry(telegramUserId, animeId)

export const getAnimeFavoriteCounts = () =>
  isShioriApiEnabled() ? shioriList.getAnimeFavoriteCounts() : supaList.getAnimeFavoriteCounts()

export const getAnimeFavoriteCount = (animeId: number | string) =>
  isShioriApiEnabled()
    ? shioriList.getAnimeFavoriteCount(animeId)
    : supaList.getAnimeFavoriteCount(animeId)

export const registerTelegramUserVisit = (user: supaUsers.TelegramUserPayload) =>
  isShioriApiEnabled()
    ? shioriUsers.registerTelegramUserVisit(user)
    : supaUsers.registerTelegramUserVisit(user)

export const getMyNotifications = () =>
  isShioriApiEnabled() ? shiori.getMyNotifications() : supaNotif.getMyNotifications()

export const markMyNotificationRead = (id: string) =>
  isShioriApiEnabled() ? shiori.markMyNotificationRead(id) : supaNotif.markMyNotificationRead(id)

export const markAllMyNotificationsRead = () =>
  isShioriApiEnabled()
    ? shiori.markAllMyNotificationsRead()
    : supaNotif.markAllMyNotificationsRead()

export const getMyNotificationPreferences = () =>
  isShioriApiEnabled()
    ? shiori.getMyNotificationPreferences()
    : supaNotif.getMyNotificationPreferences()

export const updateMyNotificationPreferences = (
  prefs: Partial<supaNotif.NotificationPreferences>
) =>
  isShioriApiEnabled()
    ? shiori.updateMyNotificationPreferences(prefs)
    : supaNotif.updateMyNotificationPreferences(prefs)

export const debugTelegramInitStatus = supaList.debugTelegramInitStatus
