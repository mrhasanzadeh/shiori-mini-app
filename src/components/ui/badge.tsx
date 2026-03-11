import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border border-white/10 px-2.5 py-0.5 text-xs font-medium text-white transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-white/10',
        secondary: 'bg-gray-950/40',
        outline: 'bg-transparent',
        success: 'bg-green-500/15 text-green-200 border-green-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
