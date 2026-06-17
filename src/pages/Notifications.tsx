import { Link } from 'react-router-dom'
import { AlarmClockIcon } from 'hugeicons-react'
import { BidiText } from '../components/BidiText'
import { useNotifications } from '../hooks/useNotifications'
import { formatNotificationTime } from '../utils/notificationTime'

const Notifications = () => {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications()

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
              onClick={() => void markAllRead()}
              className="text-primary-500 text-sm hover:text-primary-400 transition-colors"
            >
              خواندن همه
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted" />
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3 p-4">
          {notifications.map((notification) => {
            const inner = (
              <>
                <div className="flex-1 min-w-0 mt-1">
                  <div className="flex items-center gap-2">
                    <BidiText as="h3" mode="auto" className="font-medium text-foreground">
                      {notification.title}
                    </BidiText>
                    {!notification.is_read && (
                      <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                        جدید
                      </span>
                    )}
                  </div>
                  <BidiText as="p" mode="auto" className="text-muted-foreground text-sm mt-1">
                    {notification.message}
                  </BidiText>
                  <span className="text-muted-foreground text-xs mt-2 block">
                    {formatNotificationTime(notification.created_at)}
                  </span>
                </div>
              </>
            )

            const onOpen = () => {
              if (!notification.is_read) {
                void markRead(notification.id)
              }
            }

            return notification.href ? (
              <Link
                key={notification.id}
                to={notification.href}
                onClick={onOpen}
                className={`flex bg-card gap-4 p-3 rounded-lg border border-border ${!notification.is_read ? 'ring-1 ring-primary-500/20' : ''}`}
              >
                {inner}
              </Link>
            ) : (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={onOpen}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen()
                }}
                className={`flex bg-card gap-4 p-3 rounded-lg border border-border cursor-pointer ${!notification.is_read ? 'ring-1 ring-primary-500/20' : ''}`}
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
            وقتی قسمت جدید انیمه‌ای از لیستت منتشر شود اینجا نمایش داده می‌شود.
          </p>
        </div>
      )}
    </div>
  )
}

export default Notifications
