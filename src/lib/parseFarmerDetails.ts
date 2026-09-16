/**
 * Turns one spoken sentence into the three fields the details screen asks
 * for: name, district and village.
 *
 * ★ Why this exists separately from `RegistrationAgent`: the agent runs a
 *   slot-by-slot conversation — it asks for the name, waits, asks for the
 *   district, waits. The new details screen asks for all three in a single
 *   breath ("Rambhau Patil, Nashik district, Niphad village") and fills the
 *   form from it, which is a parsing problem rather than a dialogue one.
 *   Keeping it pure and separate is also what makes it testable without a
 *   microphone.
 *
 * ★ It never invents. Anything it cannot identify comes back `null`, and the
 *   screen leaves that field for the farmer to type. A parser that guesses a
 *   district would put a farmer's lot in the wrong mandi.
 */

import type { District } from '../types/api';

export interface ParsedFarmerDetails {
  name: string | null;
  districtId: string | null;
  village: string | null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[.,!?।]/g, '');
}

/**
 * Words that mark the token before them as a district or village rather than
 * part of the name — in all three languages, plus the bare English forms.
 * "Niphad village" and "निफाड गाव" both have to work.
 */
// ★ Both nasal forms of the Hindi word are here on purpose: 'गांव' uses
//   anusvara (U+0902) and 'गाँव' chandrabindu (U+0901). They look nearly
//   identical and are different codepoints — Sarvam returns the chandrabindu
//   form, which the anusvara spelling silently failed to match.
const VILLAGE_MARKERS = ['village', 'gaon', 'gav', 'गाव', 'गाव्', 'गांव', 'गाँव', 'ता', 'taluka'];
const DISTRICT_MARKERS = ['district', 'jila', 'zilla', 'जिल्हा', 'जिला', 'ज़िला'];
/**
 * ★ The name gets markers too, so the three facts can arrive in **any order**.
 *   A farmer does not recite a form top to bottom — he says "my village is
 *   Niphad, my name is Rambhau Patil, district Nashik". Treating the name as
 *   "whatever came before the first marker" only works when he happens to
 *   start with it, and silently mangles every other ordering.
 */
const NAME_MARKERS = ['name', 'नाव', 'नाम'];

/**
 * Words that can sit next to a marker but are never the answer.
 *
 * ★ "माझं गाव निफाड आहे" put the village marker after a possessive, so the
 *   postfix reading picked up "माझं" — "my" — as the village name. A value
 *   that is one of these is not a value; look at the other side instead.
 */
const NOT_A_VALUE = new Set([
  'my', 'is', 'the', 'a', 'and', 'in',
  'माझं', 'माझे', 'माझा', 'मेरा', 'मेरी', 'मेरे', 'आहे', 'है', 'का', 'की', 'चा', 'ची', 'चे',
]);

/** True when this word could never be a place or person's name. */
function isFiller(v: string | null): boolean {
  if (v === null) return true;
  return v
    .trim()
    .split(/\s+/)
    .every(w => NOT_A_VALUE.has(w.toLowerCase()));
}

/**
 * Strips a trailing marker word: "Niphad village" -> "Niphad", "निफाड गाव" ->
 * "निफाड".
 *
 * ★ `\b` is deliberately not used for the Devanagari markers. JavaScript's
 *   word boundary is defined against `\w`, which is ASCII-only, so `\bगाव\b`
 *   never matches and "निफाड गाव" came through with the marker still attached.
 *   Latin markers keep the boundary (so "gaon" does not fire inside a name
 *   like "Gaonkar"); non-Latin ones anchor on whitespace instead.
 */
function stripMarkers(phrase: string, markers: string[]): string {
  let out = phrase.trim();
  for (const m of markers) {
    const isLatin = /^[a-z]+$/i.test(m);
    const re = isLatin
      ? new RegExp(`\\s*\\b${m}\\b\\s*$`, 'i')
      : new RegExp(`\\s*${m}\\s*$`, 'i');
    out = out.replace(re, '').trim();
  }
  return out;
}

/**
 * One marker occurrence found in the utterance: which field it introduces,
 * and where its own word starts and ends.
 */
interface MarkerHit {
  field: 'district' | 'village' | 'name';
  start: number;
  end: number;
  /**
   * Devanagari markers are **postfix**: Marathi and Hindi say "नाशिक जिल्हा",
   * value first. Latin markers go either way — English speakers say both
   * "Nashik district" and "district Pune" — so those try after, then before.
   */
  postfix: boolean;
}

/**
 * Every marker word in the utterance, in the order spoken.
 *
 * ★ Markers are matched case-insensitively and, for Latin words, on word
 *   boundaries — so "gaon" does not fire inside the surname "Gaonkar", which
 *   would silently truncate a farmer's name.
 */
