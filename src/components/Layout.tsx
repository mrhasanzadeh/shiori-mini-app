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
import {
  Building2,
  ChevronLeft,
  Download,
  Film,
  Languages,
  LayoutDashboard,
  Package,
  PanelLeftOpen,
  PanelRightOpen,
  Tags,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import logo from '../assets/images/shiori-logo.svg'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)

  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false)

  useEffect(() => {
    try {
      setAdminSidebarCollapsed(localStorage.getItem('admin_sidebar_collapsed') === '1')
    } catch {
      setAdminSidebarCollapsed(false)
    }
  }, [])

  const toggleAdminSidebar = () => {
    setAdminSidebarCollapsed((p) => {
      const next = !p
      try {
        localStorage.setItem('admin_sidebar_collapsed', next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })
  }

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

  const adminNav = [
    {
      to: '/admin',
      isActive: () => isActive('/admin'),
      label: 'داشبورد',
      Icon: LayoutDashboard,
    },
    {
      to: '/admin/anime',
      isActive: () => location.pathname.startsWith('/admin/anime'),
      label: 'انیمه‌ها',
      Icon: Film,
    },
    {
      to: '/admin/genres',
      isActive: () => location.pathname.startsWith('/admin/genres'),
      label: 'ژانرها',
      Icon: Tags,
    },
    {
      to: '/admin/studios',
      isActive: () => location.pathname.startsWith('/admin/studios'),
      label: 'استودیوها',
      Icon: Building2,
    },
    {
      to: '/admin/translators',
      isActive: () => location.pathname.startsWith('/admin/translators'),
      label: 'مترجم‌ها',
      Icon: Languages,
    },
    {
      to: '/admin/files-downloads',
      isActive: () => location.pathname.startsWith('/admin/files-downloads'),
      label: 'آمار دانلود',
      Icon: Download,
    },
    {
      to: '/admin/file-packs',
      isActive: () => location.pathname.startsWith('/admin/file-packs'),
      label: 'پک فایل‌ها',
      Icon: Package,
    },
  ]

  const currentAdminNavItem = adminNav.find((item) => item.isActive())
  const currentAdminPageLabel = currentAdminNavItem?.label ?? 'مدیریت'

  if (isAdminPage) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
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
            <div
              className={`flex items-center ${adminSidebarCollapsed ? 'justify-center' : 'justify-end'}`}
            >
              <Button type="button" variant={'outline'} size="icon" onClick={toggleAdminSidebar}>
                {adminSidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="secondary" className="gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span className="text-sm">
                      {user?.username
                        ? `@${user.username}`
                        : user?.first_name
                          ? user.first_name
                          : 'ادمین'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link to="/">بازگشت به سایت</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onSelect={() => {
                      try {
                        localStorage.removeItem('admin_web_authed')
                      } catch {
                        // ignore
                      }
                      window.location.reload()
                    }}
                  >
                    <LogOut className="h-4 w-4 ml-2" />
                    خروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border bg-muted hover:bg-muted/80 text-foreground transition-colors duration-200"
                aria-label="بازگشت"
              >
                <ArrowRight01Icon className="w-4 h-4" />
                بازگشت
              </button>
            </div>
          </div>
        </header> */}

        <div className="flex flex-1">
          <aside
            className={`bg-muted/30 shrink-0 border-l border-muted sticky top-0 h-screen overflow-y-auto transition-[width] duration-200 ${
              adminSidebarCollapsed ? 'w-14' : 'w-72'
            }`}
          >
            <Link to="/" className="flex p-4 gap-1 text-foreground">
              <img src={logo} alt="logo" className="w-6 h-6" />
              {!adminSidebarCollapsed ? (
                <span className="text-foreground text-xl font-bold">شیوری</span>
              ) : null}
            </Link>
            <div className="p-1">
              <div className="mt-3 flex flex-col gap-1 items-center">
                {adminNav.map((item) => {
                  const active = item.isActive()
                  const ItemIcon = item.Icon
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={adminSidebarCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-md transition-colors h-10 ${
                        adminSidebarCollapsed ? 'w-10  justify-center' : 'px-4  gap-2 w-full'
                      } ${
                        active
                          ? 'bg-muted border-border text-foreground'
                          : 'bg-transparent border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <ItemIcon className="h-4 w-4" />
                      {!adminSidebarCollapsed ? (
                        <span className="text-sm">{item.label}</span>
                      ) : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          </aside>

          <main className="flex-1 px-8 py-4">
            <header className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Button type="button" variant={'ghost'} size="icon" onClick={toggleAdminSidebar}>
                  {adminSidebarCollapsed ? (
                    <PanelRightOpen className="w-4 h-4" />
                  ) : (
                    <PanelLeftOpen className="w-4 h-4" />
                  )}
                </Button>
                <div className="h-4 border-l border-muted ml-2"></div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/admin"
                    className="text-muted-foreground text-sm hover:text-foreground transition-colors"
                  >
                    شیوری ادمین
                  </Link>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{currentAdminPageLabel}</span>
                </div>
              </div>
            </header>
            <div className="px-4 mx-auto container mt-10">{children}</div>
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
