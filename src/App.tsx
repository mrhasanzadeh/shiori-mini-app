import { Routes, Route } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import WebApp from '@twa-dev/sdk'
import Layout from './components/Layout'
import ScrollToTop from './components/ScrollToTop'
import { RequireAppAuth } from './components/RequireAppAuth'
import { useTheme } from './utils/theme'
import { useAppAuth } from './hooks/useAppAuth'
import { isTelegramMiniApp } from './lib/platform'
import { useTelegramStartNavigation } from './hooks/useTelegramStartNavigation'
import { useTelegramLinkComplete } from './hooks/useTelegramLinkComplete'
import { useTelegramUserSync } from './hooks/useTelegramUserSync'

const Home = lazy(() => import('./pages/Home'))
const AnimeDetail = lazy(() => import('./pages/AnimeDetail'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Search = lazy(() => import('./pages/Search'))
const MyList = lazy(() => import('./pages/MyList'))
const Profile = lazy(() => import('./pages/Profile'))
const Notifications = lazy(() => import('./pages/Notifications'))
const TranslatorProfile = lazy(() => import('./pages/TranslatorProfile'))
const StudioDetail = lazy(() => import('./pages/StudioDetail'))

function App() {
  const { isReady } = useAppAuth()
  const { applyTheme } = useTheme()
  useTelegramStartNavigation(isReady)
  useTelegramLinkComplete(isReady)
  useTelegramUserSync(isReady)

  useEffect(() => {
    if (!isReady) return
    if (isTelegramMiniApp()) {
      WebApp.expand()
    }
    applyTheme()
  }, [isReady, applyTheme])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <Layout>
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/studios/:slug" element={<StudioDetail />} />
          <Route path="/translators/:slug" element={<TranslatorProfile />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/search" element={<Search />} />
          <Route path="/my-list" element={<MyList />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<RequireAppAuth><Notifications /></RequireAppAuth>} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
