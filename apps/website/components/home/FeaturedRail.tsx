'use client'

import { useRef } from 'react'
import type { CatalogAnimeCard } from '@shiori/db'
import { AnimeCard } from '@/components/AnimeCard'
import { SectionHeading } from '@/components/SectionHeading'
import { toPersianNumber } from '@/lib/format'

type FeaturedRailProps = {
  items: CatalogAnimeCard[]
}

export const FeaturedRail = ({ items }: FeaturedRailProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null)

  if (items.length === 0) return null

  const scroll = (dir: 'prev' | 'next') => {
    const el = scrollerRef.current
    if (!el) return
    const amount = dir === 'next' ? 320 : -320
    el.scrollBy({ left: amount, behavior: 'smooth' })
  }

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <SectionHeading
          title="منتخب شیوری"
          subtitle="برترین عنوان‌ها با زیرنویس اختصاصی"
          count={`${toPersianNumber(items.length)} عنوان`}
        />
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll('prev')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-primary/40 hover:bg-primary/15"
            aria-label="قبلی"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scroll('next')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-primary/40 hover:bg-primary/15"
            aria-label="بعدی"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory sm:-mx-0 sm:px-0"
      >
        {items.map((anime, index) => (
          <AnimeCard
            key={String(anime.id)}
            anime={anime}
            variant="poster"
            priority={index < 3}
          />
        ))}
      </div>
    </section>
  )
}
