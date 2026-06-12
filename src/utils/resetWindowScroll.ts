/** Reset window scroll — Telegram WebView sometimes keeps body/html scroll separately. */
export const resetWindowScroll = () => {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}
