-- وضعیت نمایش/فعالیت مترجم در پروفایل و پنل ادمین

ALTER TABLE public.translators
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.translators.is_active IS 'false = مترجم غیرفعال (نمایش در پروفایل با badge)';
