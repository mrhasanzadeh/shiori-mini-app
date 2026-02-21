# راهنمای راه‌اندازی Supabase

## مراحل اجرا

### 1. ورود به Supabase
1. به [Supabase Dashboard](https://app.supabase.com) بروید
2. پروژه خود را انتخاب کنید
3. از منوی سمت چپ، گزینه **SQL Editor** را انتخاب کنید

### 2. اجرای اسکریپت SQL
1. فایل `supabase-final-data.sql` را باز کنید
2. تمام محتوای آن را کپی کنید
3. در SQL Editor پیست کنید
4. دکمه **Run** را بزنید

### 3. بررسی داده‌ها
پس از اجرای موفق، می‌توانید با کوئری‌های زیر داده‌ها را بررسی کنید:

#### مشاهده انیمه‌ها با ژانرها
```sql
SELECT a.title, a.status, a.average_score, STRING_AGG(DISTINCT g.name, ', ') as genres
FROM anime a
LEFT JOIN anime_genres ag ON a.id = ag.anime_id
LEFT JOIN genres g ON ag.genre_id = g.id
GROUP BY a.id, a.title, a.status, a.average_score
ORDER BY a.average_score DESC
LIMIT 10;
```

#### مشاهده انیمه‌ها با استودیوها
```sql
SELECT a.title, STRING_AGG(DISTINCT s.name, ', ') as studios
FROM anime a
LEFT JOIN anime_studios ast ON a.id = ast.anime_id
LEFT JOIN studios s ON ast.studio_id = s.id
GROUP BY a.id, a.title
LIMIT 10;
```

#### مشاهده قسمت‌های یک انیمه
```sql
SELECT a.title, ae.episode_number, ae.title as episode_title, ae.air_date
FROM anime a
JOIN anime_episodes ae ON a.id = ae.anime_id
WHERE a.title = 'Attack on Titan'
ORDER BY ae.episode_number;
```

#### آمار کلی
```sql
SELECT 
  (SELECT COUNT(*) FROM anime) as total_anime,
  (SELECT COUNT(*) FROM genres) as total_genres,
  (SELECT COUNT(*) FROM studios) as total_studios,
  (SELECT COUNT(*) FROM anime_episodes) as total_episodes;
```

## داده‌های موجود

### انیمه‌ها (15 عنوان)
- Attack on Titan (75 قسمت) - 15 قسمت اول در دیتابیس
- Demon Slayer (26 قسمت) - تمام قسمت‌ها
- Jujutsu Kaisen (47 قسمت) - 24 قسمت فصل اول
- My Hero Academia (138 قسمت) - 13 قسمت فصل اول
- One Punch Man (24 قسمت) - 12 قسمت فصل اول
- Death Note
- Steins;Gate
- Fullmetal Alchemist: Brotherhood
- Spy x Family
- Chainsaw Man
- Violet Evergarden
- Mob Psycho 100
- Sword Art Online
- Tokyo Ghoul
- Naruto

### ژانرها (12 ژانر)
اکشن، ماجراجویی، کمدی، درام، فانتزی، ترسناک، معمایی، عاشقانه، علمی-تخیلی، ورزشی، ماوراء طبیعی، روان‌شناختی

### استودیوها (10 استودیو)
Wit Studio, MAPPA, ufotable, Bones, Madhouse, Production I.G, Kyoto Animation, A-1 Pictures, Studio Pierrot, Toei Animation

### قسمت‌ها
- **Attack on Titan**: 15 قسمت اول با توضیحات فارسی
- **Demon Slayer**: 26 قسمت کامل فصل اول
- **Jujutsu Kaisen**: 24 قسمت فصل اول
- **My Hero Academia**: 13 قسمت فصل اول
- **One Punch Man**: 12 قسمت فصل اول

جمعاً **90 قسمت** با جزئیات کامل (عنوان، شماره، خلاصه، تاریخ پخش، مدت زمان)

## نکات مهم

1. ✅ تمام روابط بین جداول به درستی تنظیم شده است
2. ✅ از `ON CONFLICT DO NOTHING` استفاده شده تا در صورت اجرای مجدد، خطا ندهد
3. ✅ تمام فیلدها با ساختار دیتابیس شما سازگار است
4. ✅ توضیحات به زبان فارسی برای تجربه کاربری بهتر

## تست اپلیکیشن

پس از اجرای SQL:
1. مطمئن شوید متغیرهای محیطی در `.env` تنظیم شده‌اند
2. اپلیکیشن را اجرا کنید: `npm run dev`
3. صفحه اصلی باید انیمه‌ها را نمایش دهد
4. صفحه جزئیات هر انیمه باید شامل:
   - اطلاعات کامل انیمه
   - لیست ژانرها
   - لیست استودیوها
   - لیست قسمت‌ها (در صورت وجود)

## عیب‌یابی

اگر داده‌ای نمایش داده نشد:
1. در Supabase Dashboard به **Table Editor** بروید
2. جداول را بررسی کنید که داده دارند
3. در **Authentication > Policies** مطمئن شوید RLS فعال است
4. Console مرورگر را برای خطاهای API بررسی کنید
