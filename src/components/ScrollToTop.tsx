import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Reset window scroll — Telegram WebView sometimes keeps body/html scroll separately. */
export const resetWindowScroll = () => {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

/**
 * Scroll to top on route change. Without this, SPA navigation keeps the previous
 * page scroll position (often visible as landing mid-page in Telegram Mini App).
 */
const ScrollToTop = () => {
  const { pathname } = useLocation()

  useLayoutEffect(() => {
    resetWindowScroll()
    const raf = requestAnimationFrame(() => {
      resetWindowScroll()
    })
    return () => cancelAnimationFrame(raf)
  }, [pathname])

  return null
}

export default ScrollToTop
