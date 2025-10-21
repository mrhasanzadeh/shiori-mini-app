-- ==========================================
-- اسکریپت نهایی داده‌های تستی (سازگار با ساختار واقعی)
-- ==========================================

-- 1. ژانرها
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
('روان‌شناختی')
ON CONFLICT (name) DO NOTHING;

-- 2. استودیوها
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

-- 3. انیمه‌ها (با فیلدهای صحیح)
INSERT INTO anime (title, title_ja, synopsis, status, season, episodes, aired_from, aired_to, image, banner_image, popularity, category, average_score) VALUES
('Attack on Titan', '進撃の巨人', 'داستان در دنیایی رخ می‌دهد که بشریت در برابر موجودات غول‌پیکری به نام تایتان‌ها زندگی می‌کند.', 'completed', 'spring', 75, '2013-04-07', '2021-04-09', 'https://cdn.myanimelist.net/images/anime/10/47347.jpg', 'https://cdn.myanimelist.net/images/anime/10/47347.jpg', 95000, 'popular', 89),

('Demon Slayer', '鬼滅の刃', 'تانجیرو کامادو پسری است که خانواده‌اش توسط شیاطین کشته می‌شوند و تنها خواهر کوچکش نزوکو زنده می‌ماند.', 'completed', 'spring', 26, '2019-04-06', '2019-09-28', 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg', 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg', 92000, 'popular', 88),

('Jujutsu Kaisen', '呪術廻戦', 'یوجی ایتادوری دانش‌آموزی است که توانایی‌های فیزیکی خارق‌العاده‌ای دارد.', 'ongoing', 'fall', 47, '2020-10-03', NULL, 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg', 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg', 88000, 'ongoing', 87),

('My Hero Academia', '僕のヒーローアカデミア', 'در دنیایی که ۸۰٪ مردم دارای قدرت‌های ویژه هستند، ایزوکو میدوریا بدون قدرت متولد می‌شود.', 'ongoing', 'spring', 138, '2016-04-03', NULL, 'https://cdn.myanimelist.net/images/anime/10/78745.jpg', 'https://cdn.myanimelist.net/images/anime/10/78745.jpg', 85000, 'ongoing', 82),

('One Punch Man', 'ワンパンマン', 'سایتاما قهرمانی است که می‌تواند هر دشمنی را با یک مشت شکست دهد.', 'completed', 'fall', 24, '2015-10-05', '2019-07-02', 'https://cdn.myanimelist.net/images/anime/12/76049.jpg', 'https://cdn.myanimelist.net/images/anime/12/76049.jpg', 90000, 'popular', 85),

('Death Note', 'デスノート', 'لایت یاگامی دانش‌آموزی نابغه است که دفترچه‌ای پیدا می‌کند که با نوشتن نام کسی در آن، آن شخص می‌میرد.', 'completed', 'fall', 37, '2006-10-04', '2007-06-27', 'https://cdn.myanimelist.net/images/anime/9/9453.jpg', 'https://cdn.myanimelist.net/images/anime/9/9453.jpg', 87000, 'popular', 86),

('Steins;Gate', 'シュタインズ・ゲート', 'گروهی از دانشمندان آماتور به طور تصادفی دستگاهی اختراع می‌کنند که می‌تواند پیام به گذشته بفرستد.', 'completed', 'spring', 24, '2011-04-06', '2011-09-14', 'https://cdn.myanimelist.net/images/anime/5/73199.jpg', 'https://cdn.myanimelist.net/images/anime/5/73199.jpg', 82000, 'popular', 90),

