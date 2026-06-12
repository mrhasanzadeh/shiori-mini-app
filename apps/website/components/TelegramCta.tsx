import Link from 'next/link'
import { buildTelegramMiniAppLink } from '@shiori/db'
import { siteConfig } from '@/lib/site'

export const TelegramCta = ({
  animeId,
  label = 'دانلود در تلگرام',
  tab = 'episodes' as 'info' | 'episodes' | 'similar',
  className = '',
}: {
  animeId: string | number
  label?: string
  tab?: 'info' | 'episodes' | 'similar'
  className?: string
}) => {
  const href = buildTelegramMiniAppLink(siteConfig.botUsername, animeId, tab)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-500 ${className}`}
    >
      {label}
    </a>
  )
}

export const TelegramBotLink = () => {
  const href = `https://t.me/${siteConfig.botUsername}`
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary hover:underline"
    >
      @{siteConfig.botUsername}
    </Link>
  )
}
