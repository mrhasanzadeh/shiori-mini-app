import * as React from 'react'
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from 'react-day-picker'
import { addMonths } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  buttonVariant = 'ghost',
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}) {
  const defaultClassNames = getDefaultClassNames()
  const currentYear = new Date().getFullYear()
  const fromYear = (props as any).fromYear ?? currentYear - 80
  const toYear = (props as any).toYear ?? currentYear + 10

  const selectedProp = (props as any).selected
  const selectedSingleDate = selectedProp instanceof Date ? selectedProp : undefined

  const isControlledMonth = props.month instanceof Date
  const [internalMonth, setInternalMonth] = React.useState<Date>(
    (props.month as Date | undefined) ??
      (props.defaultMonth as Date | undefined) ??
      selectedSingleDate ??
      new Date()
  )
  const month = (props.month as Date | undefined) ?? internalMonth

  React.useEffect(() => {
    if (isControlledMonth) return
    if (!selectedSingleDate) return
    setInternalMonth(selectedSingleDate)
  }, [isControlledMonth, selectedSingleDate])

  const handleMonthChange = React.useCallback(
    (next: Date) => {
      if (!isControlledMonth) setInternalMonth(next)
      props.onMonthChange?.(next)
    },
    [isControlledMonth, props]
  )

  const years = React.useMemo(() => {
    const out: number[] = []
    for (let y = fromYear; y <= toYear; y++) out.push(y)
    return out
  }, [fromYear, toYear])

  const monthItems = React.useMemo(() => {
    const base = new Date(2020, 0, 1)
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(base)
      d.setMonth(i)
      const label = d.toLocaleString(locale?.code, { month: 'short' })
      return { value: String(i), label }
    })
  }, [locale?.code])

  return (
    <div className={cn('rounded-lg bg-background p-3 text-foreground', className)}>
      {captionLayout === 'dropdown' && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            variant={buttonVariant}
            size="icon"
            onClick={() => handleMonthChange(addMonths(month, -1))}
            aria-label="ماه قبل"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <Select
              value={String(month.getMonth())}
              onValueChange={(v) => {
                const next = new Date(month)
                next.setMonth(Number(v))
                handleMonthChange(next)
              }}
            >
              <SelectTrigger className="h-8 gap-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthItems.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(month.getFullYear())}
              onValueChange={(v) => {
                const next = new Date(month)
                next.setFullYear(Number(v))
                handleMonthChange(next)
              }}
            >
              <SelectTrigger className="h-8 gap-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={String(y)} value={String(y)}>
                    {String(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant={buttonVariant}
            size="icon"
            onClick={() => handleMonthChange(addMonths(month, 1))}
            aria-label="ماه بعد"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      <DayPicker
        showOutsideDays={showOutsideDays}
        fromYear={(props as any).fromYear ?? fromYear}
        toYear={(props as any).toYear ?? toYear}
        month={month}
        onMonthChange={handleMonthChange}
        captionLayout="label"
        locale={locale}
        formatters={{
          formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: 'short' }),
          ...formatters,
        }}
        className={cn(
          'group/calendar',
          String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
          String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`
        )}
        classNames={{
          root: cn('w-fit', defaultClassNames.root),
          months: cn('relative flex flex-col sm:flex-row gap-4', defaultClassNames.months),
          month: cn('space-y-4', defaultClassNames.month),
          month_caption: cn('hidden', defaultClassNames.month_caption),
          nav: cn('hidden', defaultClassNames.nav),
          button_previous: cn('hidden', defaultClassNames.button_previous),
          button_next: cn('hidden', defaultClassNames.button_next),
          dropdowns: cn('hidden', defaultClassNames.dropdowns),
          dropdown_root: cn('hidden', defaultClassNames.dropdown_root),
          dropdown: cn('hidden', defaultClassNames.dropdown),
          caption_label: cn('hidden', defaultClassNames.caption_label),
          table: 'w-full border-collapse',
          weekdays: cn('flex', defaultClassNames.weekdays),
          weekday: cn(
            'flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none',
            defaultClassNames.weekday
          ),
          week: cn('mt-2 flex w-full', defaultClassNames.week),
          week_number_header: cn('w-9 select-none', defaultClassNames.week_number_header),
          week_number: cn(
            'text-[0.8rem] text-muted-foreground select-none',
            defaultClassNames.week_number
          ),
          day: cn(
            'group/day relative h-9 w-9 p-0 text-center text-sm select-none',
            props.showWeekNumber
              ? '[&:nth-child(2)[data-selected=true]_button]:rounded-l-md'
              : '[&:first-child[data-selected=true]_button]:rounded-l-md',
            defaultClassNames.day
          ),
          range_start: cn(
            'relative isolate z-0 rounded-l-md bg-muted',
            defaultClassNames.range_start
          ),
          range_middle: cn('rounded-none', defaultClassNames.range_middle),
          range_end: cn('relative isolate z-0 rounded-r-md bg-muted', defaultClassNames.range_end),
          today: cn(
            'rounded-md bg-muted text-foreground data-[selected=true]:rounded-none',
            defaultClassNames.today
          ),
          outside: cn(
            'text-muted-foreground aria-selected:text-muted-foreground',
            defaultClassNames.outside
          ),
          disabled: cn('text-muted-foreground opacity-50', defaultClassNames.disabled),
          hidden: cn('invisible', defaultClassNames.hidden),
          ...classNames,
        }}
        components={{
          Root: ({ className, rootRef, ...props }) => {
            return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
          },
          Chevron: ({ className, orientation, ...props }) => {
            if (orientation === 'left') {
              return <ChevronRightIcon className={cn('size-4', className)} {...props} />
            }

            if (orientation === 'right') {
              return <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            }

            return <ChevronDownIcon className={cn('size-4', className)} {...props} />
          },
          DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
          WeekNumber: ({ children, ...props }) => {
            return (
              <td {...props}>
                <div className="flex h-9 w-9 items-center justify-center text-center">
                  {children}
                </div>
              </td>
            )
          },
          ...components,
        }}
        {...props}
      />
    </div>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        'relative isolate z-10 flex h-9 w-9 flex-col gap-1 border-0 p-0 font-normal leading-none group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-ring data-[range-end=true]:rounded-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground hover:bg-accent hover:text-accent-foreground',
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
