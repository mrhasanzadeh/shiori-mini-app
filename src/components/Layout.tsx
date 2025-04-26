import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HomeIcon, CalendarIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              شیوری
            </Link>
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <MagnifyingGlassIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-6">
        {children}
      </main>

      <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="container">
          <div className="flex justify-around py-4">
            <Link
              to="/"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/') ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <HomeIcon className="w-6 h-6" />
              <span className="text-xs">خانه</span>
            </Link>
            <Link
              to="/schedule"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/schedule') ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <CalendarIcon className="w-6 h-6" />
              <span className="text-xs">برنامه پخش</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}

export default Layout 