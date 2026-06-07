import { useCallback, useEffect, useRef, useState } from 'react'
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

const DISMISS_DRAG_PX = 80
const MAX_UPWARD_DRAG_PX = 24

const toPersianNumber = (num: number | string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']
  return String(num).replace(/[0-9]/g, (w) => persianDigits[+w])
}

const dragTranslateY = (offset: number) => {
  if (offset > 0) return offset
  if (offset < 0) return offset * 0.35
  return 0
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
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isClosingByDrag, setIsClosingByDrag] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragOffsetRef = useRef(0)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    dragOffsetRef.current = dragOffset
  }, [dragOffset])

  useEffect(() => {
    if (!open) return
    setEpisodesWatched(progress.episodesWatched)
    setUserRating(progress.userRating)
  }, [open, progress.episodesWatched, progress.userRating])

  useEffect(() => {
    if (open) return
    setDragOffset(0)
    setIsDragging(false)
    setIsClosingByDrag(false)
    dragOffsetRef.current = 0
    isDraggingRef.current = false
  }, [open])

  const progressPercent = Math.min(100, Math.round((episodesWatched / maxEpisodes) * 100))

  const bumpEpisodes = (delta: number) => {
    setEpisodesWatched((prev) => Math.min(maxEpisodes, Math.max(0, prev + delta)))
  }

  const setDrag = (offset: number) => {
    dragOffsetRef.current = offset
    setDragOffset(offset)
  }

  const finishDrag = useCallback(() => {
    const offset = dragOffsetRef.current
    isDraggingRef.current = false
    setIsDragging(false)

    if (offset > DISMISS_DRAG_PX) {
      const height = sheetRef.current?.getBoundingClientRect().height ?? 480
      setIsClosingByDrag(true)
      setDrag(height + 32)
      window.setTimeout(() => {
        onOpenChange(false)
      }, 300)
      return
    }

    setDrag(0)
  }, [onOpenChange])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (saving) return
    event.preventDefault()
    dragStartY.current = event.clientY
    isDraggingRef.current = true
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    const delta = event.clientY - dragStartY.current
    const next = delta >= 0 ? delta : Math.max(-MAX_UPWARD_DRAG_PX, delta)
    setDrag(next)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    finishDrag()
  }

  const dragY = dragTranslateY(dragOffset)
  const isSheetMoved = dragOffset !== 0 || isDragging || isClosingByDrag

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={sheetRef}
        side="bottom"
        overlayClassName={cn(isSheetMoved && 'transition-none')}
        overlayStyle={
          dragY > 0
            ? { opacity: Math.max(0, 0.8 * (1 - dragY / 420)) }
            : undefined
        }
        className={cn(
          'flex max-h-[88vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-background p-0 pb-8',
          isSheetMoved && '[animation:none!important]',
          !isDragging &&
            dragOffset !== 0 &&
            'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]'
        )}
        style={isSheetMoved ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div
          className="flex touch-none cursor-grab flex-col active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label="کشیدن برای بستن"
        >
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/35" />
          </div>

          <SheetHeader className="space-y-1 border-b-0 px-4 pb-0 pt-0 text-right">
            <SheetTitle className="line-clamp-2 text-base leading-7">{title}</SheetTitle>
            <SheetDescription>پیشرفت تماشا و امتیاز شخصی</SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="mt-4 flex items-start gap-3">
            <div className="aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              <img src={image} alt="" className="h-full w-full object-cover" />
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">قسمت‌های دیده‌شده</p>
                <div className="flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 shrink-0"
                    disabled={episodesWatched <= 0}
                    onClick={() => bumpEpisodes(-1)}
                  >
                    <MinusSignIcon className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold tabular-nums">
                      {toPersianNumber(episodesWatched)}
                      <span className="mx-1 text-sm font-normal text-muted-foreground">/</span>
                      {toPersianNumber(maxEpisodes)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">قسمت</p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 shrink-0"
                    disabled={episodesWatched >= maxEpisodes}
                    onClick={() => bumpEpisodes(1)}
                  >
                    <PlusSignIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">امتیاز شما</p>
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
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-primary-300">
                    <StarIcon className="h-3.5 w-3.5 fill-primary-400 text-primary-400" />
                    {toPersianNumber(userRating)} از ۱۰
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-2 flex-col gap-2 border-t-0 px-4 sm:flex-col">
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
              variant="destructive"
              className="w-full"
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
