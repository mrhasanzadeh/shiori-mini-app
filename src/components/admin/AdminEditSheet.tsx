import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type AdminEditSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  side?: 'left' | 'right'
  className?: string
  bodyClassName?: string
}

export const AdminEditSheet = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = 'left',
  className,
  bodyClassName,
}: AdminEditSheetProps) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent dir="rtl" side={side} className={cn('flex h-full flex-col', className)}>
      <SheetHeader>
        <SheetTitle>{title}</SheetTitle>
        {description ? <SheetDescription>{description}</SheetDescription> : null}
      </SheetHeader>

      <div className={cn('flex flex-1 flex-col gap-4 overflow-y-auto p-4', bodyClassName)}>
        {children}
      </div>

      {footer ? <SheetFooter>{footer}</SheetFooter> : null}
    </SheetContent>
  </Sheet>
)

type AdminEditSheetActionsProps = {
  onSave: () => void
  onCancel: () => void
  saving?: boolean
  saveDisabled?: boolean
  saveLabel?: string
  cancelLabel?: string
}

export const AdminEditSheetActions = ({
  onSave,
  onCancel,
  saving = false,
  saveDisabled = false,
  saveLabel = 'ذخیره',
  cancelLabel = 'انصراف',
}: AdminEditSheetActionsProps) => (
  <div className="flex w-full flex-col gap-2">
    <Button type="button" size="lg" disabled={saving || saveDisabled} onClick={onSave}>
      {saving ? 'در حال ذخیره...' : saveLabel}
    </Button>
    <Button type="button" size="lg" variant="secondary" onClick={onCancel} disabled={saving}>
      {cancelLabel}
    </Button>
  </div>
)
