import { Link } from 'react-router-dom'
import { AlarmClockIcon } from 'hugeicons-react'
import {
  formatNotificationTime,
  useNotificationsStore,
} from '../store/notificationsStore'

const Notifications = () => {
  const { notifications, markAllRead, markRead } = useNotificationsStore()
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="px-4 py-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <AlarmClockIcon className="w-6 h-6 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">اعلان‌ها</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                جدید
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <button
              onClick={markAllRead}
              className="text-primary-500 text-sm hover:text-primary-400 transition-colors"
            >
              خواندن همه
            </button>
          )}
        </div>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3 p-4">
          {notifications.map((notification) => {
            const inner = (
              <>
                <div className="flex-1 min-w-0 mt-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{notification.title}</h3>
                    {!notification.isRead && (
                      <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                        جدید
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">{notification.message}</p>
                  <span className="text-muted-foreground text-xs mt-2 block">
                    {formatNotificationTime(notification.createdAt)}
                  </span>
                </div>
              </>
            )

            return notification.href ? (
              <Link
                key={notification.id}
                to={notification.href}
                onClick={() => markRead(notification.id)}
                className={`flex bg-card gap-4 p-3 rounded-lg border border-border ${!notification.isRead ? 'ring-1 ring-primary-500/20' : ''}`}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => markRead(notification.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') markRead(notification.id)
                }}
                className={`flex bg-card gap-4 p-3 rounded-lg border border-border cursor-pointer ${!notification.isRead ? 'ring-1 ring-primary-500/20' : ''}`}
              >
                {inner}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[55vh] text-muted-foreground px-6 text-center gap-2">
          <AlarmClockIcon className="w-12 h-12 mb-2" />
          <p className="text-foreground font-medium">اعلانی وجود ندارد</p>
          <p className="text-sm leading-6">
            وقتی اعلان جدیدی منتشر شود اینجا نمایش داده می‌شود.
          </p>
        </div>
      )}
    </div>
  )
}

export default Notifications
