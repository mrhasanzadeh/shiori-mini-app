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
  LogOut,
  Package,
  PanelLeftOpen,
  PanelRightOpen,
  Tags,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAdminAccess } from '@/hooks/useAdminAccess'
import { isAdminLoginPath, isAdminRoutePath } from '@/lib/adminAccess'
import { cn } from '@/lib/utils'
import { logoutAdminPortal } from '@/services/adminPortalAuth'
import logo from '../assets/images/shiori-logo.svg'

interface LayoutProps {
  children: ReactNode
}

const getAdminInitials = (name: string): string => {
  const trimmed = name.trim()
  if (!trimmed) return 'ا'
  const parts = trimmed.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`
  }
  return trimmed.charAt(0)
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isScrolled, setIsScrolled] = useState(false)

  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

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
  const isProfileHeroPage =
    location.pathname === '/profile' || location.pathname.startsWith('/translators/')
  const isTransparentHeaderPage = isAnimeDetailPage || isProfileHeroPage
  const isAdminPage = isAdminRoutePath(location.pathname)
  const isAdminLoginPage = isAdminLoginPath(location.pathname)

  const { isFullAdmin, isModerator, isStaff, isReady, roleLoading, portalDisplayName } =
    useAdminAccess()

  const adminDisplayName = portalDisplayName?.trim() || 'ادمین'
  const adminInitials = getAdminInitials(adminDisplayName)
  const adminRoleLabel = isFullAdmin ? 'ادمین' : isModerator ? 'مدیر محتوا' : 'ادمین'

  const handleConfirmLogout = () => {
    setLogoutLoading(true)
    void logoutAdminPortal().finally(() => {
      window.location.href = '/admin/login'
    })
  }

  const showAdminShell =
    isAdminPage && !isAdminLoginPage && isStaff && isReady && !roleLoading

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
    {
      to: '/admin/users',
      isActive: () => location.pathname.startsWith('/admin/users'),
      label: 'کاربران',
      Icon: Users,
      fullAdminOnly: true,
    },
  ].filter((item) => isFullAdmin || !('fullAdminOnly' in item && item.fullAdminOnly))

  const currentAdminNavItem = adminNav.find((item) => item.isActive())
  const currentAdminPageLabel = currentAdminNavItem?.label ?? 'مدیریت'

  if (isAdminLoginPage) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        {children}
      </div>
    )
  }

  if (isAdminPage && !showAdminShell) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>
  }

  if (showAdminShell) {
    return (
      <div dir="rtl" className="min-h-screen bg-background text-foreground flex flex-col">
        <div className="flex flex-1">
          <aside
            className={cn(
              'sticky top-0 flex h-screen shrink-0 flex-col border-l border-border/80 bg-card/40 backdrop-blur-sm transition-[width] duration-200',
              adminSidebarCollapsed ? 'w-[4.5rem]' : 'w-64'
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.488_0.243_264.376_/_0.12),transparent_55%)]"
              aria-hidden
            />

            <div className="relative flex items-center justify-between gap-2 border-b border-border/60 p-3">
              <Link
                to="/admin"
                className={cn(
                  'flex min-w-0 items-center gap-2.5 text-foreground',
                  adminSidebarCollapsed && 'mx-auto'
                )}
                title="داشبورد"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-500/20 bg-primary-600/15">
                  <img src={logo} alt="" className="h-5 w-5" />
                </span>
                {!adminSidebarCollapsed ? (
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">شیوری</span>
                    <span className="text-muted-foreground block truncate text-[11px]">پنل مدیریت</span>
                  </span>
                ) : null}
              </Link>

              {!adminSidebarCollapsed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  onClick={toggleAdminSidebar}
                  aria-label="جمع کردن منو"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {adminSidebarCollapsed ? (
              <div className="relative flex justify-center border-b border-border/60 py-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={toggleAdminSidebar}
                  aria-label="باز کردن منو"
                >
                  <PanelRightOpen className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <nav className="relative flex-1 overflow-y-auto p-2">
              {!adminSidebarCollapsed ? (
                <p className="text-muted-foreground px-2 pb-2 pt-1 text-[11px] font-medium">منو</p>
              ) : null}
              <ul className="flex flex-col gap-1">
                {adminNav.map((item) => {
                  const active = item.isActive()
                  const ItemIcon = item.Icon
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        title={adminSidebarCollapsed ? item.label : undefined}
                        className={cn(
                          'flex items-center rounded-xl border border-transparent transition-colors',
                          adminSidebarCollapsed
                            ? 'mx-auto h-10 w-10 justify-center'
                            : 'gap-3 px-3 py-2.5',
                          active
                            ? 'border-primary-500/20 bg-primary-600/15 text-foreground shadow-sm'
                            : 'text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                            active
                              ? 'bg-primary-600/20 text-primary-300'
                              : 'bg-muted/50 text-muted-foreground'
                          )}
                        >
                          <ItemIcon className="h-4 w-4" aria-hidden />
                        </span>
                        {!adminSidebarCollapsed ? (
                          <span className="truncate text-sm font-medium">{item.label}</span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <div className="relative border-t border-border/60 p-2">
              <div
                className={cn(
                  'mb-2 flex items-center gap-3',
                  adminSidebarCollapsed
                    ? 'justify-center'
                    : 'rounded-xl border border-border/60 bg-background/50 px-3 py-2.5'
                )}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary-500/25 bg-primary-600/15 text-sm font-semibold text-primary-300"
                  title={adminDisplayName}
                >
                  {adminInitials}
                </div>
                {!adminSidebarCollapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{adminDisplayName}</p>
                    <p className="text-muted-foreground truncate text-xs">{adminRoleLabel}</p>
                  </div>
                ) : null}
              </div>

              <div className={cn('flex flex-col gap-1', adminSidebarCollapsed && 'items-center')}>
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'text-muted-foreground hover:text-foreground',
                    adminSidebarCollapsed ? 'h-10 w-10 px-0' : 'w-full justify-start gap-2'
                  )}
                  onClick={() => setLogoutDialogOpen(true)}
                  title="خروج"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  {!adminSidebarCollapsed ? <span>خروج</span> : null}
                </Button>
              </div>
            </div>
          </aside>

          <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>خروج از پنل</DialogTitle>
                <DialogDescription>
                  مطمئنی می‌خواهی از حساب <span className="text-foreground">{adminDisplayName}</span>{' '}
                  خارج شوی؟
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setLogoutDialogOpen(false)}
                  disabled={logoutLoading}
                >
                  انصراف
                </Button>
                <Button type="button" variant="destructive" onClick={handleConfirmLogout} disabled={logoutLoading}>
                  {logoutLoading ? 'در حال خروج…' : 'بله، خروج'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <main className="min-w-0 flex-1">
            <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm">
                <Link
                  to="/admin"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  داشبورد
                </Link>
                <ChevronLeft className="h-4 w-4 text-muted-foreground/70" aria-hidden />
                <span className="font-medium">{currentAdminPageLabel}</span>
              </div>
            </header>

            <div className="container mx-auto px-6 py-8">{children}</div>
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
            : isTransparentHeaderPage
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

      <main className={`flex-1 ${!isTransparentHeaderPage ? 'pt-16' : ''} pb-20`}>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 pb-[env(safe-area-inset-bottom,0px)]">
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
