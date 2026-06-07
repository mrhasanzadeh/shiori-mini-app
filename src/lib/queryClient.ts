import { QueryClient } from '@tanstack/react-query'

/** ۵ دقیقه — در این مدت با برگشت به صفحه دوباره fetch نمی‌زند */
export const STALE_TIME_MS = 5 * 60 * 1000

/** ۳۰ دقیقه — داده از cache حذف می‌شود اگر استفاده نشود */
export const GC_TIME_MS = 30 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: GC_TIME_MS,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
