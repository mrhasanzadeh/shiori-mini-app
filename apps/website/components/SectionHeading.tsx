type SectionHeadingProps = {
  title: string
  subtitle?: string
  count?: string
}

export const SectionHeading = ({ title, subtitle, count }: SectionHeadingProps) => (
  <div className="flex items-end justify-between gap-4">
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-gradient-to-l from-primary to-transparent" aria-hidden />
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
      </div>
      {subtitle ? <p className="text-sm text-zinc-400">{subtitle}</p> : null}
    </div>
    {count ? (
      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs tabular-nums text-zinc-400">
        {count}
      </span>
    ) : null}
  </div>
)
