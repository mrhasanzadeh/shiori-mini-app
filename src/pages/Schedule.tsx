import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSchedule } from '../utils/api'
import { useCacheStore, Anime, ScheduleInfo } from '../store/cacheStore'

// با استفاده از یک type برای نمایش آیتم‌های قابل نمایش در Schedule
type ScheduleAnimeItem = Anime & { 
  airingAt: number;
}

// ساختار داده برای برنامه هر روز
type ScheduleData = {
  [key: string]: ScheduleAnimeItem[];
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
    0: 'یکشنبه',  // Sunday
    1: 'دوشنبه',   // Monday
    2: 'سه‌شنبه',  // Tuesday
    3: 'چهارشنبه', // Wednesday
    4: 'پنج‌شنبه', // Thursday
    5: 'جمعه',    // Friday
    6: 'شنبه'     // Saturday
  }
  
  return dayMap[dayNumber]
}

// تبدیل نام فصل انگلیسی به فارسی
const translateSeason = (season: string): string => {
  switch(season) {
    case 'WINTER': return 'زمستان';
    case 'SPRING': return 'بهار';
    case 'SUMMER': return 'تابستان';
    case 'FALL': return 'پاییز';
    default: return season;
  }
}

const Schedule = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDay, setActiveDay] = useState<PersianDay>(getCurrentPersianDay())
  const [currentSeason, setCurrentSeason] = useState<string>('')
  const [currentYear, setCurrentYear] = useState<number>(0)
  
  const { setSchedule, getSchedule } = useCacheStore()
  const cachedScheduleInfo = getSchedule()

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
        const data = await fetchSchedule() as ScheduleInfo
        
        // اگر برنامه‌ای وجود نداشت یا داده‌ها خالی بود
        if (!data.schedule || Object.values(data.schedule).every(arr => arr.length === 0)) {
          setSchedule({
            schedule: emptySchedule as any,
            currentSeason: data.currentSeason,
            currentYear: data.currentYear
          })
        } else {
        setSchedule(data)
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

    // اگر داده‌های cache خالی باشد یا فصل جاری ذخیره نشده باشد
    if (!cachedScheduleInfo || !cachedScheduleInfo.currentSeason) {
    loadSchedule()
    } else {
      setCurrentSeason(cachedScheduleInfo.currentSeason)
      setCurrentYear(cachedScheduleInfo.currentYear)
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    )
  }

  // Ensure we have data for all days
  const fullSchedule = cachedScheduleInfo?.schedule as unknown as ScheduleData || emptySchedule;

  const days = Object.keys(fullSchedule) as PersianDay[]

  return (
    <div className="card mx-4">
      <div className="flex items-center justify-between mb-4">
        <div>
        <h1 className="text-lg font-medium text-gray-100">برنامه پخش هفتگی</h1>
          {currentSeason && (
            <p className="text-sm text-gray-400">
              فصل {translateSeason(currentSeason)} {currentYear}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Days Tabs */}
        <div className="flex justify-between overflow-x-auto pb-2 -mx-4 px-2">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`p-2 rounded-lg text-sm whitespace-nowrap ${
                activeDay === day
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-400'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Anime List for Active Day */}
        <div className="space-y-2">
          {fullSchedule[activeDay]?.length > 0 ? (
            fullSchedule[activeDay].map((anime) => (
            <Link
              key={anime.id}
              to={`/anime/${anime.id}`}
              className="flex bg-gray-900 gap-4 p-2 rounded-lg"
            >
              <img
                src={anime.image}
                alt={anime.title}
                className="w-12 h-16 object-cover rounded"
                loading="lazy"
              />
              <div className="flex-1 min-w-0 mt-1">
                <h2 className="font-medium text text-gray-100 line-clamp-1">
                  {anime.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-primary-400">
                    {anime.episode}
                  </span>
                  <span className="text-sm text-gray-400">
                    ساعت: {anime.time}
                  </span>
                </div>
              </div>
            </Link>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">برنامه‌ای برای این روز موجود نیست</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Schedule 