const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export const toPersianNumber = (value: number | string) =>
  String(value).replace(/[0-9]/g, (d) => persianDigits[Number(d)])

export const genreLabel = (g: { name_fa?: string; name_en?: string; slug: string }) =>
  g.name_fa || g.name_en || g.slug

export const truncateText = (text: string, max = 160) => {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1).trim()}…`
}

export const formatSeriesMemberLabel = (member: {
  sort_order: number
  label_fa: string | null
}) => {
  const fromAdmin = String(member.label_fa ?? '').trim()
  if (fromAdmin) return toPersianNumber(fromAdmin)
  return `فصل ${toPersianNumber(member.sort_order)}`
}
