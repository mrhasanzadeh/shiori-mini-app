import { useEffect, useState } from 'react'
import { MinusSignIcon, PlusSignIcon, StarIcon } from 'hugeicons-react'
import type { FavoriteProgress } from '../store/animeStore'
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

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  image: string
  episodesCount: number
  progress: FavoriteProgress
  saving?: boolean
  onSave: (progress: FavoriteProgress) => void
  onRemove?: () => void
}

const FavoriteAnimeEditor = ({
  open,
  onOpenChange,
  title,
  image,
  episodesCount,
  progress,
  saving = false,
  onSave,
  onRemove,
}: Props) => {
  const maxEpisodes = Math.max(episodesCount, 1)
  const [episodesWatched, setEpisodesWatched] = useState(progress.episodesWatched)
  const [userRating, setUserRating] = useState<number | null>(progress.userRating)

  useEffect(() => {
    if (!open) return
    setEpisodesWatched(progress.episodesWatched)
    setUserRating(progress.userRating)
  }, [open, progress.episodesWatched, progress.userRating])

  const progressPercent = Math.min(100, Math.round((episodesWatched / maxEpisodes) * 100))

  const bumpEpisodes = (delta: number) => {
    setEpisodesWatched((prev) => Math.min(maxEpisodes, Math.max(0, prev + delta)))
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 max-h-[88vh] overflow-y-auto">
        <SheetHeader className="text-right space-y-1">
          <SheetTitle className="text-base leading-7 line-clamp-2">{title}</SheetTitle>
          <SheetDescription>پیشرفت تماشا و امتیاز شخصی</SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex gap-3 items-start">
          <div className="w-16 aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted shrink-0">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">قسمت‌های دیده‌شده</p>
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0"
                  disabled={episodesWatched <= 0}
                  onClick={() => bumpEpisodes(-1)}
                >
                  <MinusSignIcon className="w-4 h-4" />
                </Button>
                <div className="text-center flex-1">
                  <p className="text-lg font-bold tabular-nums">
                    {toPersianNumber(episodesWatched)}
                    <span className="text-muted-foreground text-sm font-normal mx-1">/</span>
                    {toPersianNumber(maxEpisodes)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">قسمت</p>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 shrink-0"
                  disabled={episodesWatched >= maxEpisodes}
                  onClick={() => bumpEpisodes(1)}
                >
                  <PlusSignIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">امتیاز شما</p>
              <div className="grid grid-cols-5 gap-1.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                  const active = userRating === score
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setUserRating(active ? null : score)}
                      className={cn(
                        'h-9 rounded-lg border text-sm font-semibold tabular-nums transition-colors',
                        active
                          ? 'border-primary-400/50 bg-primary-500/20 text-primary-300'
                          : 'border-border bg-card/60 text-muted-foreground hover:bg-muted/50'
                      )}
                    >
                      {toPersianNumber(score)}
                    </button>
                  )
                })}
              </div>
              {userRating != null && (
                <p className="mt-2 text-[11px] text-primary-300 flex items-center gap-1">
                  <StarIcon className="w-3.5 h-3.5 fill-primary-400 text-primary-400" />
                  {toPersianNumber(userRating)} از ۱۰
                </p>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6 flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            className="w-full"
            disabled={saving}
            onClick={() => onSave({ episodesWatched, userRating })}
          >
            {saving ? 'در حال ذخیره…' : 'ذخیره'}
          </Button>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              disabled={saving}
              onClick={onRemove}
            >
              حذف از علاقه‌مندی‌ها
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export default FavoriteAnimeEditor
