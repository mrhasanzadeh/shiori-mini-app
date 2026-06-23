import { shioriFetch } from '../lib/shioriApi'
import type {
  NotificationPreferences,
  UserNotificationRow,
} from '../types/notifications'

export const getMyNotifications = async (): Promise<UserNotificationRow[]> =>
  shioriFetch<UserNotificationRow[]>('/anime-notifications')

export const markMyNotificationRead = async (notificationId: string): Promise<void> => {
  await shioriFetch(`/anime-notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'POST',
  })
}

export const markAllMyNotificationsRead = async (): Promise<void> => {
  await shioriFetch('/anime-notifications/read-all', { method: 'POST' })
}

export const getMyNotificationPreferences = async (): Promise<NotificationPreferences> =>
  shioriFetch<NotificationPreferences>('/anime-notifications/preferences')

export const updateMyNotificationPreferences = async (
  prefs: Partial<NotificationPreferences>
): Promise<void> => {
  await shioriFetch('/anime-notifications/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  })
}
