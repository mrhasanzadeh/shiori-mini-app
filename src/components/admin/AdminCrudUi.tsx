import { Link } from 'react-router-dom'
import { ArrowRight, Plus, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export const AdminCrudPage = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => (
  <div dir="rtl" className={cn('mx-auto w-full max-w-6xl space-y-6 text-start', className)}>
    {children}
  </div>
)

export const AdminCrudHeader = ({
  icon: Icon,
  title,
  description,
  createLabel,
  onCreate,
  createDisabled,
}: {
  icon: LucideIcon
  title: string
  description: string
  createLabel: string
  onCreate: () => void
  createDisabled?: boolean
}) => (
  <header className="flex flex-wrap items-start justify-between gap-4">
    <div className="space-y-1">
      <Link
        to="/admin"
        className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowRight className="h-4 w-4 shrink-0" />
        داشبورد
      </Link>
      <h1 className="text-foreground flex items-center gap-2 text-xl font-bold">
        <Icon className="h-5 w-5 shrink-0 text-primary-400" />
        {title}
      </h1>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
    <Button type="button" size="lg" className="gap-1.5 shrink-0" onClick={onCreate} disabled={createDisabled}>
      <Plus className="h-4 w-4 shrink-0" />
      {createLabel}
    </Button>
  </header>
)

export const AdminCrudError = ({ message }: { message: string }) => (
  <div
    className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    role="alert"
  >
    {message}
  </div>
)

export const AdminCrudSearch = ({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) => (
  <div className="relative max-w-md">
    <Search className="text-muted-foreground pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pe-9"
    />
  </div>
)

export const AdminCrudCount = ({ filtered, total }: { filtered: number; total: number }) => (
  <p className="text-muted-foreground text-xs">
    {filtered.toLocaleString('fa-IR')} مورد
    {filtered !== total ? ` از ${total.toLocaleString('fa-IR')}` : ''}
  </p>
)

export const AdminCrudEmpty = ({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
    <div className="space-y-1">
      <p className="text-foreground font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
    </div>
    {actionLabel && onAction ? (
      <Button type="button" variant="secondary" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : null}
  </div>
)

export const AdminCrudRow = ({
  children,
  actions,
}: {
  children: ReactNode
  actions: ReactNode
}) => (
  <div className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border bg-card px-3 py-3 transition-colors">
    <div className="min-w-0 flex-1">{children}</div>
    <div className="flex shrink-0 items-center gap-1">{actions}</div>
  </div>
)

export const AdminCrudGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
)

export const AdminCrudCard = ({
  children,
  actions,
}: {
  children: ReactNode
  actions: ReactNode
}) => (
  <div className="hover:bg-muted/40 flex items-center gap-3 rounded-lg border bg-card px-3 py-3 transition-colors">
    <div className="min-w-0 flex-1">{children}</div>
    <div className="flex shrink-0 items-center gap-1">{actions}</div>
  </div>
)
