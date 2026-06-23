import { useMemo, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import AnimePrefetchLink from '../components/AnimePrefetchLink'
import { BidiText } from '../components/BidiText'
import { Calendar01Icon, Alert02Icon } from 'hugeicons-react'
import type { GenreItem } from '../types/catalog'
import { Button } from '@/components/ui/button'
import { useScheduleQuery } from '../hooks/queries/useAnimeQueries'
import { animeDetailPath } from '../lib/animePaths'
import shioriLogo from '../assets/images/shiori-logo.svg'

type Anime = {
  id: number
  localId?: string | number | null
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

  const { data, isLoading, isError, refetch } = useScheduleQuery()
  const [activeDay, setActiveDay] = useState<PersianDay>(getCurrentPersianDay())
  const [toast, setToast] = useState<string | null>(null)
  const [toastClosing, setToastClosing] = useState(false)

  const dismissToast = () => {
    setToastClosing(true)
    window.setTimeout(() => {
      setToast(null)
      setToastClosing(false)
    }, 220)
  }

  const scheduleInfo = data as ScheduleInfo | undefined
  const currentSeason = scheduleInfo?.currentSeason ?? ''
  const currentYear = scheduleInfo?.currentYear ?? 0

  const schedule = useMemo(() => {
    const nextSchedule = { ...EMPTY_SCHEDULE }
    if (scheduleInfo?.schedule) {
      for (const day of PERSIAN_DAYS) {
        nextSchedule[day] = scheduleInfo.schedule[day] ?? []
      }
    }
    return nextSchedule
  }, [scheduleInfo])

  const error = isError ? 'خطا در بارگذاری برنامه پخش' : null
  const loading = isLoading && !scheduleInfo

  const activeList = useMemo(
    () => filterScheduleList(schedule[activeDay] ?? []),
    [schedule, activeDay]
  )

  const handleAnimeClick = (e: MouseEvent<HTMLAnchorElement>, anime: Anime) => {
    e.preventDefault()

    if (anime.localId) {
      navigate(animeDetailPath({ id: anime.localId }))
      return
    }

    setToast('این انیمه در لیست ترجمه‌ی شیوری نیست یا فعلاً امکان ترجمه‌ی آن وجود ندارد.')
  }

  if (loading) return <ScheduleSkeleton />

  if (error) {
    return (
      <div className="px-4 py-16 text-center space-y-3 pb-24">
        <p className="text-red-500 text-sm">{error}</p>
        <Button type="button" variant="secondary" onClick={() => refetch()}>
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
              className="shrink-0 border-red-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-50"
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
            <AnimePrefetchLink
              key={anime.id}
              animeId={anime.localId ?? anime.id}
              to={anime.localId ? animeDetailPath({ id: anime.localId }) : '#'}
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

                {anime.localId ? (
                  <span
                    className="absolute top-1.5 start-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-rose-500 shadow-sm"
                    title="ترجمه شیوری"
                    aria-label="موجود در کاتالوگ شیوری"
                  >
                    <img src={shioriLogo} alt="" className="h-3.5 w-3.5 object-contain" />
                  </span>
                ) : null}

                <div className="absolute left-0 bottom-0 p-2 pt-10">
                  <BidiText
                    as="h3"
                    className="text-xs text-left font-semibold text-white line-clamp-2 drop-shadow-sm"
                  >
                    {anime.title}
                  </BidiText>
                  <p className="text-[11px] text-white/75 mt-0.5 text-left">
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
            </AnimePrefetchLink>
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
