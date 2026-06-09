export const formatUserListSaveError = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : String(error)

  if (msg.includes('hash_mismatch')) {
    return msg
  }

  if (msg.includes('invalid telegram init data')) {
    return msg.includes('(')
      ? msg
      : 'خطا در تأیید Telegram — توکن Vault باید همان bot مینی‌اپ باشد (BotFather → Mini Apps).'
  }

  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'دسترسی رد شد — معمولاً یعنی initData تأیید نشده. مینی‌اپ را از Telegram ببندید و دوباره باز کنید.'
  }

  if (msg.includes('Telegram initData یافت نشد')) {
    return msg
  }

  return msg.length > 200 ? `${msg.slice(0, 200)}…` : msg
}
