// Invoice scanning that runs entirely on the device.
// The photo is read in the browser (Tesseract OCR) — it is never uploaded
// and never stored. Only the reading engine and its language files are
// downloaded, once, and then cached by the browser.

import type { Worker } from "tesseract.js";

export interface ScanResult {
  amount: number | null;
  merchant: string | null;
  date: string | null;
  categoryId: string | null;
}

export interface ScanContext {
  categoryIds: string[]; // expense categories that exist in this household
  history: { merchant: string; categoryId?: string }[]; // past expenses
}

const MAX_SIDE = 2000;

// ---------- image ----------

// Scale to a sensible size and boost contrast; receipts are low-contrast
// thermal paper and OCR does much better on clean grayscale.
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// ---------- OCR engine (loaded on first use, then reused) ----------

// Two readers: the Arabic/Hebrew one gets the words right but often
// misreads digits on right-to-left lines; the Latin one reads digits well.
// We run both and merge them line by line.
const workers = new Map<string, Promise<Worker>>();
let onProgress: ((pct: number) => void) | null = null;

function getWorker(langs: string[]): Promise<Worker> {
  const key = langs.join("+");
  let p = workers.get(key);
  if (!p) {
    p = import("tesseract.js")
      .then(({ createWorker }) =>
        createWorker(langs, 1, {
          logger: (m) => {
            if (m.status === "recognizing text") onProgress?.(m.progress);
          },
        })
      )
      .catch((e) => {
        workers.delete(key); // allow a retry (e.g. after going back online)
        throw e;
      });
    workers.set(key, p);
  }
  return p;
}

interface OcrLine {
  text: string;
  y0: number;
  y1: number;
}

async function readLines(worker: Worker, canvas: HTMLCanvasElement): Promise<OcrLine[]> {
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  const lines: OcrLine[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        const text = line.text.trim();
        if (text) lines.push({ text, y0: line.bbox.y0, y1: line.bbox.y1 });
      }
    }
  }
  if (lines.length === 0) {
    // no layout info — fall back to plain text
    data.text.split("\n").forEach((t, i) => t.trim() && lines.push({ text: t.trim(), y0: i, y1: i + 0.9 }));
  }
  return lines;
}

// Attach each digit-pass line to the word-pass line at the same height.
function mergeLines(words: OcrLine[], digits: OcrLine[]): string {
  const extra = words.map(() => [] as string[]);
  const loose: OcrLine[] = [];
  for (const d of digits) {
    const mid = (d.y0 + d.y1) / 2;
    const i = words.findIndex((w) => mid >= w.y0 && mid <= w.y1);
    // keep only its numbers — its reading of Arabic/Hebrew words is noise
    const nums = (d.text.match(/[\d.,:/-]*\d[\d.,:/-]*/g) ?? []).join("\t");
    if (!nums) continue;
    if (i >= 0) extra[i].push(nums);
    else loose.push({ ...d, text: nums });
  }
  const all = words.map((w, i) => ({ y: w.y0, text: [w.text, ...extra[i]].join("\t") }));
  for (const d of loose) all.push({ y: d.y0, text: d.text });
  return all
    .sort((a, b) => a.y - b.y)
    .map((l) => l.text)
    .join("\n");
}

// ---------- text -> fields ----------

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
function normalize(text: string): string {
  return text
    .replace(/[٠-٩]/g, (ch) => String(ARABIC_DIGITS.indexOf(ch)))
    .replace(/[‎‏‪-‮]/g, ""); // bidi marks
}

