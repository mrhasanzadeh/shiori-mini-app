import { useParams } from 'react-router-dom'
import { PlayIcon, DownloadIcon } from '@heroicons/react/24/outline'

// Mock data for demonstration
const mockAnimeDetail = {
  id: 1,
  title: 'وان پیس',
  image: 'https://via.placeholder.com/800x400',
  description: 'داستان ماجراجویی مونکی دی. لافی و گروه دزدان دریایی کلاه حصیری در جستجوی گنج بزرگ وان پیس.',
  status: 'در حال پخش',
  genres: ['ماجراجویی', 'کمدی', 'فانتزی'],
  episodes: [
    { id: 1, number: 1050, title: 'قسمت ۱۰۵۰' },
    { id: 2, number: 1049, title: 'قسمت ۱۰۴۹' },
    { id: 3, number: 1048, title: 'قسمت ۱۰۴۸' },
  ],
}

const AnimeDetail = () => {
  const { id } = useParams()

  return (
    <div className="space-y-6">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64">
        <img
          src={mockAnimeDetail.image}
          alt={mockAnimeDetail.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 right-4 text-white">
          <h1 className="text-2xl font-bold">{mockAnimeDetail.title}</h1>
          <p className="text-sm mt-1">{mockAnimeDetail.status}</p>
        </div>
      </div>

      {/* Description */}
      <div className="card p-4">
        <h2 className="text-lg font-medium mb-2">خلاصه داستان</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {mockAnimeDetail.description}
        </p>
      </div>

      {/* Genres */}
      <div className="flex flex-wrap gap-2">
        {mockAnimeDetail.genres.map((genre) => (
          <span
            key={genre}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
          >
            {genre}
          </span>
        ))}
      </div>

      {/* Episodes */}
      <div className="card p-4">
        <h2 className="text-lg font-medium mb-4">قسمت‌ها</h2>
        <div className="space-y-3">
          {mockAnimeDetail.episodes.map((episode) => (
            <div
              key={episode.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <h3 className="font-medium">{episode.title}</h3>
              </div>
              <div className="flex space-x-2">
                <button className="btn btn-primary">
                  <PlayIcon className="w-5 h-5" />
                </button>
                <button className="btn btn-secondary">
                  <DownloadIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnimeDetail 