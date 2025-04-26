import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

// Mock data for demonstration
const mockAnime = [
  {
    id: 1,
    title: 'وان پیس',
    image: 'https://via.placeholder.com/300x400',
    episode: 'قسمت ۱۰۵۰',
    isNew: true,
  },
  {
    id: 2,
    title: 'اتک آن تایتان',
    image: 'https://via.placeholder.com/300x400',
    episode: 'قسمت ۲۵',
    isNew: false,
  },
  // Add more mock data as needed
]

const Home = () => {
  const [activeSection, setActiveSection] = useState('latest')

  const sections = [
    { id: 'latest', title: 'جدیدترین انیمه‌ها' },
    { id: 'popular', title: 'محبوب‌ترین انیمه‌های فصل' },
    { id: 'episodes', title: 'قسمت‌های جدید' },
  ]

  return (
    <div className="space-y-8">
      {/* Section Tabs */}
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap ${
              activeSection === section.id
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>

      {/* Anime Slider */}
      <div className="relative">
        <div className="flex space-x-4 overflow-x-auto pb-4">
          {mockAnime.map((anime) => (
            <Link
              key={anime.id}
              to={`/anime/${anime.id}`}
              className="flex-none w-48"
            >
              <div className="card">
                <div className="relative">
                  <img
                    src={anime.image}
                    alt={anime.title}
                    className="w-full h-64 object-cover"
                  />
                  {anime.isNew && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      جدید
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm">{anime.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {anime.episode}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Weekly Schedule Preview */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">برنامه پخش هفتگی</h2>
          <Link to="/schedule" className="text-primary-500 text-sm">
            مشاهده همه
          </Link>
        </div>
        <div className="space-y-4">
          {['شنبه', 'یکشنبه', 'دوشنبه'].map((day) => (
            <div key={day} className="flex items-center justify-between">
              <span className="text-sm">{day}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ۵ انیمه
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home 