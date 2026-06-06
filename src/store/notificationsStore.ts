import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppNotification = {
  id: string
  title: string
  message: string
  createdAt: string
  isRead: boolean
  href?: string
}

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

export const SAMPLE_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'sample-episode',
    title: 'قسمت جدید منتشر شد',
    message: 'قسمت ۱۲ انیمه «Frieren» امروز پخش می‌شود.',
    createdAt: hoursAgo(2),
    isRead: false,
    href: '/schedule',
  },
  {
    id: 'sample-favorite',
    title: 'به‌روزرسانی علاقه‌مندی',
    message: 'زیرنویس قسمت ۱۱ انیمه «Demon Slayer» اضافه شد.',
    createdAt: hoursAgo(8),
    isRead: false,
    href: '/my-list',
  },
  {
    id: 'sample-welcome',
    title: 'به شیوری خوش آمدی',
    message: 'انیمه‌ها را ذخیره کن و برنامه پخش هفتگی را از منوی پایین دنبال کن.',
    createdAt: daysAgo(2),
    isRead: true,
  },
]

interface NotificationsState {
  notifications: AppNotification[]
  unreadCount: () => number
  markAllRead: () => void
  markRead: (id: string) => void
  addNotification: (payload: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) => void
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
      markAllRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        })),
      markRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        })),
      addNotification: (payload) =>
        set((state) => ({
          notifications: [
            {
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              createdAt: new Date().toISOString(),
              isRead: false,
              ...payload,
            },
            ...state.notifications,
          ].slice(0, 50),
        })),
    }),
    {
      name: 'notifications-storage',
      merge: (persisted, current) => {
        const saved = persisted as Partial<NotificationsState> | undefined
        const notifications =
          saved?.notifications && saved.notifications.length > 0
            ? saved.notifications
            : SAMPLE_NOTIFICATIONS
        return { ...current, ...saved, notifications }
      },
    }
  )
)

export const formatNotificationTime = (iso: string): string => {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMin = Math.floor((now - then) / 60_000)
  if (diffMin < 1) return 'همین الان'
  if (diffMin < 60) return `${diffMin} دقیقه پیش`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} ساعت پیش`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} روز پیش`
}
