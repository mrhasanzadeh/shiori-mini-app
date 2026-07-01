import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  hardsubLanguageLabel,
  type HardsubLanguage,
} from '@/utils/animeMediaTags'

type MediaSpecTagsProps = {
  hardsubLanguage: HardsubLanguage
  className?: string
}

export function MediaSpecTags({ hardsubLanguage, className }: MediaSpecTagsProps) {
  const hardsubLabel = hardsubLanguageLabel(hardsubLanguage)
  const isEnglish = hardsubLanguage === 'en'

  return (
    <Badge
      variant={isEnglish ? 'premium' : 'secondary'}
      className={cn(
        'shrink-0 rounded-full px-2 py-0 text-[10px] font-medium leading-5',
        isEnglish && 'font-semibold',
        className
      )}
    >
      {hardsubLabel}
    </Badge>
  )
}
