-- ==========================================
-- اسکریپت داده‌های تستی برای Shiori Mini App
-- ==========================================

-- پاک کردن داده‌های قبلی (اختیاری)
-- TRUNCATE TABLE anime_episodes CASCADE;
-- TRUNCATE TABLE anime_genres CASCADE;
-- TRUNCATE TABLE anime_studios CASCADE;
-- TRUNCATE TABLE genres CASCADE;
-- TRUNCATE TABLE studios CASCADE;
-- TRUNCATE TABLE anime CASCADE;

-- ==========================================
-- 1. اضافه کردن ژانرها
-- ==========================================
INSERT INTO genres (name) VALUES
('اکشن'),
('ماجراجویی'),
('کمدی'),
('درام'),
('فانتزی'),
('ترسناک'),
('معمایی'),
('عاشقانه'),
('علمی-تخیلی'),
('ورزشی'),
('ماوراء طبیعی'),
('روان‌شناختی'),
('مکانیکی'),
('تاریخی'),
('نظامی')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 2. اضافه کردن استودیوها
-- ==========================================
INSERT INTO studios (name) VALUES
('Wit Studio'),
('MAPPA'),
('ufotable'),
('Bones'),
('Madhouse'),
('Production I.G'),
('Kyoto Animation'),
('A-1 Pictures'),
('Studio Pierrot'),
('Toei Animation')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 3. اضافه کردن انیمه‌ها
-- ==========================================
INSERT INTO anime (title, title_fa, cover_image, description, status, type, total_episodes, score, season, start_date, end_date, created_at, updated_at) VALUES
('Attack on Titan', 'حمله به تایتان', 'https://cdn.myanimelist.net/images/anime/10/47347.jpg', 'داستان در دنیایی رخ می‌دهد که بشریت در برابر موجودات غول‌پیکری به نام تایتان‌ها زندگی می‌کند. این موجودات انسان‌ها را می‌خورند و بشر مجبور شده پشت دیوارهای عظیم پناه بگیرد.', 'FINISHED', 'TV', 75, 89, 'SPRING', '2013-04-07', '2021-04-09', NOW(), NOW()),

