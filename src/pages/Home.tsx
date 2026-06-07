import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AnimePrefetchLink from '../components/AnimePrefetchLink'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, FreeMode, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/pagination'
import {
  ArrowLeft01Icon,
  SparklesIcon,
} from 'hugeicons-react'
import type { GenreItem } from '../services/supabaseAnime'
import { Button } from '@/components/ui/button'
import {
  filterAnimeCardsBySection,
  useAnimeCardsQuery,
  type UiAnimeCard,
} from '../hooks/queries/useAnimeQueries'

type ContentType = 'anime' | 'movie' | 'donghua'

type Anime = UiAnimeCard

type SectionId = 'latest' | 'popular' | 'donghua' | 'movies'

const TYPE_TABS: { id: ContentType; label: string }[] = [
  { id: 'anime', label: 'انیمه' },
  { id: 'movie', label: 'سینمایی' },
  { id: 'donghua', label: 'دونگهوا' },
]

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
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

const getFallbackSeason = (): 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' => {
  const month = new Date().getMonth()
  if (month >= 0 && month < 3) return 'WINTER'
  if (month >= 3 && month < 6) return 'SPRING'
  if (month >= 6 && month < 9) return 'SUMMER'
  return 'FALL'
}

const genreLabel = (g: GenreItem) => g.name_fa || g.name_en || g.slug

const PosterCardContent = ({ anime }: { anime: Anime }) => {
  const genres = (anime.genres || []).slice(0, 3)

  return (
    <AnimePrefetchLink
      animeId={anime.id}
      to={`/anime/${anime.id}`}
      className="group block active:scale-[0.98] transition-transform"
      aria-label={`مشاهده ${anime.title}`}
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
        <img
          src={anime.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
        {anime.isNew && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold bg-primary-400 text-white px-1.5 py-0.5 rounded-md">
            جدید
          </span>
        )}
        <div className="absolute left-0 bottom-0 p-2.5 pt-10">
          <h3 className="text-xs text-left font-semibold text-white line-clamp-2 leading-2">{anime.title}</h3>
          {genres.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1 justify-end">
              {genres.map((g) => (
                <span
                  key={g.slug}
                  className="text-[9px] leading-none px-1 py-0.5 rounded-sm bg-white/15 text-white/90 border border-white/10 max-w-full truncate"
                >
                  {genreLabel(g)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/60 mt-1">{anime.episode || 'شیوری'}</p>
          )}
        </div>
      </div>
    </AnimePrefetchLink>
  )
}

const SectionSkeleton = () => (
  <div className="flex gap-3 overflow-hidden px-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="w-[9.25rem] shrink-0 animate-pulse">
        <div className="aspect-[2/3] rounded-2xl bg-muted" />
      </div>
    ))}
  </div>
)

