-- تعداد علاقه‌مندی هر انیمه (همه کاربران) — برای اسلایدر «محبوب‌ترین‌ها»
-- این فایل را در Postgres اجرا کنید.

CREATE OR REPLACE FUNCTION public.get_anime_favorite_counts()
RETURNS TABLE(anime_id UUID, favorite_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT anime_id, COUNT(*)::bigint AS favorite_count
  FROM user_anime_list
  GROUP BY anime_id
  ORDER BY favorite_count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_anime_favorite_counts() TO anon, authenticated;
