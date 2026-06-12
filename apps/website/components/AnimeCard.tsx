import Link from 'next/link'
import Image from 'next/image'
import type { CatalogAnimeCard } from '@shiori/db'
import { genreLabel, toPersianNumber } from '@/lib/format'

type AnimeCardProps = {
  anime: CatalogAnimeCard
  variant?: 'compact' | 'poster'
  priority?: boolean
  className?: string
}

export const AnimeCard = ({
  anime,
  variant = 'compact',
  priority = false,
  className = '',
}: AnimeCardProps) => {
  if (variant === 'poster') {
    return (
      <Link
        href={`/anime/${anime.id}`}
        className={`group card-shine block shrink-0 snap-start ${className}`}
      >
        <div className="relative aspect-[2/3] w-[9.5rem] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-card transition duration-300 sm:w-[11rem] group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:shadow-glow-sm">
          {anime.image ? (
            <Image
              src={anime.image}
              alt={anime.title}
              fill
              priority={priority}
              className="object-cover transition duration-500 group-hover:scale-110"
              sizes="176px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">بدون تصویر</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
          {anime.is_featured ? (
            <span className="absolute top-2.5 end-2.5 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow-glow-sm">
              ویژه
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white">{anime.title}</h3>
            {anime.genres.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {anime.genres.slice(0, 2).map((g) => (
                  <span
                    key={g.slug}
                    className="rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[9px] text-white/85"
                  >
                    {genreLabel(g)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={`group card-shine overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:border-primary/35 hover:bg-white/[0.05] hover:shadow-glow-sm ${className}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-zinc-900">
        {anime.image ? (
          <Image
            src={anime.image}
            alt={anime.title}
            fill
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-500">بدون تصویر</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-white">{anime.title}</h3>
        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
          {anime.episodes_count > 0 ? (
            <span>{toPersianNumber(anime.episodes_count)} قسمت</span>
          ) : null}
          {anime.year ? <span>{toPersianNumber(anime.year)}</span> : null}
        </div>
      </div>
    </Link>
  )
}
