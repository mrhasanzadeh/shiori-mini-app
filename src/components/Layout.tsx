import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  HomeIcon, 
  CalendarIcon, 
  MagnifyingGlassIcon,
  UserIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import logo from '../assets/images/shiori-logo.svg'

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="p-2 rounded-xl shadow-lg bg-primary-500 w-10 h-10 flex items-center justify-center">
              <img src={logo} alt="logo" className='w-8 h-8' />
            </Link>
            <div className="flex items-center space-x-4">
              <button 
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors duration-200"
                aria-label="جستجو"
              >
                <MagnifyingGlassIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-700 z-50">
        <div className="container">
          <div className="flex justify-between py-4">
            <Link
              to="/"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/') ? 'text-primary-600' : 'text-gray-300'
              }`}
              aria-label="خانه"
            >
              <HomeIcon className="w-6 h-6" />
              <span className="text-xs">خانه</span>
            </Link>
            <Link
              to="/schedule"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/schedule') ? 'text-primary-600' : 'text-gray-300'
              }`}
              aria-label="برنامه پخش"
            >
              <CalendarIcon className="w-6 h-6" />
              <span className="text-xs">برنامه پخش</span>
            </Link>
            <Link
              to="/search"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/search') ? 'text-primary-600' : 'text-gray-300'
              }`}
              aria-label="جستجو"
            >
              <MagnifyingGlassIcon className="w-6 h-6" />
              <span className="text-xs">جستجو</span>
            </Link>
            <Link
              to="/my-list"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/my-list') ? 'text-primary-600' : 'text-gray-300'
              }`}
              aria-label="لیست من"
            >
              <HeartIcon className="w-6 h-6" />
              <span className="text-xs">لیست من</span>
            </Link>
            <Link
              to="/profile"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/profile') ? 'text-primary-600' : 'text-gray-300'
              }`}
              aria-label="پروفایل"
            >
              <UserIcon className="w-6 h-6" />
              <span className="text-xs">پروفایل</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}

export default Layout 