function findMarkers(lower: string): MarkerHit[] {
  const hits: MarkerHit[] = [];

  const scan = (markers: string[], field: 'district' | 'village' | 'name') => {
    for (const m of markers) {
      const isLatin = /^[a-z]+$/i.test(m);
      // `\b` is ASCII-only in JavaScript, so it never matches a Devanagari
      // boundary — those anchor on whitespace, punctuation or a string edge.
      //
      // ★ The punctuation half matters: "नाशिक जिल्हा, निफाड गाव" puts a comma
      //   straight after the marker, and a `(?=\s|$)` lookahead misses it
      //   entirely — the marker goes undetected and the district ends up glued
      //   to the farmer's name.
      const re = isLatin
        ? new RegExp(`\\b${m}\\b`, 'gi')
        : new RegExp(`(?:^|[\\s,،।])${m}(?=[\\s,،।.]|$)`, 'g');
      for (const match of lower.matchAll(re)) {
        const idx = match.index ?? 0;
        // The whitespace-anchored form captures a leading space; the marker
        // itself starts after it.
        const lead = match[0].length - match[0].trimStart().length;
        hits.push({ field, start: idx + lead, end: idx + match[0].length, postfix: !isLatin });
      }
    }
  };

  scan(DISTRICT_MARKERS, 'district');
  scan(VILLAGE_MARKERS, 'village');
  scan(NAME_MARKERS, 'name');

  return hits.sort((a, b) => a.start - b.start);
}

/**
 * Turns one spoken sentence into name, district and village.
 *
 * ★ This used to split on **commas** — `raw.split(/[,،]|\sand\s/)` — which is
 *   how a person writes the sentence but not how a transcriber returns it.
 *   Sarvam hands back "Pranay Sarkar district Pune village Kokamthan" with no
 *   punctuation at all, so the whole utterance arrived as a single segment and
 *   fell through into one field. The farmer had said all three correctly and
 *   the app put them in the same box.
 *
 * ★ So we split on the **marker words themselves** instead. They are what
 *   actually delimits the fields in speech: everything before the first
 *   marker is the name, and each marker claims the words that follow it until
 *   the next marker. Commas are still tolerated — they are just stripped as
 *   punctuation rather than relied upon.
 *
 * ★ It still never invents. A district we do not carry leaves `districtId`
 *   null rather than snapping to a neighbour, because a wrong district puts a
 *   farmer's lot in the wrong mandi.
 */
