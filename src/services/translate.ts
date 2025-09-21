// ژانرهای پرکاربرد و ترجمه فارسی آنها
const GENRE_TRANSLATIONS: Record<string, string> = {
  Action: "اکشن",
  Adventure: "ماجراجویی",
  Comedy: "کمدی",
  Drama: "درام",
  Fantasy: "فانتزی",
  Horror: "ترسناک",
  Mystery: "معمایی",
  Romance: "عاشقانه",
  "Sci-Fi": "علمی تخیلی",
  "Slice of Life": "برش از زندگی",
  Sports: "ورزشی",
  Supernatural: "ماوراء طبیعی",
  Thriller: "هیجان‌انگیز",
  Mecha: "روباتی",
  Music: "موسیقی",
  Psychological: "روانشناختی",
  School: "مدرسه‌ای",
  Military: "نظامی",
  Historical: "تاریخی",
  "Super Power": "ابرقدرت",
  Demons: "شیاطین",
  Magic: "جادویی",
  "Martial Arts": "هنرهای رزمی",
  Space: "فضایی",
  Vampire: "خون‌آشامی",
};

export const trangrayGenre = (genre: string): string => {
  return GENRE_TRANSLATIONS[genre] || genre;
};

// Simple pass-through function that returns the original text
export const trangrayText = async (text: string): Promise<string> => {
  return text;
};
