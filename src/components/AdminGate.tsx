import { ReactNode, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTelegramApp } from '../hooks/useTelegramApp'

type Props = {
  children: ReactNode
}

const parseAllowedIds = (value: unknown): Set<number> => {
  const raw = typeof value === 'string' ? value : ''
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const ids = new Set<number>()
  for (const p of parts) {
    const n = Number(p)
    if (Number.isFinite(n)) ids.add(n)
  }
  return ids
}

const AdminGate = ({ children }: Props) => {
  const { user, isReady } = useTelegramApp()
  const [pw, setPw] = useState('')
  const [pwError, setPwError] = useState<string | null>(null)

  const allowedIds = useMemo(() => parseAllowedIds(import.meta.env.VITE_ADMIN_TELEGRAM_IDS), [])

  const webPassword = String(import.meta.env.VITE_ADMIN_WEB_PASSWORD ?? '').trim()
  const webAuthed = useMemo(() => {
    try {
      return localStorage.getItem('admin_web_authed') === '1'
    } catch {
      return false
    }
  }, [])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    )
  }

  const userId = user?.id
  const isAllowedTelegram = typeof userId === 'number' && allowedIds.has(userId)
  const isAllowedWeb = !userId && webPassword.length > 0 && webAuthed

  const isAllowed = isAllowedTelegram || isAllowedWeb

  if (!isAllowed) {
    if (!userId && webPassword.length > 0) {
      return (
        <div className="px-4 pt-6 pb-28">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <h1 className="text-white text-lg font-semibold">ورود ادمین (تست وب)</h1>
            <p className="text-gray-300 text-sm mt-2 leading-6">
              برای تست داخل مرورگر، پسورد ادمین را وارد کن.
            </p>
            <div className="mt-4">
              <input
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value)
                  setPwError(null)
                }}
                type="password"
                placeholder="پسورد"
                className="w-full px-3 py-2 rounded-xl bg-gray-950/40 border border-white/10 text-white placeholder:text-gray-500"
              />
              {pwError && <div className="text-red-400 text-xs mt-2">{pwError}</div>}
              <button
                type="button"
                className="w-full mt-3 px-4 py-2 rounded-xl bg-primary-500 text-white text-sm"
                onClick={() => {
                  if (pw.trim() !== webPassword) {
                    setPwError('پسورد اشتباه است')
                    return
                  }
                  try {
                    localStorage.setItem('admin_web_authed', '1')
                    window.location.reload()
                  } catch {
                    setPwError('مرورگر اجازه ذخیره‌سازی نمی‌دهد')
                  }
                }}
              >
                ورود
              </button>
            </div>
            <div className="mt-4">
              <Link
                to="/"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 text-white"
              >
                بازگشت به خانه
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="px-4 pt-6 pb-28">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h1 className="text-white text-lg font-semibold">دسترسی غیرمجاز</h1>
          <p className="text-gray-300 text-sm mt-2 leading-6">این بخش فقط برای ادمین فعال است.</p>
          <p className="text-gray-400 text-xs mt-3">Telegram ID: {String(userId ?? 'نامشخص')}</p>
          <div className="mt-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 text-white"
            >
              بازگشت به خانه
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default AdminGate
