import { Routes, Route } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import WebApp from '@twa-dev/sdk'
import Layout from './components/Layout'
import AdminGate from './components/AdminGate'
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
const TranslatorProfile = lazy(() => import('./pages/TranslatorProfile'))
const StudioDetail = lazy(() => import('./pages/StudioDetail'))

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminAnimeList = lazy(() => import('./pages/AdminAnimeList'))
const AdminAnimeEdit = lazy(() => import('./pages/AdminAnimeEdit'))
const AdminGenres = lazy(() => import('./pages/AdminGenres'))
const AdminStudios = lazy(() => import('./pages/AdminStudios'))
const AdminTranslators = lazy(() => import('./pages/AdminTranslators'))
const AdminFilesDownloads = lazy(() => import('./pages/AdminFilesDownloads'))
const AdminFilePacks = lazy(() => import('./pages/AdminFilePacks'))

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
          <Route path="/lists/:id" element={<ListDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />

          <Route
            path="/admin"
            element={
              <AdminGate>
                <AdminDashboard />
              </AdminGate>
            }
          />
          <Route
            path="/admin/anime"
            element={
              <AdminGate>
                <AdminAnimeList />
              </AdminGate>
            }
          />
          <Route
            path="/admin/anime/:id"
            element={
              <AdminGate>
                <AdminAnimeEdit />
              </AdminGate>
            }
          />
          <Route
            path="/admin/genres"
            element={
              <AdminGate>
                <AdminGenres />
              </AdminGate>
            }
          />
          <Route
            path="/admin/studios"
            element={
              <AdminGate>
                <AdminStudios />
              </AdminGate>
            }
          />

          <Route
            path="/admin/translators"
            element={
              <AdminGate>
                <AdminTranslators />
              </AdminGate>
            }
          />

          <Route
            path="/admin/files-downloads"
            element={
              <AdminGate>
                <AdminFilesDownloads />
              </AdminGate>
            }
          />

          <Route
            path="/admin/file-packs"
            element={
              <AdminGate>
                <AdminFilePacks />
              </AdminGate>
            }
          />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App
