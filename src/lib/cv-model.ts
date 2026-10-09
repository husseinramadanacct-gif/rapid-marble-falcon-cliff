export type Lang = "ar" | "en";

export type ExperienceRole = {
  id: string;
  title: string;
  company: string;
  start: string;
  end: string;
  current?: boolean;
  bullets: string[];
};

export type EducationItem = {
  id: string;
  degree: string;
  school: string;
  year: string;
};

export type SkillGroup = {
  id: string;
  title: string;
  items: string[];
};

export type LanguageItem = {
  id: string;
  name: string;
  level: string;
};

export type CvProfile = {
  name: string;
  headline: string;
  location: string;
  phone: string;
  email: string;
};

export type CvBody = {
  lang: Lang;
  profile: CvProfile;
  summary: string;
  experience: ExperienceRole[];
  education: EducationItem[];
  skillGroups: SkillGroup[];
  languages: LanguageItem[];
  training: string[];
  interests: string[];
};

export type TailorMeta = {
  title: string;
  jd: string;
  matched: string[];
  skipped: string[];
  source: CvBody;
};

export type CvDoc = {
  id: string;
  lang: Lang;
  updatedAt: number;
  profile: CvProfile;
  summary: string;
  experience: ExperienceRole[];
  education: EducationItem[];
  skillGroups: SkillGroup[];
  languages: LanguageItem[];
  training: string[];
  interests: string[];
  tailor?: TailorMeta;
};

export const HEADINGS: Record<
  Lang,
  {
    summary: string;
    experience: string;
    education: string;
    skills: string;
    languages: string;
    training: string;
    interests: string;
  }
> = {
  ar: {
    summary: "الملخص المهني",
    experience: "الخبرة العملية",
    education: "المؤهلات العلمية",
    skills: "المهارات والكفاءات",
    languages: "اللغات",
    training: "الدورات التدريبية",
    interests: "الاهتمامات المهنية",
  },
  en: {
    summary: "PROFESSIONAL SUMMARY",
    experience: "PROFESSIONAL EXPERIENCE",
    education: "EDUCATION",
    skills: "SKILLS AND COMPETENCIES",
    languages: "LANGUAGES",
    training: "TRAINING AND CERTIFICATIONS",
    interests: "PROFESSIONAL INTERESTS",
  },
};

export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyRole(): ExperienceRole {
  return { id: uid(), title: "", company: "", start: "", end: "", bullets: [""] };
}

export function emptyEducation(): EducationItem {
  return { id: uid(), degree: "", school: "", year: "" };
}

export function emptySkillGroup(lang: Lang): SkillGroup {
  return {
    id: uid(),
    title: lang === "ar" ? "المهارات" : "Skills",
    items: [""],
  };
}

export function emptyLanguage(): LanguageItem {
  return { id: uid(), name: "", level: "" };
}

export function emptyCv(lang: Lang): CvDoc {
  return {
    id: uid(),
    lang,
    updatedAt: Date.now(),
    profile: { name: "", headline: "", location: "", phone: "", email: "" },
    summary: "",
    experience: [emptyRole()],
    education: [emptyEducation()],
    skillGroups: [emptySkillGroup(lang)],
    languages: [emptyLanguage()],
    training: [],
    interests: [],
  };
}

export function contactLine(cv: CvDoc): string {
  return [cv.profile.email, cv.profile.phone, cv.profile.location].filter(Boolean).join("  |  ");
}

export function dateRange(role: ExperienceRole): string {
  return [role.start, role.end].filter(Boolean).join(" – ");
}

