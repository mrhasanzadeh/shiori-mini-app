import { AnimeCard } from '@/components/AnimeCard'
import { HomeHero } from '@/components/home/HomeHero'
import { FeaturedRail } from '@/components/home/FeaturedRail'
import { SectionHeading } from '@/components/SectionHeading'
import { buildTelegramBotLink } from '@shiori/db'
import { getDb, hasDbConfig } from '@/lib/db'
import { siteConfig } from '@/lib/site'
import { toPersianNumber } from '@/lib/format'

export const revalidate = 300

export default async function HomePage() {
  if (!hasDbConfig()) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm">
        <p className="font-semibold text-amber-200">تنظیمات Supabase یافت نشد</p>
        <p className="mt-2 text-zinc-300">
          فایل <code className="rounded bg-black/30 px-1">apps/website/.env.local</code> را بساز.
        </p>
      </div>
    )
  }

  const db = getDb()
  const catalog = await db.fetchCatalog()
  const featured = catalog.filter((a) => a.is_featured)
  const featuredRail = (featured.length > 0 ? featured : catalog.slice(0, 12)).slice(0, 16)
  const spotlight = featuredRail[0] ?? catalog[0] ?? null
  const latest = catalog.slice(0, 48)

  return (
    <div className="space-y-14 sm:space-y-16">
      <HomeHero
        spotlight={spotlight}
        catalogCount={catalog.length}
        featuredCount={featured.length}
      />

      <FeaturedRail items={featuredRail} />

      <section className="space-y-6">
        <SectionHeading
          title="تازه‌ترین‌ها"
          subtitle="آخرین عنوان‌های اضافه‌شده به کاتالوگ"
          count={`${toPersianNumber(latest.length)}+`}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {latest.map((anime, index) => (
            <AnimeCard key={String(anime.id)} anime={anime} priority={index < 6} />
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/15 via-shiori-surface to-shiori-bg p-8 text-center sm:p-10">
        <div className="absolute -top-20 start-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" aria-hidden />
        <div className="relative space-y-4">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">آماده دانلود؟</h2>
          <p className="mx-auto max-w-lg text-sm leading-7 text-zinc-300 sm:text-base">
            عنوان مورد علاقه‌ات را پیدا کن، جزئیاتش را ببین، و با یک کلیک وارد ربات تلگرام
            شیوری شو.
          </p>
          <a
            href={buildTelegramBotLink(siteConfig.botUsername)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-shiori-bg transition hover:bg-zinc-100"
          >
            ورود به تلگرام
          </a>
        </div>
      </section>
    </div>
  )
}
