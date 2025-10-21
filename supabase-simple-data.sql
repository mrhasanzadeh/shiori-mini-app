-- ==========================================
-- اسکریپت ساده داده‌های تستی (با UUID)
-- ==========================================

-- 1. ژانرها
INSERT INTO genres (name) VALUES
('اکشن'), ('ماجراجویی'), ('کمدی'), ('درام'), ('فانتزی'),
('ترسناک'), ('معمایی'), ('عاشقانه'), ('علمی-تخیلی'), ('ماوراء طبیعی')
ON CONFLICT (name) DO NOTHING;

-- 2. استودیوها
INSERT INTO studios (name) VALUES
('Wit Studio'), ('MAPPA'), ('ufotable'), ('Bones'), ('Madhouse')
ON CONFLICT (name) DO NOTHING;

-- 3. انیمه‌ها
INSERT INTO anime (title, title_fa, cover_image, description, status, type, total_episodes, score, season) VALUES
('Attack on Titan', 'حمله به تایتان', 'https://cdn.myanimelist.net/images/anime/10/47347.jpg', 'بشریت در برابر تایتان‌ها', 'FINISHED', 'TV', 75, 89, 'SPRING'),
('Demon Slayer', 'کشنده شیاطین', 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg', 'تانجیرو و نبرد با شیاطین', 'FINISHED', 'TV', 26, 88, 'SPRING'),
('Jujutsu Kaisen', 'جادوگری جوجوتسو', 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg', 'یوجی و دنیای نفرین‌ها', 'RELEASING', 'TV', 47, 87, 'FALL'),
('Death Note', 'دفترچه مرگ', 'https://cdn.myanimelist.net/images/anime/9/9453.jpg', 'لایت و دفترچه مرگ', 'FINISHED', 'TV', 37, 86, 'FALL'),
('One Punch Man', 'مرد یک مشتی', 'https://cdn.myanimelist.net/images/anime/12/76049.jpg', 'سایتاما قهرمان', 'FINISHED', 'TV', 24, 85, 'FALL')
ON CONFLICT (title) DO NOTHING;

-- 4. ارتباط انیمه‌ها با ژانرها
INSERT INTO anime_genres (anime_id, genre_id)
SELECT a.id, g.id FROM anime a, genres g
WHERE (a.title = 'Attack on Titan' AND g.name IN ('اکشن', 'درام'))
   OR (a.title = 'Demon Slayer' AND g.name IN ('اکشن', 'فانتزی'))
   OR (a.title = 'Jujutsu Kaisen' AND g.name IN ('اکشن', 'ماوراء طبیعی'))
   OR (a.title = 'Death Note' AND g.name IN ('معمایی', 'ماوراء طبیعی'))
   OR (a.title = 'One Punch Man' AND g.name IN ('اکشن', 'کمدی'))
ON CONFLICT DO NOTHING;

-- 5. ارتباط انیمه‌ها با استودیوها
INSERT INTO anime_studios (anime_id, studio_id)
SELECT a.id, s.id FROM anime a, studios s
WHERE (a.title = 'Attack on Titan' AND s.name = 'Wit Studio')
   OR (a.title = 'Demon Slayer' AND s.name = 'ufotable')
   OR (a.title = 'Jujutsu Kaisen' AND s.name = 'MAPPA')
   OR (a.title = 'Death Note' AND s.name = 'Madhouse')
   OR (a.title = 'One Punch Man' AND s.name = 'Madhouse')
ON CONFLICT DO NOTHING;
