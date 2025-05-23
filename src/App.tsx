import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import WebApp from '@twa-dev/sdk'
import Layout from './components/Layout'
import Home from './pages/Home'
import AnimeDetail from './pages/AnimeDetail'
import Schedule from './pages/Schedule'
import Search from './pages/Search'
import MyList from './pages/MyList'
import ListDetail from './pages/ListDetail'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import { useTheme } from './utils/theme'
import { useTelegramApp } from './hooks/useTelegramApp'

function App() {
  const { isReady } = useTelegramApp()
  const { applyTheme } = useTheme()

  useEffect(() => {
    if (isReady) {
      WebApp.ready()
      WebApp.expand()
      applyTheme()
    }
  }, [isReady])

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <Layout>
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
    </Layout>
  )
}

export default App 