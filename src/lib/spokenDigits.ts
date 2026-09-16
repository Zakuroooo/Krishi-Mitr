/**
 * Pulls a digit string out of something a farmer said.
 *
 * ★ Why this exists: the phone screen was doing
 *
 *       transcript.replace(/\D/g, '')
 *
 *   which keeps ASCII `0-9` and throws away everything else. Sarvam
 *   transcribing Marathi returns neither: a spoken number comes back as
 *   words — "नऊ आठ सात सहा" — or as Devanagari numerals, "९८७६". Both are
 *   `\D` to that regex, so the result was the empty string and the field
 *   silently stayed blank.
 *
 * ★ A farmer does not answer with a bare number. He says **"my phone number
 *   is nine eight seven six…"**, or "haan, mera number 98765…". So this has to
 *   find the number inside a sentence, not assume the sentence is a number.
 *
 * ★ THE BUG THAT MADE IT WORSE. The previous version scanned character by
 *   character and matched a digit word at *any* offset, not on a word
 *   boundary. The English word **"phone" contains "one"** — so
 *   "my phone number is 9876543210" produced `1` followed by the real digits,
 *   and the field was filled with a wrong number that looked plausible.
 *   "four" inside "fourteen" and "छे" inside a longer word did the same.
 *   Matching is now per whole word.
 */

/** Devanagari zero through nine, in order, so the index is the value. */
const DEVANAGARI_DIGITS = '०१२३४५६७८९';

/**
 * Spoken forms per digit, across mr / hi / en, including the pronunciation
 * variants a transcriber actually returns ("पाँच" and "पांच", "छह" and "छे").
 */
const DIGIT_WORDS: Record<string, string[]> = {
  '0': ['शून्य', 'सुन्ना', 'zero', 'oh', 'ओ'],
  '1': ['एक', 'one'],
  '2': ['दोन', 'दो', 'two'],
  '3': ['तीन', 'three'],
  '4': ['चार', 'four'],
  '5': ['पाच', 'पाँच', 'पांच', 'five'],
  '6': ['सहा', 'छह', 'छे', 'six'],
  '7': ['सात', 'seven'],
  '8': ['आठ', 'eight'],
  '9': ['नऊ', 'नौ', 'nine'],
};

/** word -> digit, for exact whole-word lookup. */
const WORD_TO_DIGIT = new Map<string, string>();
for (const [digit, words] of Object.entries(DIGIT_WORDS)) {
  for (const w of words) WORD_TO_DIGIT.set(w, digit);
}

/** Every digit a single token contributes, or `null` if it contributes none. */
function digitsInToken(token: string): string | null {
  const whole = WORD_TO_DIGIT.get(token);
  if (whole !== undefined) return whole;

  // A run of numerals, in either script: "9876543210" or "९८७६".
  let out = '';
  for (const ch of token) {
    if (ch >= '0' && ch <= '9') {
      out += ch;
      continue;
    }
    const dev = DEVANAGARI_DIGITS.indexOf(ch);
    if (dev !== -1) out += String(dev);
  }
  return out.length > 0 ? out : null;
}

/**
 * Every digit in `transcript`, in the order spoken, grouped into runs.
 *
 * A run ends where a non-digit word interrupts it, so
 * "my number is 9876543210 thank you" yields one run, and
 * "press 1 then say 9876543210" yields two.
 */
function digitRuns(transcript: string): string[] {
  const runs: string[] = [];
  let current = '';

  for (const token of transcript.toLowerCase().split(/[\s,.\-–—/।!?]+/)) {
    if (token.length === 0) continue;
    const digits = digitsInToken(token);
    if (digits !== null) {
      current += digits;
    } else if (current.length > 0) {
      runs.push(current);
      current = '';
    }
  }
  if (current.length > 0) runs.push(current);
  return runs;
}

/**
 * The digits a farmer meant, out of a whole spoken sentence.
 *
 * @param maxLength how many digits the field holds — 10 for a phone number,
 *   6 for an OTP. When given, this is treated as the **expected** length and
 *   used to choose between candidate runs, not merely as a truncation.
 *
 * ★ Choosing between runs is the point. "My number is 9876543210" has one
 *   run and is easy. "One second — 9876543210" has two, and the right answer
 *   is the second, not the first ten digits encountered. So: prefer a run of
 *   exactly the expected length; failing that the longest run; and only then
 *   fall back to everything joined. A farmer who says his number twice gets
 *   the number, not the first digit of a false start.
 */
export function digitsFromSpeech(transcript: string, maxLength?: number): string {
  const runs = digitRuns(transcript);
  if (runs.length === 0) return '';

  if (maxLength !== undefined) {
    // A run of exactly the right length is almost certainly the answer.
    const exact = runs.find(r => r.length === maxLength);
    if (exact) return exact;

    // Otherwise the longest run — a stray "one" from a filler word cannot
    // outweigh ten digits said together.
    const longest = runs.reduce((a, b) => (b.length > a.length ? b : a));
    if (longest.length >= maxLength) return longest.slice(0, maxLength);

    // No single run is long enough. The farmer probably paused mid-number, so
    // join everything and take the last `maxLength` — the tail is the number,
    // any false start is at the front.
    const all = runs.join('');
    return all.length > maxLength ? all.slice(-maxLength) : all;
  }

  return runs.join('');
}
