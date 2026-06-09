export const formatUserListSaveError = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : String(error)

  if (msg.includes('invalid telegram init data')) {
    return 'خطا در تأیید Telegram — در Supabase Vault مقدار secret با نام telegram_bot_token باید دقیقاً همان API token ربات مینی‌اپ (BotFather) باشد.'
  }

  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'دسترسی رد شد — مینی‌اپ را فقط از داخل Telegram باز کنید.'
  }

  if (msg.includes('Telegram initData یافت نشد')) {
    return msg
  }

  const withoutEdge = msg.split('| edge:')[0]?.trim() ?? msg
  return withoutEdge.length > 160 ? `${withoutEdge.slice(0, 160)}…` : withoutEdge
}
