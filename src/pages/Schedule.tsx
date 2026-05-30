import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchSchedule } from '../utils/api'
import * as supa from '../services/supabaseAnime'
import type { GenreItem } from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'

type Anime = {
  id: number
  title: string
  image: string
  episode: string
  isNew?: boolean
  description?: string
  genres?: GenreItem[]
  time?: string
}

type ScheduleInfo = {
  schedule: Record<string, Anime[]>
  currentSeason: string
  currentYear: number
}

// با استفاده از یک type برای نمایش آیتم‌های قابل نمایش در Schedule
type ScheduleAnimeItem = Anime & {
  airingAt: number
}

// ساختار داده برای برنامه هر روز
type ScheduleData = {
  [key: string]: ScheduleAnimeItem[]
}

// روزهای هفته به فارسی
type PersianDay = 'شنبه' | 'یکشنبه' | 'دوشنبه' | 'سه‌شنبه' | 'چهارشنبه' | 'پنج‌شنبه' | 'جمعه'

// دریافت روز فعلی به فارسی
const getCurrentPersianDay = (): PersianDay => {
  const date = new Date()
  // JavaScript's getDay() returns 0 for Sunday, 1 for Monday, etc.
  const dayNumber = date.getDay()

  // Convert day number to Persian day name
  const dayMap: Record<number, PersianDay> = {
    0: 'یکشنبه', // Sunday
    1: 'دوشنبه', // Monday
    2: 'سه‌شنبه', // Tuesday
    3: 'چهارشنبه', // Wednesday
    4: 'پنج‌شنبه', // Thursday
    5: 'جمعه', // Friday
    6: 'شنبه', // Saturday
  }

  return dayMap[dayNumber]
}

// تبدیل نام فصل انگلیسی به فارسی
const trangraySeason = (season: string): string => {
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

// Skeleton Component for Schedule
const ScheduleSkeleton = () => (
  <div className="card mx-4">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h1 className="text-lg font-medium text-foreground">برنامه پخش هفتگی</h1>
        <div className="h-4 w-32 bg-muted rounded animate-pulse mt-1" />
      </div>
    </div>

    <div className="space-y-4">
      {/* Days Tabs */}
      <div className="flex justify-between overflow-x-auto pb-2 -mx-4 px-2">
        {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'].map((day) => (
          <button
            key={day}
            className="p-2 rounded-lg text-sm whitespace-nowrap text-muted-foreground"
          >
            {day}
          </button>
        ))}
      </div>

      {/* Anime List Skeleton */}
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex bg-card gap-4 p-2 rounded-lg">
            <div className="w-12 h-16 bg-muted rounded animate-pulse" />
            <div className="flex-1 min-w-0 mt-1">
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse mb-2" />
              <div className="flex items-center gap-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const Schedule = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<PersianDay>(getCurrentPersianDay())
  const [currentSeason, setCurrentSeason] = useState<string>('')
  const [currentYear, setCurrentYear] = useState<number>(0)
  const [toast, setToast] = useState<string | null>(null)

  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo>({
    schedule: {},
    currentSeason: '',
    currentYear: 0,
  })

  // Empty schedule template
  const emptySchedule: ScheduleData = {
    شنبه: [],
    یکشنبه: [],
    دوشنبه: [],
    سه‌شنبه: [],
    چهارشنبه: [],
    پنج‌شنبه: [],
    جمعه: [],
  }

  useEffect(() => {
    // Always set to current day when the component mounts
    if (!loading) {
      // تغییر روز فعال به روز جاری
      setActiveDay(getCurrentPersianDay())
    }
  }, [loading])

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = (await fetchSchedule()) as ScheduleInfo

        // اگر برنامه‌ای وجود نداشت یا داده‌ها خالی بود
        if (!data.schedule || Object.values(data.schedule).every((arr) => arr.length === 0)) {
          setScheduleInfo({
            schedule: emptySchedule,
            currentSeason: data.currentSeason,
            currentYear: data.currentYear,
          })
        } else {
          setScheduleInfo(data)
        }

        // ذخیره اطلاعات فصل و سال جاری
        setCurrentSeason(data.currentSeason)
        setCurrentYear(data.currentYear)
      } catch (err) {
        setError('خطا در بارگذاری برنامه پخش')
        console.error('Failed to load schedule:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
  }, [])

  if (loading) {
    return <ScheduleSkeleton />
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>
  }

  // Ensure we have data for all days
  const fullSchedule = scheduleInfo.schedule || emptySchedule

  const days = Object.keys(fullSchedule) as PersianDay[]

  const toPersianNumber = (num: number | string): string => {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
    return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
  }

  return (
    <div className="card mx-4">
      {toast && (
        <div className="fixed bottom-6 left-0 right-0 z-[60] px-4">
          <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card px-3 py-2 flex items-start justify-between gap-3 shadow-lg">
            <div className="text-sm leading-6 text-foreground">{toast}</div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setToast(null)}>
              بستن
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          {currentSeason && (
            <h1 className="text-lg font-medium text-foreground">
              {' '}
              فصل {trangraySeason(currentSeason)} {toPersianNumber(currentYear)}
            </h1>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Days Tabs */}
        <div className="flex justify-between overflow-x-auto bg-card rounded-lg border border-border">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`p-1 px-2 rounded-md text-xs whitespace-nowrap border border-transparent ${
                activeDay === day
                  ? 'bg-muted border border-border text-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Anime List for Active Day */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-4">
          {(() => {
            const safeList = fullSchedule[activeDay] || []
            const filteredList = safeList.filter((anime) => {
              const genres = anime.genres || []
              return !genres.some((g) => String(g.slug).toLowerCase() === 'hentai')
            })
            return filteredList.length > 0 ? (
              filteredList.map((anime) => (
                <Link
                  key={anime.id}
                  to={`/anime/${anime.id}`}
                  onClick={(e) => {
                    const rawId = String(anime.id)
                    const isUuid =
                      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)
                    const isNumeric = /^[0-9]+$/.test(rawId)

                    if (!isUuid && isNumeric) {
                      e.preventDefault()
                      const anilistId = Number(rawId)
                      supa
                        .getLocalAnimeIdByAniListId(anilistId)
                        .then((localId) => {
                          if (localId) {
                            navigate(`/anime/${localId}`)
                            return
                          }
                          setToast(
                            'این انیمه توسط شیوری ترجمه نمی‌شود یا در حال حاضر در لیست ترجمه‌های این فصل تیم قرار ندارد.'
                          )
                        })
                        .catch(() => {
                          setToast(
                            'این انیمه توسط شیوری ترجمه نمی‌شود یا در حال حاضر در لیست ترجمه‌های این فصل تیم قرار ندارد.'
                          )
                        })
                    }
                  }}
                >
                  <div className="card">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl border-2 border-input/80 border-b-input/40">
                      <img
                        src={anime.image}
                        alt={anime.title}
                        className="w-full h-full object-cover absolute inset-0"
                        loading="lazy"
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <h3 className="text-sm font-medium line-clamp-2 text-foreground">
                        {anime.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-[2px]">
                        {' '}
                        قسمت {toPersianNumber(anime.episode)} | ساعت {anime.time}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">برنامه‌ای برای این روز موجود نیست</p>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default Schedule
