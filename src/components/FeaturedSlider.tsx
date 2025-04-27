import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/effect-fade';
import { PlayIcon } from '@heroicons/react/24/outline';

interface Anime {
  id: number;
  title: string;
  image: string;
  description: string;
  genres: string[];
}

interface FeaturedSliderProps {
  animeList: Anime[];
  loading: boolean;
}

const FeaturedSlider = ({ animeList, loading }: FeaturedSliderProps) => {
  const [progress, setProgress] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiperInstance, setSwiperInstance] = useState<SwiperType | null>(null);

  useEffect(() => {
    if (swiperInstance) {
      swiperInstance.on('autoplayTimeLeft', (_, __, percentage) => {
        setProgress(1 - percentage);
      });

      swiperInstance.on('slideChange', () => {
        setActiveIndex(swiperInstance.realIndex);
        setProgress(0);
      });
    }
  }, [swiperInstance]);

  if (loading) {
    return (
      <div className="w-full h-[600px] bg-gray-900 animate-pulse -mt-16">
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const slidesCount = Math.min(animeList.length, 5);

  return (
    <div className="relative w-full h-[600px] -mt-16">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
        }}
        loop={true}
        className="w-full h-full"
        onSwiper={setSwiperInstance}
      >
        {animeList.slice(0, 5).map((anime) => (
          <SwiperSlide key={anime.id}>
            <div className="relative w-full h-full">
              <div className="absolute inset-0">
                <img
                  src={anime.image}
                  alt={anime.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black from-20% via-black/80 via-40% to-transparent to-80% pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none" />
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
                <div className="max-w-4xl mx-auto">
                  <h2 className="text-xl font-bold text-white mb-2 drop-shadow-lg">{anime.title}</h2>
                  <div className="flex items-center gap-1 mb-4">
                    {anime.genres.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-gray-800/80 text-white rounded-md text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                    <span className='px-3 py-1 bg-gray-800/80 text-white rounded-md text-sm'>زیرنویس چسبیده</span>
                  </div>
                  <p className="text-gray-200 mb-6 line-clamp-2 drop-shadow">
                    {anime.description}
                  </p>
                  
                  <div className="flex flex-col items-center gap-6">
                    <Link
                      to={`/anime/${anime.id}`}
                      className="inline-flex w-full items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg transition-colors duration-200 shadow-lg"
                    >
                      <PlayIcon className="w-5 h-5" />
                      شروع تماشا
                    </Link>

                    <div className="flex items-center justify-center w-full max-w-[600px] gap-3">
                      {Array.from({ length: slidesCount }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => swiperInstance?.slideTo(index)}
                          className="relative w-24 h-2 rounded-full overflow-hidden bg-white/20"
                        >
                          {index === activeIndex && (
                            <div
                              className="absolute inset-0 bg-primary-500 transition-transform duration-200 ease-linear"
                              style={{
                                transform: `scaleX(${progress})`,
                                transformOrigin: 'right'
                              }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default FeaturedSlider; 