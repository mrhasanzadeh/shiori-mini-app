import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { WebApp } from '@twa-dev/sdk'
import Layout from './components/Layout'
import Home from './pages/Home'
import AnimeDetail from './pages/AnimeDetail'
import Schedule from './pages/Schedule'

function App() {
  useEffect(() => {
    WebApp.ready()
    WebApp.expand()
  }, [])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/anime/:id" element={<AnimeDetail />} />
        <Route path="/schedule" element={<Schedule />} />
      </Routes>
    </Layout>
  )
}

export default App 