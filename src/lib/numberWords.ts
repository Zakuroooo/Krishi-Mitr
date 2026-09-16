/**
 * Spoken whole numbers — Marathi, Hindi, English — for reading a phone number
 * or an OTP out of a transcript.
 *
 * ★ Why digit-by-digit was not enough. `spokenDigits.ts` knows the ten digit
 *   words, which covers a farmer who reads his number one digit at a time:
 *   "नऊ आठ सात सहा…". Plenty of people do not. They say it the way a number is
 *   said — in pairs and groups: **"अठ्ठ्याण्णव सात सहा पाच"**, "बारा तीन", or
 *   "डबल सात". Every one of those words was invisible to a digit-only table,
 *   so the run broke in the middle and the field was filled with a fragment,
 *   or with nothing.
 *
 * ★ What is in here and what is deliberately not. Every number below has been
 *   written out rather than generated, because Marathi's twenties through
 *   nineties are irregular (एकोणतीस, बेचाळीस, त्र्याण्णव) and a generated
 *   table would produce confident nonsense. A word that is missing is
 *   harmless — it is skipped, and the digits around it still land. A word
 *   mapped to the *wrong* number is not harmless: it silently fills in a
 *   phone number that looks plausible and belongs to someone else. So this
 *   errs toward omission, and the tests pin down what is claimed.
 *
 * ★ Multipliers are separate. "डबल सात" is not a number word; it is an
 *   instruction about the next one, which is why `spokenDigits` handles it
 *   with lookahead rather than a lookup here.
 */

/** Marathi. Extended past twenty only where the form is in common speech. */
const MARATHI: Record<string, number> = {
  शून्य: 0, शुन्य: 0, सुन्ना: 0, झिरो: 0,
  एक: 1, दोन: 2, तीन: 3, चार: 4, पाच: 5,
  सहा: 6, सात: 7, आठ: 8, नऊ: 9, नउ: 9,
  दहा: 10, अकरा: 11, बारा: 12, तेरा: 13, चौदा: 14,
  पंधरा: 15, सोळा: 16, सतरा: 17, अठरा: 18, एकोणीस: 19,
  वीस: 20, एकवीस: 21, बावीस: 22, तेवीस: 23, चोवीस: 24, पंचवीस: 25,
  सव्वीस: 26, सत्तावीस: 27, अठ्ठावीस: 28, एकोणतीस: 29,
  तीस: 30, एकतीस: 31, बत्तीस: 32, तेहेतीस: 33, चौतीस: 34, पस्तीस: 35,
  छत्तीस: 36, सदतीस: 37, अडतीस: 38, एकोणचाळीस: 39,
  चाळीस: 40, एक्केचाळीस: 41, बेचाळीस: 42, त्रेचाळीस: 43, चव्वेचाळीस: 44,
  पंचेचाळीस: 45, सेहेचाळीस: 46, सत्तेचाळीस: 47, अठ्ठेचाळीस: 48, एकोणपन्नास: 49,
  पन्नास: 50, एक्कावन्न: 51, बावन्न: 52, त्रेपन्न: 53, चोपन्न: 54, पंचावन्न: 55,
  छप्पन्न: 56, सत्तावन्न: 57, अठ्ठावन्न: 58, एकोणसाठ: 59,
  साठ: 60, एकसष्ट: 61, बासष्ट: 62, त्रेसष्ट: 63, चौसष्ट: 64, पासष्ट: 65,
  सहासष्ट: 66, सदुसष्ट: 67, अडुसष्ट: 68, एकोणसत्तर: 69,
  सत्तर: 70, एक्काहत्तर: 71, बहात्तर: 72, त्र्याहत्तर: 73, चौऱ्याहत्तर: 74,
  पंच्याहत्तर: 75, शहात्तर: 76, सत्याहत्तर: 77, अठ्ठ्याहत्तर: 78, एकोणऐंशी: 79,
  ऐंशी: 80, एक्क्याऐंशी: 81, ब्याऐंशी: 82, त्र्याऐंशी: 83, चौऱ्याऐंशी: 84,
  पंच्याऐंशी: 85, शहाऐंशी: 86, सत्त्याऐंशी: 87, अठ्ठ्याऐंशी: 88, एकोणनव्वद: 89,
  नव्वद: 90, एक्क्याण्णव: 91, ब्याण्णव: 92, त्र्याण्णव: 93, चौऱ्याण्णव: 94,
  पंच्याण्णव: 95, शहाण्णव: 96, सत्त्याण्णव: 97, अठ्ठ्याण्णव: 98, नव्व्याण्णव: 99,
};

