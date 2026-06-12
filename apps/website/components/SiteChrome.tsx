import Link from 'next/link'
import { buildTelegramBotLink } from '@shiori/db'
import { siteConfig } from '@/lib/site'

export const SiteHeader = () => {
  const botLink = buildTelegramBotLink(siteConfig.botUsername)

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-shiori-bg/75 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-black text-white shadow-glow-sm transition group-hover:scale-105">
            シ
          </span>
          <div>
            <span className="block text-base font-bold text-white">{siteConfig.name}</span>
            <span className="hidden text-[10px] text-zinc-500 sm:block">انیمه · زیرنویس فارسی</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="hidden rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:text-white sm:inline"
          >
            کاتالوگ
          </Link>
          {botLink ? (
            <a
              href={botLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-primary hover:ring-primary/50"
            >
              تلگرام
            </a>
          ) : null}
        </nav>
      </div>
    </header>
  )
}

export const SiteFooter = () => {
  const botLink = buildTelegramBotLink(siteConfig.botUsername)
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 border-t border-white/[0.06] bg-shiori-surface/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-6">
        <p className="text-gradient text-lg font-bold">{siteConfig.name}</p>
        <p className="max-w-md text-sm leading-7 text-zinc-400">{siteConfig.description}</p>
        {botLink ? (
          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary-300 hover:text-primary hover:underline"
          >
            @{siteConfig.botUsername}
          </a>
        ) : null}
        <p className="text-xs text-zinc-600">© {year} {siteConfig.name}</p>
      </div>
    </footer>
  )
}
