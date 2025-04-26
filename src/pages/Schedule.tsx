import { useState } from 'react'
import { Link } from 'react-router-dom'

// Mock data for demonstration
const mockSchedule = {
  'شنبه': [
    { id: 1, title: 'وان پیس', time: '۱۸:۰۰', episode: 'قسمت ۱۰۵۰' },
    { id: 2, title: 'اتک آن تایتان', time: '۱۹:۳۰', episode: 'قسمت ۲۵' },
  ],
  'یکشنبه': [
    { id: 3, title: 'جوجوتسو کایزن', time: '۲۰:۰۰', episode: 'قسمت ۱۲' },
  ],
  'دوشنبه': [
    { id: 4, title: 'دیمون اسلیر', time: '۲۱:۰۰', episode: 'قسمت ۸' },
  ],
  'سه‌شنبه': [
    { id: 5, title: 'مای هیرو آکادمیا', time: '۱۹:۰۰', episode: 'قسمت ۱۵' },
  ],
  'چهارشنبه': [
    { id: 6, title: 'بلک کلاور', time: '۱۸:۳۰', episode: 'قسمت ۲۰' },
  ],
  'پنج‌شنبه': [
    { id: 7, title: 'دراگون بال', time: '۲۰:۳۰', episode: 'قسمت ۱۰' },
  ],
  'جمعه': [
    { id: 8, title: 'ناروتو', time: '۱۹:۰۰', episode: 'قسمت ۵۰' },
  ],
}

const Schedule = () => {
  const days = Object.keys(mockSchedule)
  const [activeDay, setActiveDay] = useState(() => {
    const today = new Date().toLocaleDateString('fa-IR', { weekday: 'long' })
    return days.includes(today) ? today : days[0]
  })

  return (
    <div className="space-y-6">
      {/* Day Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              activeDay === day
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div className="space-y-4">
        {mockSchedule[activeDay].map((anime) => (
          <Link
            key={anime.id}
            to={`/anime/${anime.id}`}
            className="card p-4 block"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{anime.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {anime.episode}
                </p>
              </div>
              <div className="text-sm font-medium text-primary-500">
                {anime.time}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Schedule 