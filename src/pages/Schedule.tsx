import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar01Icon, Alert02Icon } from 'hugeicons-react'
import { fetchSchedule } from '../utils/api'
import * as supa from '../services/supabaseAnime'
import type { GenreItem } from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'

type Anime = {
  id: number
  title: string
  image: string
  episode: string
  genres?: GenreItem[]
  time?: string
}

type ScheduleInfo = {
  schedule: Record<string, Anime[]>
  currentSeason: string
  currentYear: number
}

type PersianDay = 'شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه' | 'پنج‌شنبه' | 'جمعه'

const PERSIAN_DAYS: PersianDay[] = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
]

const DAY_SHORT: Record<PersianDay, string> = {
  شنبه: 'ش',
  یکشنبه: 'ی',
  دوشنبه: 'د',
  سه‌شنبه: 'س',
  چهارشنبه: 'چ',
  پنج‌شنبه: 'پ',
  جمعه: 'ج',
}

const EMPTY_SCHEDULE: Record<PersianDay, Anime[]> = {
  شنبه: [],
  یکشنبه: [],
  دوشنبه: [],
  سه‌شنبه: [],
  چهارشنبه: [],
  پنج‌شنبه: [],
  جمعه: [],
}

const getCurrentPersianDay = (): PersianDay => {
  const dayMap: Record<number, PersianDay> = {
    0: 'یکشنبه',
    1: 'دوشنبه',
    2: 'سه‌شنبه',
    3: 'چهارشنبه',
    4: 'پنج‌شنبه',
    5: 'جمعه',
    6: 'شنبه',
  }
  return dayMap[new Date().getDay()]
}

const translateSeason = (season: string): string => {
  switch (season) {
    case 'WINTER':
      return 'زمستان'
    case 'SPRING':
      return 'بهار'
    case 'SUMMER':
      return 'تابستان'
    case 'FALL':
      return 'پاییز'
    default:
      return season
  }
}

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

const filterScheduleList = (list: Anime[]): Anime[] =>
  list.filter((anime) => {
    const genres = anime.genres || []
    return !genres.some((g) => String(g.slug).toLowerCase() === 'hentai')
  })

const ScheduleSkeleton = () => (
  <div className="pb-24 animate-pulse">
    <div className="px-4 pt-4 flex items-center justify-between gap-3">
      <div className="h-6 w-28 bg-muted rounded" />
      <div className="h-5 w-32 bg-muted rounded" />
    </div>
    <div className="px-4 pt-3 flex justify-between gap-1">
      {PERSIAN_DAYS.map((day) => (
        <div key={day} className="flex-1 flex justify-center">
          <div className="w-10 h-10 rounded-full bg-muted" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-3 px-4 pt-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] rounded-2xl bg-muted" />
      ))}
    </div>
  </div>
)