export function roleYear(role: ExperienceRole): number {
  const match = role.start.match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

export function filledSkills(cv: CvDoc): string[] {
  return cv.skillGroups.flatMap((group) => group.items.map((item) => item.trim()).filter(Boolean));
}

export function filledExperience(cv: CvDoc): ExperienceRole[] {
  return cv.experience
    .map((role) => ({
      ...role,
      bullets: role.bullets.map((item) => item.trim()).filter(Boolean),
    }))
    .filter((role) => role.title.trim() || role.company.trim() || role.bullets.length > 0);
}

export function filledEducation(cv: CvDoc): EducationItem[] {
  return cv.education.filter((item) => item.degree.trim() || item.school.trim() || item.year.trim());
}

export function filledLanguages(cv: CvDoc): LanguageItem[] {
  return cv.languages.filter((item) => item.name.trim());
}

export function filledLines(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}

export function displayName(cv: CvDoc, fallback: string): string {
  return cv.profile.name.trim() || fallback;
}

export function snapshotBody(cv: CvDoc): CvBody {
  return {
    lang: cv.lang,
    profile: structuredClone(cv.profile),
    summary: cv.summary,
    experience: structuredClone(cv.experience),
    education: structuredClone(cv.education),
    skillGroups: structuredClone(cv.skillGroups),
    languages: structuredClone(cv.languages),
    training: [...cv.training],
    interests: [...cv.interests],
  };
}

export function fileStem(cv: CvDoc): string {
  const raw = cv.profile.name.trim() || (cv.lang === "ar" ? "سيرة" : "Resume");
  const slug = raw
    .replaceAll(/[^\p{L}\p{N}]+/gu, "_")
    .replaceAll(/^_+|_+$/g, "")
    .slice(0, 48);
  return slug || "Resume";
}

export function cloneCv(cv: CvDoc, lang = cv.lang): CvDoc {
  return {
    ...structuredClone(cv),
    id: uid(),
    lang,
    updatedAt: Date.now(),
    experience: cv.experience.map((role) => ({ ...role, id: uid(), bullets: [...role.bullets] })),
    education: cv.education.map((item) => ({ ...item, id: uid() })),
    skillGroups: cv.skillGroups.map((group) => ({ ...group, id: uid(), items: [...group.items] })),
    languages: cv.languages.map((item) => ({ ...item, id: uid() })),
    training: [...cv.training],
    interests: [...cv.interests],
  };
}

export function isCvDoc(value: unknown): value is CvDoc {
  if (!value || typeof value !== "object") return false;
  const doc = value as CvDoc;
  return (
    typeof doc.id === "string" &&
    (doc.lang === "ar" || doc.lang === "en") &&
    !!doc.profile &&
    typeof doc.profile.name === "string" &&
    Array.isArray(doc.experience)
  );
}

export function buildPlainText(cv: CvDoc): string {
  const headings = HEADINGS[cv.lang];
  const lines: string[] = [];
  lines.push(cv.profile.name);
  if (cv.profile.headline) lines.push(cv.profile.headline);
  const contact = contactLine(cv);
  if (contact) lines.push(contact);
  lines.push("");
  if (cv.summary.trim()) {
    lines.push(headings.summary);
    lines.push(cv.summary.trim());
    lines.push("");
  }
  const roles = filledExperience(cv);
  if (roles.length) {
    lines.push(headings.experience);
    for (const role of roles) {
      lines.push(`${role.title} | ${role.company} | ${dateRange(role)}`.replaceAll(" |  | ", " | "));
      for (const bullet of role.bullets) lines.push(`- ${bullet}`);
      lines.push("");
    }
  }
  const education = filledEducation(cv);
  if (education.length) {
    lines.push(headings.education);
    for (const item of education) {
      lines.push([item.degree, item.school, item.year].filter(Boolean).join(" | "));
    }
    lines.push("");
  }
  const groups = cv.skillGroups.filter((group) => group.title.trim() || group.items.some((item) => item.trim()));
  if (groups.length) {
    lines.push(headings.skills);
    for (const group of groups) {
      const items = group.items.map((item) => item.trim()).filter(Boolean);
      lines.push(`${group.title}: ${items.join(" | ")}`);
    }
    lines.push("");
  }
  const langs = filledLanguages(cv);
  if (langs.length) {
    lines.push(headings.languages);
    lines.push(langs.map((item) => (item.level ? `${item.name} (${item.level})` : item.name)).join(" | "));
    lines.push("");
  }
  const training = filledLines(cv.training);
  if (training.length) {
    lines.push(headings.training);
    lines.push(training.join(" | "));
    lines.push("");
  }
  const interests = filledLines(cv.interests);
  if (interests.length) {
    lines.push(headings.interests);
    lines.push(interests.join(" | "));
  }
  return lines.join("\n").trim();
}

export function buildExportHtml(cv: CvDoc): string {
  const dir = cv.lang === "ar" ? "rtl" : "ltr";
  const headings = HEADINGS[cv.lang];
  const roles = filledExperience(cv)
    .map((role) => {
      const bullets = role.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("");
      return `<h3 style="margin:12px 0 2px;font-size:13pt;">${escapeHtml(role.title)}</h3>
<p style="margin:0 0 6px;font-size:11pt;"><b>${escapeHtml(role.company)}</b> &nbsp;|&nbsp; ${escapeHtml(dateRange(role))}</p>
<ul style="margin:0 0 8px;padding-inline-start:20px;">${bullets}</ul>`;
    })
    .join("");
  const education = filledEducation(cv)
    .map(
      (item) =>
        `<p><b>${escapeHtml(item.degree)}</b><br/>${escapeHtml([item.school, item.year].filter(Boolean).join(" | "))}</p>`,
    )
    .join("");
  const skills = cv.skillGroups
    .filter((group) => group.items.some((item) => item.trim()))
    .map(
      (group) =>
        `<p style="margin:8px 0 4px;"><b>${escapeHtml(group.title)}</b><br/>${escapeHtml(group.items.filter(Boolean).join(" | "))}</p>`,
    )
    .join("");
  const langs = filledLanguages(cv)
    .map((item) => (item.level ? `${item.name} (${item.level})` : item.name))
    .join(" | ");
  const training = filledLines(cv.training).join(" | ");
  const interests = filledLines(cv.interests).join(" | ");

  return `<div dir="${dir}" style="font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45;color:#1c1917;max-width:800px;">
<h1 style="margin:0 0 4px;font-size:22pt;">${escapeHtml(cv.profile.name)}</h1>
<p style="margin:0 0 4px;font-size:12pt;">${escapeHtml(cv.profile.headline)}</p>
<p style="margin:0 0 14px;font-size:11pt;">${escapeHtml(contactLine(cv))}</p>
${cv.summary.trim() ? `<h2 style="font-size:13pt;border-bottom:1px solid #1f6b63;padding-bottom:3px;">${escapeHtml(headings.summary)}</h2><p>${escapeHtml(cv.summary.trim())}</p>` : ""}
${roles ? `<h2 style="font-size:13pt;border-bottom:1px solid #1f6b63;padding-bottom:3px;">${escapeHtml(headings.experience)}</h2>${roles}` : ""}
${education ? `<h2 style="font-size:13pt;border-bottom:1px solid #1f6b63;padding-bottom:3px;">${escapeHtml(headings.education)}</h2>${education}` : ""}
${skills ? `<h2 style="font-size:13pt;border-bottom:1px solid #1f6b63;padding-bottom:3px;">${escapeHtml(headings.skills)}</h2>${skills}` : ""}
${langs ? `<h2 style="font-size:13pt;border-bottom:1px solid #1f6b63;padding-bottom:3px;">${escapeHtml(headings.languages)}</h2><p>${escapeHtml(langs)}</p>` : ""}
${training ? `<h2 style="font-size:13pt;border-bottom:1px solid #1f6b63;padding-bottom:3px;">${escapeHtml(headings.training)}</h2><p>${escapeHtml(training)}</p>` : ""}
${interests ? `<h2 style="font-size:13pt;border-bottom:1px solid #1f6b63;padding-bottom:3px;">${escapeHtml(headings.interests)}</h2><p>${escapeHtml(interests)}</p>` : ""}
</div>`;
}

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob(["\ufeff", content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "\u0026amp;")
    .replaceAll("<", "\u0026lt;")
    .replaceAll(">", "\u0026gt;")
    .replaceAll("\"", "\u0026quot;");
}