const Home = () => {
  const [selectedType, setSelectedType] = useState<ContentType>('anime')
  const { data: allCards = [], isLoading, isError, error, refetch } = useAnimeCardsQuery()

  const fallbackSeason = getFallbackSeason()
  const currentYearNumber = new Date().getFullYear()
  const currentSeasonKey = fallbackSeason
  const currentSeasonFa = translateSeason(fallbackSeason)
  const seasonLabel = `فصل ${currentSeasonFa} ${toPersianNumber(currentYearNumber)}`

  const sectionData = useMemo(
    (): Record<SectionId, Anime[]> => ({
      latest: filterAnimeCardsBySection(allCards, 'latest'),
      popular: filterAnimeCardsBySection(allCards, 'popular'),
      donghua: filterAnimeCardsBySection(allCards, 'donghua'),
      movies: filterAnimeCardsBySection(allCards, 'movies'),
    }),
    [allCards]
  )

  const featuredSectionKey: SectionId =
    selectedType === 'movie' ? 'movies' : selectedType === 'donghua' ? 'donghua' : 'latest'

  const featuredAnime = useMemo(
    () =>
      filterAnimeCardsBySection(allCards, featuredSectionKey).filter((a) => Boolean(a.isFeatured)),
    [allCards, featuredSectionKey]
  )

  const initialLoading = isLoading && allCards.length === 0
  const loadError = isError
    ? error instanceof Error
      ? error.message
      : 'خطا در بارگذاری'
    : null

  const sectionMeta = useMemo(
    (): Record<
      SectionId,
      { title: string; seeAll: string }
    > => ({
      latest: {
        title: `فصل ${currentSeasonFa} ${toPersianNumber(currentYearNumber)}`,
        seeAll: `/search?year=${currentYearNumber}&season=${encodeURIComponent(currentSeasonKey)}`,
      },
      popular: { title: 'محبوب‌ترین‌ها', seeAll: '/search' },
      donghua: { title: 'دونگهوا', seeAll: '/search' },
      movies: { title: 'انیمه سینمایی', seeAll: '/search' },
    }),
    [currentSeasonFa, currentSeasonKey, currentYearNumber]
  )

  const filterLatest = (list: Anime[]) =>
    list.filter(
      (a) =>
        typeof a.year === 'number' &&
        a.year === currentYearNumber &&
        String(a.season ?? '').toUpperCase() === currentSeasonKey
    )

  const getSectionList = (id: SectionId): Anime[] => {
    const raw = sectionData[id] || []
    return id === 'latest' ? filterLatest(raw) : raw
  }

  const renderSection = (id: SectionId) => {
    const list = getSectionList(id)
    const meta = sectionMeta[id]

    return (
      <section key={id} className="space-y-3">
        <div className="px-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">{meta.title}</h2>
          <Link
            to={meta.seeAll}
            className="flex items-center gap-1 text-xs text-primary-400 font-medium shrink-0"
          >
            مشاهده همه
            <ArrowLeft01Icon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {initialLoading && list.length === 0 ? (
          <SectionSkeleton />
        ) : loadError && list.length === 0 ? (
          <div className="px-4">
            <p className="text-sm text-red-500 text-center py-4">{loadError}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mx-auto flex"
              onClick={() => refetch()}
            >
              تلاش مجدد
            </Button>
          </div>
        ) : list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 px-4">فعلاً موردی نیست.</p>
        ) : (
          <Swiper
            modules={[FreeMode]}
            spaceBetween={10}
            slidesPerView="auto"
            freeMode
            className="home-section-swiper !px-4"
          >
            {list.map((anime) => (
              <SwiperSlide key={anime.id} className="home-section-slide">
                <PosterCardContent anime={anime} />
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </section>
    )
  }

  return (
    <div className="pb-24">
      {/* Type filter */}
      <div className="px-4 pt-4">
        <div className="relative flex rounded-xl border border-border bg-muted/20 p-0">
          {TYPE_TABS.map((tab) => {
            const active = selectedType === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                className={`relative flex-1 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  active
                    ? 'text-primary-400 font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={active}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-xl bg-primary-400/15 border border-primary-400/35 shadow-sm shadow-primary-400/10"
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Featured */}
      <div className="mt-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <SparklesIcon className="w-4 h-4 text-primary-400" />
            پیشنهاد ویژه
          </h2>
          <span className="text-xs text-primary-400 font-medium">{seasonLabel}</span>
        </div>

        {initialLoading ? (
          <div className="h-52 rounded-2xl bg-muted animate-pulse" />
        ) : loadError ? (
          <div className="h-40 rounded-2xl border border-dashed border-border flex items-center justify-center px-4">
            <p className="text-sm text-red-500 text-center">{loadError}</p>
          </div>
        ) : featuredAnime.length > 0 ? (
          <div className="home-featured-wrap">
            <Swiper
              modules={[Autoplay, Pagination]}
              centeredSlides
              loop={featuredAnime.length > 1}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              pagination={{ clickable: true, el: '.home-featured-pagination' }}
              spaceBetween={12}
              slidesPerView={1.08}
              className="home-featured-swiper"
            >
            {featuredAnime.slice(0, 8).map((anime) => (
              <SwiperSlide key={anime.id}>
                <AnimePrefetchLink
                  animeId={anime.id}
                  to={`/anime/${anime.id}`}
                  className="block group h-52"
                >
                  <div className="relative h-full w-full rounded-2xl overflow-hidden border border-border">
                    <img
                      src={anime.featuredImage || anime.image}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                    <div className="absolute left-0 bottom-0 p-4">
                      <h3 className="text-base font-bold text-white text-left line-clamp-2 leading-6">
                        {anime.title}
                      </h3>
                      {(anime.genres || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 justify-end">
                          {(anime.genres || []).slice(0, 3).map((g) => (
                            <span
                              key={g.slug}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-white/15 text-white/90 backdrop-blur-sm border border-white/10"
                            >
                              {genreLabel(g)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </AnimePrefetchLink>
              </SwiperSlide>
            ))}
            </Swiper>
            <div className="home-featured-pagination" />
          </div>
        ) : (
          <div className="h-40 rounded-2xl border border-dashed border-border bg-muted/20 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">پیشنهاد ویژه‌ای ثبت نشده.</p>
          </div>
        )}
      </div>

      {/* Catalog sections */}
      <div className="space-y-8 pt-6">
        {renderSection('latest')}
        {renderSection('popular')}
        {renderSection('donghua')}
        {renderSection('movies')}
      </div>
    </div>
  )
}

export default Home
