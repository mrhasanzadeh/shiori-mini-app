import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useSchedule } from '../hooks/useSchedule'

interface ScheduleItem {
  id: number
  title: string
  time: string
  episode: string
}

const Schedule = () => {
  const { schedule, loading, error, activeDay, setActiveDay, getDaySchedule } = useSchedule()

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

  const days = Object.keys(schedule)

  return (
    <div className="space-y-6">
      {/* Day Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2" role="tablist">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              activeDay === day
                ? 'bg-primary-500 text-white'
                : 'bg-gray-800  text-gray-300 '
            }`}
            role="tab"
            aria-selected={activeDay === day}
            aria-controls={`${day}-panel`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule List */}
      <div 
        className="space-y-4"
        role="tabpanel"
        id={`${activeDay}-panel`}
      >
        {getDaySchedule(activeDay).map((anime) => (
          <Link
            key={anime.id}
            to={`/anime/${anime.id}`}
            className="card p-4 block"
            aria-label={`مشاهده ${anime.title}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{anime.title}</h3>
                <p className="text-sm text-gray-400 mt-1">
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