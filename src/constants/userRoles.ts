export const APP_USER_ROLES = ['user', 'moderator', 'admin'] as const

export type AppUserRole = (typeof APP_USER_ROLES)[number]

export const APP_USER_ROLE_LABELS: Record<AppUserRole, string> = {
  user: 'کاربر',
  moderator: 'مدیر محتوا',
  admin: 'ادمین',
}

export const isAppUserRole = (value: unknown): value is AppUserRole =>
  typeof value === 'string' && (APP_USER_ROLES as readonly string[]).includes(value)

export const normalizeAppUserRole = (value: unknown): AppUserRole =>
  isAppUserRole(value) ? value : 'user'

export const roleBadgeVariant = (
  role: AppUserRole
): 'admin' | 'outline' | 'secondary' => {
  if (role === 'admin') return 'admin'
  if (role === 'moderator') return 'outline'
  return 'secondary'
}