('Demon Slayer', 'کشنده شیاطین', 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg', 'تانجیرو کامادو پسری است که خانواده‌اش توسط شیاطین کشته می‌شوند و تنها خواهر کوچکش نزوکو زنده می‌ماند اما به شیطان تبدیل می‌شود. او تصمیم می‌گیرد کشنده شیاطین شود تا راهی برای بازگرداندن خواهرش به انسان پیدا کند.', 'FINISHED', 'TV', 26, 88, 'SPRING', '2019-04-06', '2019-09-28', NOW(), NOW()),

('Jujutsu Kaisen', 'جادوگری جوجوتسو', 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg', 'یوجی ایتادوری دانش‌آموزی است که توانایی‌های فیزیکی خارق‌العاده‌ای دارد. پس از خوردن انگشت یک نفرین قدرتمند، او وارد دنیای جادوگران جوجوتسو می‌شود.', 'RELEASING', 'TV', 47, 87, 'FALL', '2020-10-03', NULL, NOW(), NOW()),

('My Hero Academia', 'قهرمان من', 'https://cdn.myanimelist.net/images/anime/10/78745.jpg', 'در دنیایی که ۸۰٪ مردم دارای قدرت‌های ویژه هستند، ایزوکو میدوریا بدون قدرت متولد می‌شود اما رویای قهرمان شدن را دارد.', 'RELEASING', 'TV', 138, 82, 'SPRING', '2016-04-03', NULL, NOW(), NOW()),

('One Punch Man', 'مرد یک مشتی', 'https://cdn.myanimelist.net/images/anime/12/76049.jpg', 'سایتاما قهرمانی است که می‌تواند هر دشمنی را با یک مشت شکست دهد. او به دنبال حریفی می‌گردد که بتواند او را به چالش بکشد.', 'FINISHED', 'TV', 24, 85, 'FALL', '2015-10-05', '2019-07-02', NOW(), NOW()),

('Death Note', 'دفترچه مرگ', 'https://cdn.myanimelist.net/images/anime/9/9453.jpg', 'لایت یاگامی دانش‌آموزی نابغه است که دفترچه‌ای پیدا می‌کند که با نوشتن نام کسی در آن، آن شخص می‌میرد. او تصمیم می‌گیرد دنیا را از جنایتکاران پاک کند.', 'FINISHED', 'TV', 37, 86, 'FALL', '2006-10-04', '2007-06-27', NOW(), NOW()),

('Steins;Gate', 'دروازه اشتاین', 'https://cdn.myanimelist.net/images/anime/5/73199.jpg', 'گروهی از دانشمندان آماتور به طور تصادفی دستگاهی اختراع می‌کنند که می‌تواند پیام به گذشته بفرستد و تاریخ را تغییر دهد.', 'FINISHED', 'TV', 24, 90, 'SPRING', '2011-04-06', '2011-09-14', NOW(), NOW()),

('Fullmetal Alchemist: Brotherhood', 'کیمیاگر تمام عیار', 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg', 'دو برادر ادوارد و آلفونس الریک در تلاش برای بازگرداندن بدن‌های خود پس از یک آزمایش کیمیاگری ناموفق هستند.', 'FINISHED', 'TV', 64, 92, 'SPRING', '2009-04-05', '2010-07-04', NOW(), NOW()),

('Spy x Family', 'خانواده جاسوس', 'https://cdn.myanimelist.net/images/anime/1441/122795.jpg', 'یک جاسوس باید خانواده‌ای جعلی تشکیل دهد تا به مدرسه‌ای نفوذ کند. او یک قاتل را به عنوان همسر و یک دختر خواندگانی با قدرت خواندن ذهن انتخاب می‌کند.', 'RELEASING', 'TV', 37, 86, 'SPRING', '2022-04-09', NULL, NOW(), NOW()),

('Chainsaw Man', 'مرد اره برقی', 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg', 'دنجی پسری فقیر است که با شیطانی به نام پوچیتا دوست می‌شود. پس از کشته شدن، او با پوچیتا ادغام می‌شود و تبدیل به مرد اره برقی می‌شود.', 'FINISHED', 'TV', 12, 84, 'FALL', '2022-10-12', '2022-12-28', NOW(), NOW()),

('Violet Evergarden', 'ویولت اورگاردن', 'https://cdn.myanimelist.net/images/anime/1795/95088.jpg', 'ویولت سربازی است که پس از جنگ به عنوان نویسنده نامه مشغول به کار می‌شود تا احساسات انسانی را درک کند.', 'FINISHED', 'TV', 13, 85, 'WINTER', '2018-01-11', '2018-04-05', NOW(), NOW()),

('Mob Psycho 100', 'موب سایکو ۱۰۰', 'https://cdn.myanimelist.net/images/anime/8/87202.jpg', 'شیگئو کاگیاما دانش‌آموزی است با قدرت‌های روانی فوق‌العاده که سعی می‌کند زندگی عادی داشته باشد.', 'FINISHED', 'TV', 25, 87, 'SUMMER', '2016-07-12', '2019-04-01', NOW(), NOW()),

('Sword Art Online', 'شمشیر آنلاین', 'https://cdn.myanimelist.net/images/anime/11/39717.jpg', 'هزاران بازیکن در یک بازی واقعیت مجازی گیر می‌افتند و تنها راه خروج، تمام کردن بازی است.', 'FINISHED', 'TV', 96, 75, 'SUMMER', '2012-07-08', '2020-09-20', NOW(), NOW()),

('Tokyo Ghoul', 'غول توکیو', 'https://cdn.myanimelist.net/images/anime/5/64449.jpg', 'کن کانکی دانشجویی است که پس از یک حادثه به نیمه غول تبدیل می‌شود و باید در دنیای انسان‌ها و غول‌ها زندگی کند.', 'FINISHED', 'TV', 48, 78, 'SUMMER', '2014-07-04', '2018-12-25', NOW(), NOW()),

('Naruto', 'ناروتو', 'https://cdn.myanimelist.net/images/anime/13/17405.jpg', 'ناروتو اوزوماکی نینجای جوانی است که رویای هوکاگه شدن را دارد و می‌خواهد به قوی‌ترین نینجای دهکده تبدیل شود.', 'FINISHED', 'TV', 220, 79, 'FALL', '2002-10-03', '2007-02-08', NOW(), NOW())
ON CONFLICT (title) DO NOTHING;

-- ==========================================
-- 4. ارتباط انیمه‌ها با ژانرها
-- ==========================================
INSERT INTO anime_genres (anime_id, genre_id) VALUES
-- Attack on Titan
(1, 1), (1, 2), (1, 4), (1, 5),
-- Demon Slayer
(2, 1), (2, 2), (2, 5), (2, 11),
-- Jujutsu Kaisen
(3, 1), (3, 5), (3, 11),
-- My Hero Academia
(4, 1), (4, 3), (4, 11),
-- One Punch Man
(5, 1), (5, 3), (5, 11),
-- Death Note
(6, 7), (6, 12), (6, 11),
-- Steins;Gate
(7, 4), (7, 9), (7, 12),
-- Fullmetal Alchemist
(8, 1), (8, 2), (8, 4), (8, 5),
-- Spy x Family
(9, 1), (9, 3), (9, 7),
-- Chainsaw Man
(10, 1), (10, 6), (10, 11),
-- Violet Evergarden
(11, 4), (11, 5),
-- Mob Psycho 100
(12, 1), (12, 3), (12, 11),
-- Sword Art Online
(13, 1), (13, 2), (13, 8), (13, 5),
-- Tokyo Ghoul
(14, 1), (14, 4), (14, 6), (14, 11),
-- Naruto
(15, 1), (15, 2), (15, 3)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 5. ارتباط انیمه‌ها با استودیوها
-- ==========================================
INSERT INTO anime_studios (anime_id, studio_id) VALUES
(1, 1),  -- Attack on Titan - Wit Studio
(2, 3),  -- Demon Slayer - ufotable
(3, 2),  -- Jujutsu Kaisen - MAPPA
(4, 4),  -- My Hero Academia - Bones
(5, 5),  -- One Punch Man - Madhouse
(6, 5),  -- Death Note - Madhouse
(7, 1),  -- Steins;Gate - White Fox (using Wit as placeholder)
(8, 4),  -- Fullmetal Alchemist - Bones
(9, 1),  -- Spy x Family - Wit Studio
(10, 2), -- Chainsaw Man - MAPPA
(11, 7), -- Violet Evergarden - Kyoto Animation
(12, 4), -- Mob Psycho 100 - Bones
(13, 8), -- Sword Art Online - A-1 Pictures
(14, 9), -- Tokyo Ghoul - Studio Pierrot
(15, 9)  -- Naruto - Studio Pierrot
ON CONFLICT DO NOTHING;

-- ==========================================
-- 6. به‌روزرسانی sequence ها (اختیاری)
-- ==========================================
SELECT setval('anime_id_seq', (SELECT MAX(id) FROM anime));
SELECT setval('genres_id_seq', (SELECT MAX(id) FROM genres));
SELECT setval('studios_id_seq', (SELECT MAX(id) FROM studios));

-- ==========================================
-- پایان اسکریپت
-- ==========================================
-- حالا می‌توانید کوئری‌های زیر را برای تست اجرا کنید:
-- SELECT * FROM anime;
-- SELECT a.title_fa, g.name FROM anime a JOIN anime_genres ag ON a.id = ag.anime_id JOIN genres g ON ag.genre_id = g.id;
-- SELECT a.title_fa, s.name FROM anime a JOIN anime_studios ast ON a.id = ast.anime_id JOIN studios s ON ast.studio_id = s.id;
