import { Link } from 'react-router-dom';
import { PlayIcon } from '@heroicons/react/24/outline';

interface Anime {
  id: number;
  title: string;
  image: string;
  episode: string;
  isNew?: boolean;
  description?: string;
  genres?: string[];
  time?: string;
}

interface FeaturedGridProps {
  animeList: Anime[];
  loading: boolean;
}

// Skeleton Component for Featured Grid
const FeaturedSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
    {[...Array(8)].map((_, index) => (
      <div key={index} className="animate-pulse">
        <div className="relative aspect-[16/9] overflow-hidden bg-slate-800 rounded-lg" />
        <div className="mt-3">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-3 bg-slate-800 rounded w-1/2 mt-2" />
        </div>
      </div>
    ))}
  </div>
);

const FeaturedGrid = ({ animeList, loading }: FeaturedGridProps) => {
  if (loading) {
    return <FeaturedSkeleton />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {animeList.slice(0, 8).map((anime) => (
        <Link
          key={anime.id}
          to={`/anime/${anime.id}`}
          className="group block"
          aria-label={`مشاهده ${anime.title}`}
        >
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
            <img
              src={anime.image}
              alt={anime.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-2 mb-2">
                  {anime.genres?.slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-0.5 bg-primary-500/90 text-white rounded-md text-xs"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-center">
                  <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors duration-200">
                    <PlayIcon className="w-4 h-4" />
                    <span className="text-sm">شروع تماشا</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-medium line-clamp-1 text-slate-100 group-hover:text-primary-400 transition-colors duration-200">
              {anime.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {anime.episode}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default FeaturedGrid; 