import { Routes, Route } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import WebApp from '@twa-dev/sdk'
import Layout from './components/Layout'
import { useTheme } from './utils/theme'
import { useTelegramApp } from './hooks/useTelegramApp'

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'))
const AnimeDetail = lazy(() => import('./pages/AnimeDetail'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Search = lazy(() => import('./pages/Search'))
const MyList = lazy(() => import('./pages/MyList'))
const ListDetail = lazy(() => import('./pages/ListDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Notifications = lazy(() => import('./pages/Notifications'))

function App() {
  const { isReady } = useTelegramApp()
  const { applyTheme } = useTheme()

  useEffect(() => {
    if (isReady) {
      WebApp.expand()
      applyTheme()
    }
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
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/anime/:id" element={<AnimeDetail />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/search" element={<Search />} />
          <Route path="/my-list" element={<MyList />} />
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App 