// Words that label the final amount, in Arabic, Hebrew and English.
const TOTAL_WORDS =
  /(الإجمالي|الاجمالي|اجمالي|إجمالي|المجموع|مجموع|المبلغ|للدفع|الصافي|סה"כ|סה״כ|סהכ|סך הכל|לתשלום|סכום|total|amount due|balance due|grand total|sum)/i;
// Labels that look like totals but are not what was paid.
const NOT_TOTAL = /(subtotal|sub total|vat|tax|ضريبة|الضريبة|مע"מ|מעמ|قبل|לפני|change|عودة|الباقي|עודף)/i;

// Numbers such as 1,234.50 / 1234,50 / 45.9 / 120
const NUMBER = /\d{1,3}(?:[,.\s]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?/g;

function toNumber(raw: string): number | null {
  let s = raw.replace(/\s/g, "");
  const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
  if (lastSep >= 0 && s.length - lastSep - 1 <= 2) {
    // last separator is the decimal point
    s = s.slice(0, lastSep).replace(/[.,]/g, "") + "." + s.slice(lastSep + 1);
  } else {
    s = s.replace(/[.,]/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// drop dates, times, phone-like and long id numbers before reading amounts
function stripNonAmounts(line: string): string {
  return line
    .replace(/\d{1,4}[./-]\d{1,2}[./-]\d{1,4}/g, " ")
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, " ")
    .replace(/\d{7,}/g, " ");
}

function amountsIn(line: string): number[] {
  return (stripNonAmounts(line).match(NUMBER) ?? [])
    .map(toNumber)
    .filter((n): n is number => n !== null && n > 0 && n < 1_000_000);
}

function findAmount(lines: string[]): number | null {
  // 1) a line labelled as the total (prefer the last one — totals sit at the bottom)
  const labelled: number[] = [];
  lines.forEach((line, i) => {
    if (!TOTAL_WORDS.test(line) || NOT_TOTAL.test(line)) return;
    let nums = amountsIn(line);
    if (nums.length === 0 && lines[i + 1]) nums = amountsIn(lines[i + 1]); // amount printed on the next line
    if (nums.length) labelled.push(Math.max(...nums));
  });
  const priced = lines.flatMap((l) =>
    (stripNonAmounts(l).match(/\d[\d,]*[.,]\d{2}(?!\d)/g) ?? []).map(toNumber).filter((n): n is number => n !== null && n > 0 && n < 1_000_000)
  );
  const biggest = priced.length ? Math.max(...priced) : null;

  if (labelled.length) {
    const total = Math.max(...labelled);
    // a "total" smaller than one of the items means it was misread
    return biggest !== null && total < biggest ? biggest : total;
  }
  // 2) otherwise the largest price-looking number (has decimals)
  return biggest;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function findDate(text: string): string | null {
  const today = new Date();
  const ok = (y: number, m: number, d: number) => {
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000) return null;
    const dt = new Date(y, m - 1, d);
    if (dt.getMonth() !== m - 1 || dt.getTime() > today.getTime() + 86400000) return null;
    return `${y}-${pad(m)}-${pad(d)}`;
  };
  const iso = text.match(/\b(20\d{2})[./-](\d{1,2})[./-](\d{1,2})\b/);
  if (iso) {
    const r = ok(+iso[1], +iso[2], +iso[3]);
    if (r) return r;
  }
  // day / month / year — the order used on receipts in this region
  for (const m of text.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})\b/g)) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    const r = ok(y, +m[2], +m[1]);
    if (r) return r;
  }
  return null;
}

const LETTERS = /[A-Za-z֐-׿؀-ۿ]/g;

function findMerchant(lines: string[]): string | null {
  // the shop name is normally the first line that is mostly words
  for (const full of lines.slice(0, 8)) {
    const line = full.split("\t")[0]; // words only, without the digit pass
    const letters = (line.match(LETTERS) ?? []).length;
    const digits = (line.match(/\d/g) ?? []).length;
    if (letters >= 3 && letters > digits * 2 && !TOTAL_WORDS.test(line)) {
      return line.replace(/[^\w֐-׿؀-ۿ\s&'.-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40) || null;
    }
  }
  return null;
}

// Words on a receipt that point at a category.
const CATEGORY_HINTS: [RegExp, string][] = [
  [/(سوبر|ماركت|بقالة|סופר|מרקט|שופרסל|רמי לוי|אושר עד|ויקטורי|יוחננוף|market|grocery)/i, "supermarket"],
  [/(وقود|بنزين|محطة|דלק|תדלוק|פז|סונול|דור אלון|fuel|petrol|gas station)/i, "fuel"],
  [/(مطعم|مطاعم|شاورما|بيتزا|מסעדה|פיצה|שווארמה|restaurant|pizza|burger)/i, "restaurants"],
  [/(قهوة|كافيه|مقهى|קפה|ארומה|cafe|coffee|espresso)/i, "coffee"],
  [/(صيدلية|دواء|בית מרקחת|סופר-פארם|סופר פארם|pharm)/i, "pharmacy"],
  [/(كهرباء|חשמל|electric)/i, "electricity"],
  [/(مياه|ماء|מים|מי |water)/i, "water"],
  [/(إنترنت|انترنت|אינטרנט|בזק|הוט|internet|fiber)/i, "internet"],
  [/(هاتف|جوال|סלולר|פלאפון|סלקום|פרטנר|mobile|cellular)/i, "phone"],
  [/(ملابس|أزياء|ביגוד|אופנה|קסטרו|fashion|clothing|zara|h&m)/i, "clothes"],
  [/(موقف|مواقف|חניה|חניון|parking)/i, "parking"],
  [/(تأمين|ביטוח|insurance)/i, "insurance"],
  [/(طبيب|عيادة|רופא|מרפאה|קופת חולים|clinic|doctor)/i, "doctor"],
];

function findCategory(text: string, merchant: string | null, ctx: ScanContext): string | null {
  const has = (id?: string) => !!id && ctx.categoryIds.includes(id);
  const lower = text.toLowerCase();

  // 1) a shop you have used before keeps its category
  for (const h of ctx.history) {
    const name = h.merchant.trim().toLowerCase();
    if (name.length >= 3 && has(h.categoryId) && (lower.includes(name) || (merchant && merchant.toLowerCase().includes(name)))) {
      return h.categoryId!;
    }
  }
  // 2) keywords on the receipt
  for (const [re, id] of CATEGORY_HINTS) if (re.test(text) && has(id)) return id;
  return null;
}

/** Turn recognised receipt text into form fields. Exported for testing. */
export function parseReceipt(rawText: string, ctx: ScanContext): ScanResult {
  const text = normalize(rawText);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const merchant = findMerchant(lines);
  const amount = findAmount(lines);
  return {
    amount: amount !== null ? Math.round(amount * 100) / 100 : null,
    merchant,
    date: findDate(text),
    categoryId: findCategory(text, merchant, ctx),
  };
}

// ---------- public ----------

export const SCAN_ERRORS = {
  engine: "تعذّر تحميل قارئ الفواتير. يحتاج اتصالًا بالإنترنت في أول مرة فقط.",
  unreadable: "لم نتمكّن من قراءة الصورة. جرّب صورة أوضح وبإضاءة جيدة.",
};

export async function scanInvoice(
  file: File,
  ctx: ScanContext,
  progress?: (pct: number) => void
): Promise<ScanResult> {
  let canvas: HTMLCanvasElement;
  try {
    canvas = await prepare(file);
  } catch {
    throw new Error(SCAN_ERRORS.unreadable);
  }

  let wordReader: Worker;
  let digitReader: Worker;
  try {
    [wordReader, digitReader] = await Promise.all([getWorker(["ara", "heb", "eng"]), getWorker(["eng"])]);
  } catch {
    throw new Error(SCAN_ERRORS.engine);
  }

  try {
    onProgress = (p) => progress?.(Math.round(p * 60));
    const words = await readLines(wordReader, canvas);
    onProgress = (p) => progress?.(60 + Math.round(p * 40));
    const digits = await readLines(digitReader, canvas);
    const text = mergeLines(words, digits);
    if (!text.trim()) throw new Error(SCAN_ERRORS.unreadable);
    return parseReceipt(text, ctx);
  } catch (e) {
    if (e instanceof Error && e.message === SCAN_ERRORS.unreadable) throw e;
    throw new Error(SCAN_ERRORS.unreadable);
  } finally {
    onProgress = null;
  }
}
