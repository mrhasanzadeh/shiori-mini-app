export const buildTelegramMiniAppLink = (
  botUsername: string,
  animeId: string | number,
  tab?: 'info' | 'episodes' | 'similar'
) => {
  const bot = botUsername.trim()
  if (!bot) return ''
  const startParam =
    tab && tab !== 'info' ? `anime_${animeId}_${tab}` : `anime_${animeId}`
  return `https://t.me/${bot}?startapp=${encodeURIComponent(startParam)}`
}

export const buildTelegramBotLink = (botUsername: string) => {
  const bot = botUsername.trim()
  return bot ? `https://t.me/${bot}` : ''
}
