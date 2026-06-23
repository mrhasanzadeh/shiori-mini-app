export type UserNotificationRow = {
  id: string
  kind: string
  title: string
  message: string
  href: string | null
  anime_id: string | null
  episode_number: number | null
  is_read: boolean
  created_at: string
}

export type NotificationPreferences = {
  notify_new_episode: boolean
  notify_telegram_dm: boolean
}
