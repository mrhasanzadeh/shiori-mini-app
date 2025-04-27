const GOOGLE_TRANSLATE_API_KEY = import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_API_URL = "https://translation.googleapis.com/language/translate/v2";

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

export const translateGenre = (genre: string): string => {
  return GENRE_TRANSLATIONS[genre] || genre;
};

export const translateText = async (text: string): Promise<string> => {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    console.warn("Google Translate API key is not set. Using original text.");
    return text;
  }

  try {
    const response = await fetch(`${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        target: "fa",
        source: "en",
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Translation error:", data.error);
      return text;
    }

    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error("Failed to translate text:", error);
    return text;
  }
};
