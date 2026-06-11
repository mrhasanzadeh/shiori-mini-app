import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BidiMode = 'latin' | 'auto'

type BidiTextProps<T extends ElementType> = {
  as?: T
  /** latin = force LTR isolate (English titles in RTL UI); auto = browser detects */
  mode?: BidiMode
  className?: string
  children: ReactNode
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className' | 'dir'>

/**
 * Isolates bidirectional text so weak chars (?, !, …) stay at the correct end
 * of Latin titles inside an RTL layout.
 */
export function BidiText<T extends ElementType = 'span'>({
  as,
  mode = 'latin',
  className,
  children,
  ...props
}: BidiTextProps<T>) {
  const Tag = as ?? 'span'

  return (
    <Tag
      dir={mode === 'auto' ? 'auto' : 'ltr'}
      className={cn(mode === 'latin' && 'bidi-latin', className)}
      {...props}
    >
      {children}
    </Tag>
  )
}
