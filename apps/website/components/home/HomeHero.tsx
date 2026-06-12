import Image from 'next/image'
import Link from 'next/link'
import type { CatalogAnimeCard } from '@shiori/db'
import { buildTelegramBotLink } from '@shiori/db'
import { siteConfig } from '@/lib/site'
import { genreLabel, toPersianNumber, truncateText } from '@/lib/format'

type HomeHeroProps = {
  spotlight: CatalogAnimeCard | null
  catalogCount: number
  featuredCount: number
}

export const HomeHero = ({ spotlight, catalogCount, featuredCount }: HomeHeroProps) => {
  const heroImage = spotlight?.image ?? null
  const botLink = buildTelegramBotLink(siteConfig.botUsername)

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-shiori-surface/80">
      {/* backdrop */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40" aria-hidden />
      {heroImage ? (
        <>
          <Image
            src={heroImage}
            alt=""
            fill
            priority
            className="object-cover object-top opacity-25 blur-sm scale-105"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-gradient-to-l from-shiori-bg via-shiori-bg/92 to-shiori-bg/55"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-shiori-bg via-transparent to-shiori-bg/30"
            aria-hidden
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      )}

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12 lg:p-10">
        <div className="space-y-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            زیرنویس فارسی · کیفیت بالا
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-gradient">{siteConfig.name}</span>
              <span className="mt-2 block text-2xl font-bold text-white/95 sm:text-3xl">
                دنیای انیمه، یک کلیک دورتر
              </span>
            </h1>
            <p className="text-base leading-8 text-zinc-300 sm:text-lg">
              {siteConfig.description}. کاتالوگ کامل، جزئیات هر عنوان، و دانلود مستقیم از
              تلگرام.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {botLink ? (
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-primary-500 hover:shadow-glow"
              >
                شروع در تلگرام
              </a>
            ) : null}
            {spotlight ? (
              <Link
                href={`/anime/${spotlight.id}`}
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-primary/40 hover:bg-white/10"
              >
                مشاهده {truncateText(spotlight.title, 28)}
              </Link>
            ) : null}
          </div>

          <dl className="grid grid-cols-3 gap-3 pt-2 sm:max-w-md">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 backdrop-blur-sm">
              <dt className="text-[10px] text-zinc-500">انیمه</dt>
              <dd className="text-lg font-bold tabular-nums text-white">
                {toPersianNumber(catalogCount)}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 backdrop-blur-sm">
              <dt className="text-[10px] text-zinc-500">ویژه</dt>
              <dd className="text-lg font-bold tabular-nums text-white">
                {toPersianNumber(featuredCount)}
              </dd>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 backdrop-blur-sm">
              <dt className="text-[10px] text-zinc-500">رایگان</dt>
              <dd className="text-lg font-bold text-primary-300">۱۰۰٪</dd>
            </div>
          </dl>
        </div>

        {spotlight ? (
          <Link
            href={`/anime/${spotlight.id}`}
            className="group relative mx-auto hidden w-full max-w-[13rem] shrink-0 lg:block xl:max-w-[15rem]"
          >
            <div
              className="absolute -inset-4 rounded-[2rem] bg-primary/20 blur-2xl animate-pulse-glow"
              aria-hidden
            />
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/15 shadow-glow transition duration-500 group-hover:scale-[1.02] group-hover:border-primary/50">
              {spotlight.image ? (
                <Image
                  src={spotlight.image}
                  alt={spotlight.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="240px"
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-300">
                  پیشنهاد امروز
                </p>
                <p className="mt-1 line-clamp-2 text-base font-bold text-white">{spotlight.title}</p>
                {spotlight.genres[0] ? (
                  <p className="mt-1 text-xs text-zinc-300">{genreLabel(spotlight.genres[0])}</p>
                ) : null}
              </div>
            </div>
          </Link>
        ) : null}
      </div>
    </section>
  )
}
