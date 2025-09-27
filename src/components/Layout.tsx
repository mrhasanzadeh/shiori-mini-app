import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Home01Icon, 
  Calendar01Icon,
  Search01Icon,
  UserIcon,
  FavouriteIcon,
  ArrowRight01Icon,
  RefreshIcon
} from 'hugeicons-react'
import logo from '../assets/images/shiori-logo.svg'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const isAnimeDetailPage = location.pathname.includes('/anime/')

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
        isScrolled 
          ? 'bg-gray-950' 
          : isAnimeDetailPage 
            ? 'bg-transparent' 
            : 'bg-gradient-to-b from-gray-950/90 via-gray-950/60 to-transparent'
      }`}>
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center justify-center gap-1 text-white">
              <img src={logo} alt="logo" className='w-6 h-6' />
            <span className='text-white text-xl font-bold'>شیوری</span>
            </Link>
            {location.pathname === '/' ? (
              <button 
                onClick={() => window.location.reload()}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors duration-200"
                aria-label="بارگذاری مجدد"
              >
                <RefreshIcon className="w-6 h-6" />
              </button>
            ) : (
              <button 
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors duration-200"
                aria-label="بازگشت"
              >
                <ArrowRight01Icon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 ${!isAnimeDetailPage ? 'pt-16' : ''}`}>
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-950 z-50">
        <div className="container">
          <div className="flex justify-around py-4">
            <Link
              to="/"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/') ? 'text-primary-400' : 'text-gray-400'
              }`}
              aria-label="خانه"
            >
              <Home01Icon className="w-6 h-6" />
              <span className="text-xs">خانه</span>
            </Link>
            <Link
              to="/schedule"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/schedule') ? 'text-primary-400' : 'text-gray-400'
              }`}
              aria-label="برنامه پخش"
            >
              <Calendar01Icon className="w-6 h-6" />
              <span className="text-xs">برنامه پخش</span>
            </Link>
            <Link
              to="/search"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/search') ? 'text-primary-400' : 'text-gray-400'
              }`}
              aria-label="جستجو"
            >
              <Search01Icon className="w-6 h-6" />
              <span className="text-xs">جستجو</span>
            </Link>
            <Link
              to="/my-list"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/my-list') ? 'text-primary-400' : 'text-gray-400'
              }`}
              aria-label="لیست من"
            >
              <FavouriteIcon className="w-6 h-6" />
              <span className="text-xs">لیست من</span>
            </Link>
            <Link
              to="/profile"
              className={`flex flex-col items-center space-y-1 ${
                isActive('/profile') ? 'text-primary-400' : 'text-gray-400'
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