/** Hindi. Same rule: only forms confidently known. */
const HINDI: Record<string, number> = {
  शून्य: 0, सिफर: 0,
  एक: 1, दो: 2, तीन: 3, चार: 4, पाँच: 5, पांच: 5,
  छह: 6, छे: 6, छः: 6, सात: 7, आठ: 8, नौ: 9,
  दस: 10, ग्यारह: 11, बारह: 12, तेरह: 13, चौदह: 14,
  पंद्रह: 15, सोलह: 16, सत्रह: 17, अठारह: 18, उन्नीस: 19,
  बीस: 20, इक्कीस: 21, बाईस: 22, तेईस: 23, चौबीस: 24, पच्चीस: 25,
  छब्बीस: 26, सत्ताईस: 27, अट्ठाईस: 28, उनतीस: 29,
  तीस: 30, इकतीस: 31, बत्तीस: 32, तैंतीस: 33, चौंतीस: 34, पैंतीस: 35,
  छत्तीस: 36, सैंतीस: 37, अड़तीस: 38, उनतालीस: 39,
  चालीस: 40, इकतालीस: 41, बयालीस: 42, तैंतालीस: 43, चवालीस: 44, पैंतालीस: 45,
  छियालीस: 46, सैंतालीस: 47, अड़तालीस: 48, उनचास: 49,
  पचास: 50, इक्यावन: 51, बावन: 52, तिरपन: 53, चौवन: 54, पचपन: 55,
  छप्पन: 56, सत्तावन: 57, अट्ठावन: 58, उनसठ: 59,
  साठ: 60, इकसठ: 61, बासठ: 62, तिरसठ: 63, चौंसठ: 64, पैंसठ: 65,
  छियासठ: 66, सरसठ: 67, अड़सठ: 68, उनहत्तर: 69,
  सत्तर: 70, इकहत्तर: 71, बहत्तर: 72, तिहत्तर: 73, चौहत्तर: 74, पचहत्तर: 75,
  छिहत्तर: 76, सतहत्तर: 77, अठहत्तर: 78, उनासी: 79,
  अस्सी: 80, इक्यासी: 81, बयासी: 82, तिरासी: 83, चौरासी: 84, पचासी: 85,
  छियासी: 86, सत्तासी: 87, अट्ठासी: 88, नवासी: 89,
  नब्बे: 90, इक्यानवे: 91, बानवे: 92, तिरानवे: 93, चौरानवे: 94, पचानवे: 95,
  छियानवे: 96, सत्तानवे: 97, अट्ठानवे: 98, निन्यानवे: 99,
};

const ENGLISH: Record<string, number> = {
  zero: 0, oh: 0, nought: 0, naught: 0,
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

/** word → value, merged. Collisions across languages agree by construction
 *  (एक is 1 in both), so a single map is safe and lookup stays one hop. */
const NUMBER_WORDS = new Map<string, number>();
for (const table of [MARATHI, HINDI, ENGLISH]) {
  for (const [word, value] of Object.entries(table)) NUMBER_WORDS.set(word, value);
}

/**
 * "Say the next one twice" — not a number, an instruction about one.
 * A farmer reading 9 8 7 7 6 aloud often says "सात डबल" or "double seven".
 */
const REPEATERS: Record<string, number> = {
  डबल: 2, दुप्पट: 2, double: 2,
  ट्रिपल: 3, triple: 3, तिप्पट: 3,
};

/**
 * The digits a spoken number word contributes, or `null` if the token is not
 * a number word.
 *
 * ★ Two-digit words give two digits — "अठ्ठ्याण्णव" is `"98"`, which is what
 *   it means inside a phone number. Ten is `"10"` for the same reason: in
 *   "दहा दहा" a farmer is reading out `1010`, not counting to twenty.
 */
export function numberWordToDigits(token: string): string | null {
  const value = NUMBER_WORDS.get(token);
  if (value === undefined) return null;
  return value < 10 ? String(value) : String(value);
}

/** How many times the *next* number should repeat, or `null` if this token is
 *  not a repeater. */
export function repeatCount(token: string): number | null {
  return REPEATERS[token] ?? null;
}

/** Exposed for the tests, which check the tables rather than trusting them. */
export const __tables = { MARATHI, HINDI, ENGLISH, REPEATERS };
