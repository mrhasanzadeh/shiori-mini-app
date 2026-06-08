import { Link } from 'react-router-dom'
import {
  Building2,
  ChevronLeft,
  Download,
  Film,
  Languages,
  LayoutDashboard,
  Package,
  Tags,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type AdminNavItem = {
  title: string
  description: string
  Icon: LucideIcon
  to?: string
  disabled?: boolean
  badge?: string
}

const navItems: AdminNavItem[] = [
  {
    to: '/admin/anime',
    title: 'انیمه‌ها',
    description: 'لیست، ایجاد و ویرایش انیمه',
    Icon: Film,
  },
  {
    to: '/admin/genres',
    title: 'ژانرها',
    description: 'افزودن و ویرایش ژانرها',
    Icon: Tags,
  },
  {
    to: '/admin/studios',
    title: 'استودیوها',
    description: 'مدیریت استودیوهای تولید',
    Icon: Building2,
  },
  {
    to: '/admin/translators',
    title: 'مترجم‌ها',
    description: 'تیم‌ها و مترجم‌های همکار',
    Icon: Languages,
  },
  {
    to: '/admin/files-downloads',
    title: 'دانلود فایل‌ها',
    description: 'آمار، جستجو و صفحه‌بندی',
    Icon: Download,
  },
  {
    to: '/admin/file-packs',
    title: 'پک فایل‌ها',
    description: 'ساخت پک، ترتیب فایل و deep-link',
    Icon: Package,
  },
  {
    to: '/admin/users',
    title: 'کاربران',
    description: 'کاربرانی که مینی‌اپ را باز کرده‌اند',
    Icon: Users,
  },
]

const NavCard = ({ item }: { item: AdminNavItem }) => {
  const inner = (
    <>
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
          item.disabled
            ? 'bg-muted/40 text-muted-foreground'
            : 'bg-primary-600/15 text-primary-300 border-primary-500/20'
        )}
      >
        <item.Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1 space-y-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-foreground text-sm font-semibold">{item.title}</span>
          {item.badge ? <Badge variant="secondary">{item.badge}</Badge> : null}
        </span>
        <span className="text-muted-foreground block text-xs leading-relaxed">{item.description}</span>
      </span>
      {!item.disabled ? (
        <ChevronLeft className="text-muted-foreground h-5 w-5 shrink-0 opacity-60" aria-hidden />
      ) : null}
    </>
  )

  const className = cn(
    'flex items-start gap-3 rounded-xl border bg-card p-4 text-start shadow-sm transition-colors',
    item.disabled
      ? 'cursor-not-allowed opacity-70'
      : 'hover:border-primary-400/40 hover:bg-muted/30'
  )

  if (item.disabled || !item.to) {
    return <div className={className}>{inner}</div>
  }

  return (
    <Link to={item.to} className={className}>
      {inner}
    </Link>
  )
}

const AdminDashboard = () => {
  return (
    <div dir="rtl" className="mx-auto w-full max-w-6xl space-y-6 text-start">
      <header className="space-y-1">
        <h1 className="text-foreground flex items-center gap-2 text-xl font-bold">
          <LayoutDashboard className="h-5 w-5 shrink-0 text-primary-400" />
          پنل ادمین
        </h1>
        <p className="text-muted-foreground text-sm">
          میان‌برهای مدیریت دیتابیس، محتوا و فایل‌های بات تلگرام
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {navItems.map((item) => (
          <NavCard key={item.title} item={item} />
        ))}
      </div>
    </div>
  )
}

export default AdminDashboard
