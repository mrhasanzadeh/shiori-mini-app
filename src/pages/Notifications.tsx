import { useState } from 'react'
import { BellIcon } from '@heroicons/react/24/outline'

interface Notification {
  id: number
  title: string
  message: string
  time: string
  isRead: boolean
}

const Notifications = () => {
  const [hasNewNotifications, setHasNewNotifications] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: 'قسمت جدید',
      message: 'قسمت جدید انیمه Demon Slayer منتشر شد',
      time: '۵ دقیقه پیش',
      isRead: false
    },
    {
      id: 2,
      title: 'به‌روزرسانی برنامه',
      message: 'نسخه جدید شیوری منتشر شد',
      time: '۱ ساعت پیش',
      isRead: false
    },
    {
      id: 3,
      title: 'یادآوری',
      message: 'انیمه مورد علاقه شما امروز پخش می‌شود',
      time: '۲ ساعت پیش',
      isRead: true
    }
  ])

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({
        ...notification,
        isRead: true
      }))
    )
    setHasNewNotifications(false)
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur-sm">
        <div className="px-4 py-4 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2">
            <BellIcon className="w-6 h-6 text-stone-400" />
            <h1 className="text-lg font-semibold text-white">اعلان‌ها</h1>
            {hasNewNotifications && (
              <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                جدید
              </span>
            )}
          </div>
          <button
            onClick={markAllAsRead}
            className="text-primary-500 text-sm hover:text-primary-400 transition-colors"
          >
            خواندن همه
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3 p-4">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`flex bg-stone-900 gap-4 p-3 rounded-lg ${!notification.isRead ? 'ring-1 ring-primary-500/20' : ''}`}
          >
            <div className="flex-1 min-w-0 mt-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-stone-100">{notification.title}</h3>
                {!notification.isRead && (
                  <span className="px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full">
                    جدید
                  </span>
                )}
              </div>
              <p className="text-stone-400 text-sm mt-1">{notification.message}</p>
              <span className="text-stone-500 text-xs mt-2 block">{notification.time}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-stone-400">
          <BellIcon className="w-12 h-12 mb-2" />
          <p>اعلانی وجود ندارد</p>
        </div>
      )}
    </div>
  )
}

export default Notifications 