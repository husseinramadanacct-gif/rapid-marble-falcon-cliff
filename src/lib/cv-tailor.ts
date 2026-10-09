import { buildPlainText, snapshotBody, type CvBody, type CvDoc, type TailorMeta } from "./cv-model";

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "was", "were", "will",
  "have", "has", "had", "not", "but", "all", "any", "our", "their", "they", "who", "job", "role",
  "work", "ability", "skills", "skill", "experience", "required", "requirements", "including",
  "include", "must", "should", "able", "using", "into", "over", "about", "such", "other", "than",
  "also", "well", "team", "years", "year", "position", "responsibilities", "responsibility",
  "candidate", "looking", "plus", "within", "across", "through", "what", "when", "where", "which",
  "في", "من", "على", "إلى", "الى", "عن", "مع", "هذا", "هذه", "ذلك", "التي", "الذي", "أو", "او",
  "أن", "ان", "إن", "كان", "يكون", "يتم", "مطلوب", "خبرة", "العمل", "وظيفة", "الوظيفة", "لدينا",
  "نحن", "يجب", "يفضل", "يشمل", "بما", "خلال", "لديه", "تكون", "يكون", "عدم", "كل", "أي",
]);

export type TailorResult = {
  doc: CvDoc;
  matched: string[];
  skipped: string[];
};

export function tailorCv(cv: CvDoc, title: string, jd: string): TailorResult {
  const cleanTitle = title.trim();
  const cleanJd = jd.trim();
  const source = cv.tailor?.source ?? snapshotBody(cv);
  const base = applyBody(cv, source);
  const terms = termsFromJd(cleanJd);
  const hay = buildPlainText(base).toLowerCase();
  const matched = terms.filter((term) => mentioned(hay, term));
  const skipped = terms.filter((term) => !mentioned(hay, term));
  const next = applyBody(base, rewriteBody(source, cleanTitle, matched));
  const meta: TailorMeta = {
    title: cleanTitle,
    jd: cleanJd,
    matched,
    skipped,
    source,
  };
  return { doc: { ...next, id: cv.id, tailor: meta, updatedAt: Date.now() }, matched, skipped };
}

export function restoreTailored(cv: CvDoc): CvDoc {
  if (!cv.tailor) return cv;
  const restored = applyBody(cv, cv.tailor.source);
  return { ...restored, id: cv.id, tailor: undefined, updatedAt: Date.now() };
}

function rewriteBody(source: CvBody, title: string, matched: string[]): CvBody {
  const lang = source.lang;
  const focus = matched.slice(0, 6);
  const summary =
    lang === "ar"
      ? `أستهدف وظيفة ${title}.${focus.length ? ` الخبرات الحالية تغطي: ${focus.join("، ")}.` : ""} ${source.summary.trim()}`.trim()
      : `Target role: ${title}.${focus.length ? ` Current experience covers: ${focus.join(", ")}.` : ""} ${source.summary.trim()}`.trim();

  const experience = source.experience.map((role) => ({
    ...role,
    bullets: rank(role.bullets, matched),
  }));

  const skillGroups = source.skillGroups.map((group) => ({
    ...group,
    items: rank(group.items, matched),
  }));

  const already = new Set(
    skillGroups.flatMap((group) => group.items.map((item) => item.trim().toLowerCase())).filter(Boolean),
  );
  const extra = focus.filter((term) => !already.has(term.toLowerCase()));
  if (extra.length) {
    skillGroups.push({
      id: `focus-${title.slice(0, 12)}`,
      title: lang === "ar" ? "تركيز الإعلان" : "Role focus",
      items: extra,
    });
  }

  return {
    ...source,
    profile: { ...source.profile, headline: title },
    summary,
    experience,
    skillGroups,
  };
}

function applyBody(cv: CvDoc, body: CvBody): CvDoc {
  return {
    ...cv,
    lang: body.lang,
    profile: structuredClone(body.profile),
    summary: body.summary,
    experience: structuredClone(body.experience),
    education: structuredClone(body.education),
    skillGroups: structuredClone(body.skillGroups),
    languages: structuredClone(body.languages),
    training: [...body.training],
    interests: [...body.interests],
  };
}

function termsFromJd(jd: string): string[] {
  const acronyms = jd.match(/\b[A-Z][A-Z0-9]{1,6}\b/g) ?? [];
  const counts = new Map<string, { label: string; n: number }>();
  for (const token of jd.split(/[^\p{L}\p{N}+#]+/u)) {
    let label = token.trim().replace(/^و(?=\p{L})/u, "");
    const key = label.toLowerCase();
    if (!key || STOP.has(key) || key.length < 3 || /^\d+$/.test(key)) continue;
    const prev = counts.get(key);
    counts.set(key, { label: prev?.label ?? label, n: (prev?.n ?? 0) + 1 });
  }
  const ranked = [...counts.values()].sort((a, b) => b.n - a.n || b.label.length - a.label.length).map((item) => item.label);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of [...acronyms, ...ranked]) {
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(term);
    if (out.length >= 16) break;
  }
  return out;
}

function mentioned(hay: string, term: string): boolean {
  const key = term.toLowerCase();
  if (hay.includes(key)) return true;
  const bare = key.replace(/^ال/, "");
  return bare.length >= 3 && bare !== key && hay.includes(bare);
}

function rank(items: string[], terms: string[]): string[] {
  return items
    .map((item, index) => ({ item, index, score: scoreText(item, terms) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((row) => row.item);
}

function scoreText(text: string, terms: string[]): number {
  const hay = text.toLowerCase();
  return terms.reduce((total, term) => total + (mentioned(hay, term) ? 1 : 0), 0);
}