export function parseFarmerDetails(
  transcript: string,
  districts: District[],
): ParsedFarmerDetails {
  const raw = transcript.trim();
  if (!raw) return { name: null, districtId: null, village: null };

  const lower = raw.toLowerCase();
  const markers = findMarkers(lower);

  /** Trims filler punctuation and the joining words a person says naturally. */
  const clean = (s: string): string | null => {
    const out = s
      .replace(/[.,،!?।]/g, ' ')
      // ★ Sarvam returns the whole spoken sentence, so a farmer who says
      //   "माझे नाव रामभाऊ" hands us the words "my name" as part of the name.
      //   Stripped in one pass, longest opener first.
      .replace(
        /^\s*(?:माझे\s+नाव|माझं\s+नाव|मेरा\s+नाम|my\s+name\s+is|name\s+is|आणि|और|and|is|मी|नाव|नाम)\s+/i,
        '',
      )
      // Hindi sentences end "... है"; it is not part of anyone's name.
      .replace(/\s+(?:है|आहे)\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    return out.length > 0 ? out : null;
  };

  // Comma-ish punctuation, which is where a segment ends when the transcriber
  // did give us some. Used only as a boundary — never required.
  const breaks: number[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    if (',،।'.includes(raw[i]!)) breaks.push(i);
  }
  const nextBreak = (from: number) => breaks.find(b => b >= from) ?? raw.length;
  const prevBreak = (before: number) => {
    const b = [...breaks].reverse().find(x => x < before);
    return b === undefined ? 0 : b + 1;
  };

  let districtId: string | null = null;
  let village: string | null = null;
  let markedName: string | null = null;
  // Where the field values begin. The name is whatever sits before all of it.
  let earliestValue = raw.length;
  // How far the previous marker's value reached, so two markers cannot claim
  // the same words.
  let consumedUpTo = 0;

  for (let i = 0; i < markers.length; i += 1) {
    const hit = markers[i]!;
    const next = markers[i + 1];

    /**
     * The words immediately **before** the marker, which is where a postfix
     * marker's value lives.
     *
     * ★ Only the last token, not everything back to the previous boundary.
     *   Without commas, "प्रणय सरकार नाशिक जिल्हा" has the farmer's name and
     *   his district in one unbroken run; taking the whole run would swallow
     *   the name into the district. A district or village is one word here.
     */
    const takeBefore = (): { value: string | null; start: number; end: number } => {
      const floor = Math.max(prevBreak(hit.start), consumedUpTo);
      const chunk = raw.slice(floor, hit.start);
      const trimmed = chunk.replace(/[\s,،।]+$/, '');
      const lastGap = Math.max(
        trimmed.lastIndexOf(' '),
        trimmed.lastIndexOf(','),
        trimmed.lastIndexOf('।'),
      );
      const start = floor + lastGap + 1;
      return { value: clean(raw.slice(start, hit.start)), start, end: hit.end };
    };

    /** The words immediately after the marker, bounded by the next marker or
     *  the next comma. */
    const takeAfter = (): { value: string | null; start: number; end: number } => {
      const end = Math.min(next ? next.start : raw.length, nextBreak(hit.end));
      return { value: clean(raw.slice(hit.end, end)), start: hit.start, end };
    };

    /**
     * ★ Both word orders occur, in every language, and the transcriber returns
     *   whichever was said. English speakers say "district Pune" and "Nashik
     *   district"; Marathi says "जिल्हा नाशिक" and "नाशिक जिल्हा".
     *
     *   I first assumed Devanagari was always postfix. It is not — Sarvam
     *   returned "माझे नाव रामभाऊ पाटील, जिल्हा नाशिक, गाव निफाड", which is
     *   prefix, and the parser found no district at all.
     *
     *   So try both sides and let the data decide: for a district, whichever
     *   side names a district we actually carry wins. That is a fact we can
     *   check, rather than a grammar rule we guessed.
     */
    const after = takeAfter();
    const before = takeBefore();

    let value: string | null;
    let valueStart: number;
    // ★ Where this marker's claim ends. Without it, "जिल्हा नाशिक गाव निफाड"
    //   let `गाव` reach back and take "नाशिक" — a word `जिल्हा` had already
    //   claimed — so the village came out as the district's name.
    let valueEnd: number;

    if (hit.field === 'name') {
      // "my name is Rambhau Patil" — the words after it, always. Nobody says
      // "Rambhau Patil name".
      ({ value, start: valueStart, end: valueEnd } = after);
    } else if (hit.field === 'district') {
      const known = (v: string | null) =>
        v !== null &&
        districts.some(d => {
          const n = normalize(v);
          return n.includes(normalize(d.name_mr)) || n.includes(normalize(d.name));
        });
      if (known(after.value)) ({ value, start: valueStart, end: valueEnd } = after);
      else if (known(before.value)) ({ value, start: valueStart, end: valueEnd } = before);
      // Neither side names a district we carry. Prefer the postfix reading so
      // the unknown word is at least not left inside the farmer's name.
      else if (before.value !== null) ({ value, start: valueStart, end: valueEnd } = before);
      else ({ value, start: valueStart, end: valueEnd } = after);
    } else {
      // A village has no list to check against, so prefer the side that has
      // words at all, and the marker's own script as the tie-break.
      // A postfix marker normally looks back — unless the word behind it has
      // already been claimed, which is what happens in prefix word order.
      // A postfix marker normally looks back — unless the word behind it has
      // already been claimed, or is a filler that cannot be a place name.
      const backUnusable = before.start < consumedUpTo || isFiller(before.value);
      const preferred = hit.postfix && !backUnusable ? before : after;
      const other = hit.postfix && !backUnusable ? after : before;
      const first = !isFiller(preferred.value) ? preferred : other;
      ({ value, start: valueStart, end: valueEnd } = first);
    }

    consumedUpTo = Math.max(consumedUpTo, valueEnd, hit.end);
    if (value === null) continue;
    earliestValue = Math.min(earliestValue, valueStart);

    if (hit.field === 'name' && markedName === null) {
      markedName = value;
    } else if (hit.field === 'district' && districtId === null) {
      const n = normalize(value);
      const matched = districts.find(
        d => n.includes(normalize(d.name_mr)) || n.includes(normalize(d.name)),
      );
      // Unrecognised district stays null — see the header.
      if (matched) districtId = matched.id;
    } else if (hit.field === 'village' && village === null) {
      village = stripMarkers(value, [...VILLAGE_MARKERS, ...DISTRICT_MARKERS]);
    }
  }

  // ★ An explicitly marked name wins. Only when nobody said "name" do we fall
  //   back to "whatever came before the first marker" — which is right for
  //   "Rambhau Patil, Nashik district" and wrong for "my village is Niphad, my
  //   name is Rambhau Patil", where the leading words are the village.
  const name = markedName ?? clean(raw.slice(0, earliestValue));

  // ★ A district can also be named without any marker word — "Pranay Sarkar,
  //   Nashik" — but only trust that when the farmer said nothing that looked
  //   like a district at all. Otherwise a village that happens to share a name
  //   with a district would overwrite the district he actually said.
  if (districtId === null && markers.every(m => m.field !== 'district') && name !== null) {
    const n = normalize(name);
    const matched = districts.find(
      d => n.includes(normalize(d.name_mr)) || n.includes(normalize(d.name)),
    );
    if (matched) {
      districtId = matched.id;
      // Strip the district out of the name so it does not appear in both.
      const stripped = clean(
        name.replace(new RegExp(matched.name_mr, 'i'), '').replace(new RegExp(matched.name, 'i'), ''),
      );
      return { name: stripped, districtId, village };
    }
  }

  return { name, districtId, village: village?.trim() || null };
}