const Schedule = () => {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<PersianDay>(getCurrentPersianDay())
  const [currentSeason, setCurrentSeason] = useState('')
  const [currentYear, setCurrentYear] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [toastClosing, setToastClosing] = useState(false)

  const dismissToast = () => {
    setToastClosing(true)
    window.setTimeout(() => {
      setToast(null)
      setToastClosing(false)
    }, 220)
  }
  const [schedule, setSchedule] = useState<Record<PersianDay, Anime[]>>(EMPTY_SCHEDULE)

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = (await fetchSchedule()) as ScheduleInfo

      const nextSchedule = { ...EMPTY_SCHEDULE }
      for (const day of PERSIAN_DAYS) {
        nextSchedule[day] = data.schedule?.[day] ?? []
      }

      setSchedule(nextSchedule)
      setCurrentSeason(data.currentSeason ?? '')
      setCurrentYear(data.currentYear ?? 0)
      setActiveDay(getCurrentPersianDay())
    } catch (err) {
      setError('خطا در بارگذاری برنامه پخش')
      console.error('Failed to load schedule:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSchedule()
  }, [loadSchedule])

  const activeList = useMemo(
    () => filterScheduleList(schedule[activeDay] ?? []),
    [schedule, activeDay]
  )

  const handleAnimeClick = (e: MouseEvent<HTMLAnchorElement>, anime: Anime) => {
    const rawId = String(anime.id)
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)
    const isNumeric = /^[0-9]+$/.test(rawId)

    if (isUuid || !isNumeric) return

    e.preventDefault()
    supa
      .getLocalAnimeIdByAniListId(Number(rawId))
      .then((localId) => {
        if (localId) navigate(`/anime/${localId}`)
        else setToast('این انیمه در کاتالوگ شیوری نیست یا فعلاً امکان ترجمه‌ی آن وجود ندارد.')
      })
      .catch(() => setToast('این انیمه در کاتالوگ شیوری نیست یا فعلاً امکان ترجمه‌ی آن وجود ندارد.'))
  }

  if (loading) return <ScheduleSkeleton />

  if (error) {
    return (
      <div className="px-4 py-16 text-center space-y-3 pb-24">
        <p className="text-red-500 text-sm">{error}</p>
        <Button type="button" variant="secondary" onClick={loadSchedule}>
          تلاش مجدد
        </Button>
      </div>
    )
  }

  const seasonLabel =
    currentSeason && currentYear
      ? `فصل ${translateSeason(currentSeason)} ${toPersianNumber(currentYear)}`
      : null

  return (
    <div className="pb-24">
      {toast && (
        <div className="fixed bottom-32 left-0 right-0 z-[60] px-4">
          <div
            role="alert"
            key={toast}
            className={`max-w-xl mx-auto rounded-xl border border-red-800/80 bg-red-500/20 backdrop-blur-md px-4 py-3 flex items-start gap-3 shadow-xl ${
              toastClosing ? 'schedule-toast-exit' : 'schedule-toast-enter'
            }`}
          >
            <Alert02Icon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-5 text-amber-50 flex-1">{toast}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 rounded-sm border-red-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-50"
              onClick={dismissToast}
            >
              بستن
            </Button>
          </div>
        </div>
      )}

      <div className="px-4 pt-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-foreground shrink-0">برنامه پخش هفتگی</h1>
        {seasonLabel && (
          <p className="text-sm text-white/90 font-medium">{seasonLabel}</p>
        )}
      </div>

      {/* Day picker */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between gap-1">
          {PERSIAN_DAYS.map((day) => {
            const isActive = activeDay === day

            return (
              <button
                key={day}
                type="button"
                title={day}
                onClick={() => setActiveDay(day)}
                className="flex-1 flex justify-center py-1"
              >
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-400/35'
                      : 'bg-muted/80 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {DAY_SHORT[day]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content header */}
      <div className="px-4 pt-4 pb-2 flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-foreground">{activeDay}</h2>
        <span className="text-xs text-muted-foreground">
          {activeList.length > 0
            ? `${toPersianNumber(activeList.length)} عنوان`
            : 'خالی'}
        </span>
      </div>

      {activeList.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 px-4">
          {activeList.map((anime) => (
            <Link
              key={anime.id}
              to={`/anime/${anime.id}`}
              onClick={(e) => handleAnimeClick(e, anime)}
              className="group block active:scale-[0.98] transition-transform"
            >
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
                <img
                  src={anime.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-2 pt-10">
                  <h3 className="text-xs font-semibold text-white line-clamp-3 drop-shadow-sm">
                    {anime.title}
                  </h3>
                  <p className="text-[11px] text-white/75 mt-0.5">
                    {anime.time ? (
                      <>
                        <span>{anime.time}</span>
                        <span className="mx-1.5 opacity-50">|</span>
                      </>
                    ) : null}
                    <span className="text-white/90 font-medium">قسمت {toPersianNumber(anime.episode)}</span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mx-4 mt-2 rounded-2xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Calendar01Icon className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">روز خالی</p>
          <p className="text-xs text-muted-foreground mt-2 leading-6 max-w-[240px]">
            {activeDay} انیمه‌ای در برنامه پخش این فصل ثبت نشده.
          </p>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/70 text-center px-6 pt-6 leading-5">
        داده از AniList · فقط عناوین موجود در شیوری قابل باز شدن هستند
      </p>
    </div>
  )
}

export default Schedule
