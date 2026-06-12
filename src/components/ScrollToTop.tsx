import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { resetWindowScroll } from '../utils/resetWindowScroll'

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
