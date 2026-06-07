import { Link, type LinkProps } from 'react-router-dom'
import { prefetchAnimeDetail } from '../hooks/queries/prefetch'

type AnimePrefetchLinkProps = LinkProps & {
  animeId: string | number
}

/** لینک انیمه با prefetch جزئیات هنگام hover/touch */
const AnimePrefetchLink = ({
  animeId,
  onPointerEnter,
  onTouchStart,
  ...props
}: AnimePrefetchLinkProps) => {
  const warmCache = () => prefetchAnimeDetail(animeId)

  return (
    <Link
      {...props}
      onPointerEnter={(e) => {
        warmCache()
        onPointerEnter?.(e)
      }}
      onTouchStart={(e) => {
        warmCache()
        onTouchStart?.(e)
      }}
    />
  )
}

export default AnimePrefetchLink