('Fullmetal Alchemist: Brotherhood', '鋼の錬金術師', 'دو برادر ادوارد و آلفونس الریک در تلاش برای بازگرداندن بدن‌های خود هستند.', 'completed', 'spring', 64, '2009-04-05', '2010-07-04', 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg', 'https://cdn.myanimelist.net/images/anime/1223/96541.jpg', 93000, 'popular', 92),

('Spy x Family', 'スパイファミリー', 'یک جاسوس باید خانواده‌ای جعلی تشکیل دهد تا به مدرسه‌ای نفوذ کند.', 'ongoing', 'spring', 37, '2022-04-09', NULL, 'https://cdn.myanimelist.net/images/anime/1441/122795.jpg', 'https://cdn.myanimelist.net/images/anime/1441/122795.jpg', 91000, 'ongoing', 86),

('Chainsaw Man', 'チェンソーマン', 'دنجی پسری فقیر است که با شیطانی به نام پوچیتا دوست می‌شود.', 'completed', 'fall', 12, '2022-10-12', '2022-12-28', 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg', 'https://cdn.myanimelist.net/images/anime/1806/126216.jpg', 89000, 'popular', 84),

('Violet Evergarden', 'ヴァイオレット・エヴァーガーデン', 'ویولت سربازی است که پس از جنگ به عنوان نویسنده نامه مشغول به کار می‌شود.', 'completed', 'winter', 13, '2018-01-11', '2018-04-05', 'https://cdn.myanimelist.net/images/anime/1795/95088.jpg', 'https://cdn.myanimelist.net/images/anime/1795/95088.jpg', 78000, 'popular', 85),

('Mob Psycho 100', 'モブサイコ100', 'شیگئو کاگیاما دانش‌آموزی است با قدرت‌های روانی فوق‌العاده.', 'completed', 'summer', 25, '2016-07-12', '2019-04-01', 'https://cdn.myanimelist.net/images/anime/8/87202.jpg', 'https://cdn.myanimelist.net/images/anime/8/87202.jpg', 81000, 'popular', 87),

('Sword Art Online', 'ソードアート・オンライン', 'هزاران بازیکن در یک بازی واقعیت مجازی گیر می‌افتند.', 'completed', 'summer', 96, '2012-07-08', '2020-09-20', 'https://cdn.myanimelist.net/images/anime/11/39717.jpg', 'https://cdn.myanimelist.net/images/anime/11/39717.jpg', 86000, 'popular', 75),

('Tokyo Ghoul', '東京喰種', 'کن کانکی دانشجویی است که پس از یک حادثه به نیمه غول تبدیل می‌شود.', 'completed', 'summer', 48, '2014-07-04', '2018-12-25', 'https://cdn.myanimelist.net/images/anime/5/64449.jpg', 'https://cdn.myanimelist.net/images/anime/5/64449.jpg', 84000, 'popular', 78),

('Naruto', 'ナルト', 'ناروتو اوزوماکی نینجای جوانی است که رویای هوکاگه شدن را دارد.', 'completed', 'fall', 220, '2002-10-03', '2007-02-08', 'https://cdn.myanimelist.net/images/anime/13/17405.jpg', 'https://cdn.myanimelist.net/images/anime/13/17405.jpg', 94000, 'popular', 79);

-- 4. ارتباط انیمه‌ها با ژانرها
INSERT INTO anime_genres (anime_id, genre_id)
SELECT a.id, g.id FROM anime a, genres g
WHERE (a.title = 'Attack on Titan' AND g.name IN ('اکشن', 'درام', 'فانتزی'))
   OR (a.title = 'Demon Slayer' AND g.name IN ('اکشن', 'ماجراجویی', 'فانتزی'))
   OR (a.title = 'Jujutsu Kaisen' AND g.name IN ('اکشن', 'فانتزی', 'ماوراء طبیعی'))
   OR (a.title = 'My Hero Academia' AND g.name IN ('اکشن', 'کمدی', 'ماوراء طبیعی'))
   OR (a.title = 'One Punch Man' AND g.name IN ('اکشن', 'کمدی', 'ماوراء طبیعی'))
   OR (a.title = 'Death Note' AND g.name IN ('معمایی', 'روان‌شناختی', 'ماوراء طبیعی'))
   OR (a.title = 'Steins;Gate' AND g.name IN ('درام', 'علمی-تخیلی', 'روان‌شناختی'))
   OR (a.title = 'Fullmetal Alchemist: Brotherhood' AND g.name IN ('اکشن', 'ماجراجویی', 'درام', 'فانتزی'))
   OR (a.title = 'Spy x Family' AND g.name IN ('اکشن', 'کمدی', 'معمایی'))
   OR (a.title = 'Chainsaw Man' AND g.name IN ('اکشن', 'ترسناک', 'ماوراء طبیعی'))
   OR (a.title = 'Violet Evergarden' AND g.name IN ('درام', 'فانتزی'))
   OR (a.title = 'Mob Psycho 100' AND g.name IN ('اکشن', 'کمدی', 'ماوراء طبیعی'))
   OR (a.title = 'Sword Art Online' AND g.name IN ('اکشن', 'ماجراجویی', 'عاشقانه', 'فانتزی'))
   OR (a.title = 'Tokyo Ghoul' AND g.name IN ('اکشن', 'درام', 'ترسناک', 'ماوراء طبیعی'))
   OR (a.title = 'Naruto' AND g.name IN ('اکشن', 'ماجراجویی', 'کمدی'))
ON CONFLICT DO NOTHING;

-- 5. ارتباط انیمه‌ها با استودیوها
INSERT INTO anime_studios (anime_id, studio_id)
SELECT a.id, s.id FROM anime a, studios s
WHERE (a.title = 'Attack on Titan' AND s.name = 'Wit Studio')
   OR (a.title = 'Demon Slayer' AND s.name = 'ufotable')
   OR (a.title = 'Jujutsu Kaisen' AND s.name = 'MAPPA')
   OR (a.title = 'My Hero Academia' AND s.name = 'Bones')
   OR (a.title = 'One Punch Man' AND s.name = 'Madhouse')
   OR (a.title = 'Death Note' AND s.name = 'Madhouse')
   OR (a.title = 'Steins;Gate' AND s.name = 'Wit Studio')
   OR (a.title = 'Fullmetal Alchemist: Brotherhood' AND s.name = 'Bones')
   OR (a.title = 'Spy x Family' AND s.name = 'Wit Studio')
   OR (a.title = 'Chainsaw Man' AND s.name = 'MAPPA')
   OR (a.title = 'Violet Evergarden' AND s.name = 'Kyoto Animation')
   OR (a.title = 'Mob Psycho 100' AND s.name = 'Bones')
   OR (a.title = 'Sword Art Online' AND s.name = 'A-1 Pictures')
   OR (a.title = 'Tokyo Ghoul' AND s.name = 'Studio Pierrot')
   OR (a.title = 'Naruto' AND s.name = 'Studio Pierrot')
ON CONFLICT DO NOTHING;

-- 6. اضافه کردن چند قسمت نمونه
INSERT INTO anime_episodes (anime_id, title, episode_number, synopsis, air_date, duration)
SELECT a.id, 'To You, in 2000 Years', 1, 'قسمت اول', '2013-04-07'::date, 24 FROM anime a WHERE a.title = 'Attack on Titan'
UNION ALL
SELECT a.id, 'That Day', 2, 'قسمت دوم', '2013-04-14'::date, 24 FROM anime a WHERE a.title = 'Attack on Titan'
UNION ALL
SELECT a.id, 'Cruelty', 1, 'قسمت اول', '2019-04-06'::date, 24 FROM anime a WHERE a.title = 'Demon Slayer'
UNION ALL
SELECT a.id, 'Trainer Sakonji Urokodaki', 2, 'قسمت دوم', '2019-04-13'::date, 24 FROM anime a WHERE a.title = 'Demon Slayer'
UNION ALL
SELECT a.id, 'Ryomen Sukuna', 1, 'قسمت اول', '2020-10-03'::date, 24 FROM anime a WHERE a.title = 'Jujutsu Kaisen';

-- تمام!
-- حالا می‌توانید کوئری زیر را برای تست اجرا کنید:
-- SELECT a.title, a.status, a.average_score, STRING_AGG(g.name, ', ') as genres
-- FROM anime a
-- LEFT JOIN anime_genres ag ON a.id = ag.anime_id
-- LEFT JOIN genres g ON ag.genre_id = g.id
-- GROUP BY a.id, a.title, a.status, a.average_score
-- LIMIT 5;
