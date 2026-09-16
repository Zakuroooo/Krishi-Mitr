/**
 * mrNumberWords.ts — integer -> spoken Marathi words, for the sale-window voice
 * narration (S9). On-device TTS reads Devanagari *digits* as individual
 * numerals ("६,२९०" -> "सहा, दोन नऊ शून्य"), which is exactly what a farmer
 * does not want to hear from a recommendation. Words are unambiguous: "सहा
 * हजार दोनशे नव्वद रुपये".
 *
 * The number words are transcribed from the earlier voice prototype's
 * `app/src/voice/numberWords.ts` — that module was written for exactly this
 * product intent (spoken Marathi verdicts), but never shipped inside the RN app
 * this repo now builds. `frontend/src/lib/` is where the app's voice engine
 * lives, so the vocabulary lives here.
 */

/** Marathi 0–99. Index is the value: `MARATHI_0_TO_99[42]` -> 'बेचाळीस'. */
const MARATHI_0_TO_99: readonly string[] = [
  'शून्य', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ',
  'दहा', 'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'सोळा', 'सतरा', 'अठरा', 'एकोणीस',
  'वीस', 'एकवीस', 'बावीस', 'तेवीस', 'चोवीस', 'पंचवीस', 'छव्वीस', 'सत्तावीस', 'अठ्ठावीस', 'एकूणतीस',
  'तीस', 'एकतीस', 'बत्तीस', 'तेहतीस', 'चौतीस', 'पस्तीस', 'छत्तीस', 'सदतीस', 'अडतीस', 'एकोणचाळीस',
  'चाळीस', 'एक्केचाळीस', 'बेचाळीस', 'त्रेचाळीस', 'चव्वेचाळीस', 'पंचेचाळीस', 'शेहेचाळीस', 'सत्तेचाळीस', 'अठ्ठेचाळीस', 'एकोणपन्नास',
  'पन्नास', 'एकावन्न', 'बावन्न', 'त्रेपन्न', 'चौपन्न', 'पंचावन्न', 'छपन्न', 'सत्तावन्न', 'अठ्ठावन्न', 'एकोणसाठ',
  'साठ', 'एकसष्ठ', 'बासष्ट', 'त्रेसष्ठ', 'चौसष्ठ', 'पासष्ठ', 'सहासष्ठ', 'सदुसष्ठ', 'अडुसष्ठ', 'एकोणसत्तर',
  'सत्तर', 'एकाहत्तर', 'बहात्तर', 'त्र्याहत्तर', 'चौऱ्याहत्तर', 'पंच्याहत्तर', 'शहात्तर', 'सत्याहत्तर', 'अठ्ठ्याहत्तर', 'एकोणऐंशी',
  'ऐंशी', 'एक्याऐंशी', 'ब्याऐंशी', 'त्र्याऐंशी', 'चौऱ्याऐंशी', 'पंच्याऐंशी', 'शहाऐंशी', 'सत्याऐंशी', 'अठ्ठ्याऐंशी', 'एकोणनव्वद',
  'नव्वद', 'एक्याण्णव', 'ब्याण्णव', 'त्र्याण्णव', 'चौऱ्याण्णव', 'पंच्याण्णव', 'शहाण्णव', 'सत्याण्णव', 'अठ्ठ्याण्णव', 'नव्व्याण्णव',
];

/** Marathi hundreds, 100–900. */
const MARATHI_HUNDREDS: Record<number, string> = {
  100: 'शंभर', 200: 'दोनशे', 300: 'तीनशे', 400: 'चारशे',
  500: 'पाचशे', 600: 'सहाशे', 700: 'सातशे', 800: 'आठशे', 900: 'नऊशे',
};

/**
 * Integer -> Marathi words, Indian grouping.
 *   0 -> 'शून्य' · 11 -> 'अकरा' · 100 -> 'शंभर'
 *   1428 -> 'एक हजार चारशे अठ्ठावीस' · 6290 -> 'सहा हजार दोनशे नव्वद'
 *   100000 -> 'एक लाख' · 250000 -> 'दोन लाख पन्नास हजार'
 */
export function spokenNumber(n: number): string {
  if (Number.isNaN(n)) return '';
  const abs = Math.abs(Math.floor(n));
  const sign = n < 0 ? 'उणे ' : '';

  if (abs === 0) return 'शून्य';
  if (abs < 100) return `${sign}${MARATHI_0_TO_99[abs] ?? ''}`.trim();

  const parts: string[] = [];

  // Crores (कोटी)
  const crore = Math.floor(abs / 10000000);
  let rem = abs % 10000000;
  if (crore > 0) parts.push(`${spokenNumber(crore)} कोटी`);

  // Lakhs (लाख)
  const lakh = Math.floor(rem / 100000);
  rem %= 100000;
  if (lakh > 0) parts.push(`${spokenNumber(lakh)} लाख`);

  // Thousands (हजार)
  const thousand = Math.floor(rem / 1000);
  rem %= 1000;
  if (thousand > 0) parts.push(`${spokenNumber(thousand)} हजार`);

  // Hundreds (शे)
  const hundred = Math.floor(rem / 100);
  const remHundred = rem % 100;
  if (hundred > 0) {
    if (hundred === 1 && remHundred === 0 && parts.length === 0) {
      parts.push('शंभर'); // standalone 100
    } else if (hundred === 1) {
      parts.push('एकशे');
    } else {
      parts.push(MARATHI_HUNDREDS[hundred * 100] ?? `${spokenNumber(hundred)}शे`);
    }
  }

  // Tens & units
  if (remHundred > 0) {
    parts.push(MARATHI_0_TO_99[remHundred] ?? '');
  }

  const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${sign}${joined}`.trim();
}

/** Paise -> whole rupees (the spoken forms work in rupees, not paise). */
export function paiseToRupees(paise: number): number {
  return Math.trunc(paise / 100);
}

/**
 * A rupee amount as spoken Marathi, e.g. 6290 paise worth -> 6290 rupees ->
 * 'सहा हजार दोनशे नव्वद रुपये'. No ₹ symbol — TTS would read it, and a
 * farmer does not need a currency glyph spoken; 'रुपये' carries the unit.
 */
export function spokenRupees(paise: number): string {
  const rupees = Math.abs(paiseToRupees(paise));
  return `${spokenNumber(rupees)} रुपये`;
}

/** Days as spoken Marathi: 11 -> 'अकरा दिवस'. */
export function spokenDays(days: number): string {
  return `${spokenNumber(days)} दिवस`;
}
