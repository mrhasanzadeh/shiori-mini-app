import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home01Icon,
  Calendar01Icon,
  Search01Icon,
  UserIcon,
  FavouriteIcon,
  ArrowRight01Icon,
  RefreshIcon,
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

  const isAnimeDetailPage = location.pathname.startsWith('/anime/')
  const isAdminPage = location.pathname === '/admin' || location.pathname.startsWith('/admin/')

  if (isAdminPage) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
          <div className="px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="flex items-center justify-center gap-1 text-foreground">
                <img src={logo} alt="logo" className="w-6 h-6" />
                <span className="text-foreground text-xl font-bold">شیوری</span>
              </Link>
              <div className="text-gray-500">/</div>
              <Link to="/admin" className="text-foreground font-semibold">
                پنل ادمین
              </Link>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border bg-muted hover:bg-muted/80 text-foreground transition-colors duration-200"
              aria-label="بازگشت"
            >
              <ArrowRight01Icon className="w-4 h-4" />
              بازگشت
            </button>
          </div>
        </header>

        <div className="flex">
          <aside className="w-72 shrink-0 border-r border-border min-h-[calc(100vh-73px)] sticky top-[73px]">
            <div className="p-6 space-y-2">
              <Link
                to="/admin"
                className={`block px-4 py-3 rounded-xl border transition-colors ${
                  isActive('/admin')
                    ? 'bg-muted border-border text-foreground'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                داشبورد
              </Link>
              <Link
                to="/admin/anime"
                className={`block px-4 py-3 rounded-xl border transition-colors ${
                  location.pathname.startsWith('/admin/anime')
                    ? 'bg-muted border-border text-foreground'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                انیمه‌ها
              </Link>
              <Link
                to="/admin/genres"
                className={`block px-4 py-3 rounded-xl border transition-colors ${
                  location.pathname.startsWith('/admin/genres')
                    ? 'bg-muted border-border text-foreground'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                ژانرها
              </Link>
              <Link
                to="/admin/studios"
                className={`block px-4 py-3 rounded-xl border transition-colors ${
                  location.pathname.startsWith('/admin/studios')
                    ? 'bg-muted border-border text-foreground'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                استودیوها
              </Link>

              <Link
                to="/admin/translators"
                className={`block px-4 py-3 rounded-xl border transition-colors ${
                  location.pathname.startsWith('/admin/translators')
                    ? 'bg-muted border-border text-foreground'
                    : 'bg-transparent border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                مترجم‌ها
              </Link>
            </div>
          </aside>

          <main className="flex-1 p-8">
            <div className="max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
          isScrolled
            ? 'bg-background'
            : isAnimeDetailPage
              ? 'bg-transparent'
              : 'bg-gradient-to-b from-background/90 via-background/60 to-transparent'
        }`}
      >
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center justify-center gap-1 text-foreground">
              <img src={logo} alt="logo" className="w-6 h-6" />
              <span className="text-foreground text-xl font-bold">شیوری</span>
            </Link>
            {location.pathname === '/' ? (
              <button
                onClick={() => window.location.reload()}
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors duration-200"
                aria-label="بارگذاری مجدد"
              >
                <RefreshIcon className="w-6 h-6" />
              </button>
            ) : (
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors duration-200"
                aria-label="بازگشت"
              >
                <ArrowRight01Icon className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 ${!isAnimeDetailPage ? 'pt-16' : ''}`}>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background z-50">
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
