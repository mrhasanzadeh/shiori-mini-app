import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TelegramCta } from '@/components/TelegramCta'
import { getDb, hasDbConfig } from '@/lib/db'
import { siteConfig } from '@/lib/site'
import {
  formatSeriesMemberLabel,
  genreLabel,
  toPersianNumber,
  truncateText,
} from '@/lib/format'

export const revalidate = 300

type PageProps = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  if (!hasDbConfig()) return { title: 'انیمه' }

  const anime = await getDb().fetchAnimeById(id)
  if (!anime) return { title: 'انیمه یافت نشد' }

  const description = truncateText(anime.synopsis || siteConfig.description, 155)
  const title = anime.title

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: anime.image ? [{ url: anime.image, alt: title }] : undefined,
    },
  }
}

export default async function AnimeDetailPage({ params }: PageProps) {
  const { id } = await params

  if (!hasDbConfig()) notFound()

  const anime = await getDb().fetchAnimeById(id)
  if (!anime) notFound()

  return (
    <article className="space-y-8">
      <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[14rem] overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 md:mx-0">
          {anime.image ? (
            <Image src={anime.image} alt={anime.title} fill className="object-cover" priority />
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{anime.title}</h1>
            {anime.title_romaji ? (
              <p className="mt-1 text-sm text-zinc-400" dir="ltr">
                {anime.title_romaji}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
            {anime.episodes_count > 0 ? (
              <span className="rounded-full border border-white/10 px-3 py-1">
                {toPersianNumber(anime.episodes_count)} قسمت
              </span>
            ) : null}
            {anime.year ? (
              <span className="rounded-full border border-white/10 px-3 py-1">
                {toPersianNumber(anime.year)}
              </span>
            ) : null}
            {anime.format ? (
              <span className="rounded-full border border-white/10 px-3 py-1">{anime.format}</span>
            ) : null}
          </div>

          {anime.genres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {anime.genres.map((g) => (
                <span
                  key={g.slug}
                  className="rounded-full bg-primary/15 px-3 py-1 text-xs text-primary"
                >
                  {genreLabel(g)}
                </span>
              ))}
            </div>
          ) : null}

          <TelegramCta animeId={anime.id} label="دانلود قسمت‌ها در تلگرام" tab="episodes" />

          {anime.synopsis ? (
            <p className="text-sm leading-7 text-zinc-300 whitespace-pre-line">{anime.synopsis}</p>
          ) : null}
        </div>
      </div>

      {anime.series && anime.series.members.length > 1 ? (
        <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-base font-semibold text-white">
            {anime.series.title || 'فصل‌های سری'}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {anime.series.members.map((member) => {
              const active = String(member.id) === String(anime.id)
              const label = formatSeriesMemberLabel(member)
              return (
                <Link
                  key={String(member.id)}
                  href={`/anime/${member.id}`}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition ${
                    active
                      ? 'border-primary bg-primary/15 text-white'
                      : 'border-white/10 text-zinc-300 hover:border-primary/30'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </section>
      ) : null}
    </article>
  )
}
