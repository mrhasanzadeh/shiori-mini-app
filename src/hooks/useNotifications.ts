import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTelegramApp } from './useTelegramApp'
import {
  getMyNotificationPreferences,
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  updateMyNotificationPreferences,
  type NotificationPreferences,
} from '../services/supabaseNotifications'
import { queryKeys } from './queries/keys'

export const useNotifications = () => {
  const { user, isReady } = useTelegramApp()
  const telegramUserId = user?.id
  const queryClient = useQueryClient()

  const enabled = isReady && typeof telegramUserId === 'number'

  const notificationsQuery = useQuery({
    queryKey: queryKeys.notifications(telegramUserId ?? 0),
    queryFn: getMyNotifications,
    enabled,
    staleTime: 20_000,
  })

  const preferencesQuery = useQuery({
    queryKey: queryKeys.notificationPreferences(telegramUserId ?? 0),
    queryFn: getMyNotificationPreferences,
    enabled,
    staleTime: 60_000,
  })

  const markReadMutation = useMutation({
    mutationFn: markMyNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(telegramUserId ?? 0) })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllMyNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(telegramUserId ?? 0) })
    },
  })

  const updatePreferencesMutation = useMutation({
    mutationFn: (prefs: Partial<NotificationPreferences>) => updateMyNotificationPreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences(telegramUserId ?? 0),
      })
    },
  })

  const notifications = notificationsQuery.data ?? []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return {
    notifications,
    unreadCount,
    preferences: preferencesQuery.data,
    isLoading: notificationsQuery.isLoading,
    preferencesLoading: preferencesQuery.isLoading,
    refetch: notificationsQuery.refetch,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    updatePreferences: updatePreferencesMutation.mutateAsync,
    updatingPreferences: updatePreferencesMutation.isPending,
  }
}
