import { snapshotBody, type CvBody, type CvDoc, type Lang, type TailorMeta } from "./cv-model";

const STOP = new Set([
  "the", "and", "for", "with", "that", "this", "from", "your", "you", "are", "was", "were", "will",
  "have", "has", "had", "not", "but", "all", "any", "our", "their", "they", "who", "job", "role",
  "work", "ability", "skills", "skill", "experience", "required", "requirements", "including",
  "include", "must", "should", "able", "using", "into", "over", "about", "such", "other", "than",
  "also", "well", "team", "years", "year", "position", "responsibilities", "responsibility",
  "candidate", "looking", "plus", "within", "across", "through", "what", "when", "where", "which",
  "في", "من", "على", "إلى", "الى", "عن", "مع", "هذا", "هذه", "ذلك", "التي", "الذي", "أو", "او",
  "أن", "ان", "إن", "كان", "يكون", "يتم", "مطلوب", "خبرة", "العمل", "وظيفة", "الوظيفة", "لدينا",
  "نحن", "يجب", "يفضل", "يشمل", "بما", "خلال", "لديه", "تكون", "عدم", "كل", "أي",
]);

type LensId = "cost" | "payroll" | "treasury" | "tax" | "arap" | "audit" | "inventory" | "hr" | "sales" | "general";

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
  const terms = termsFromJd(`${cleanTitle}\n${cleanJd}`);
  const hay = bodyText(source).toLowerCase();
  const matched = terms.filter((term) => mentioned(hay, term));
  const skipped = terms.filter((term) => !mentioned(hay, term));
  const next = applyBody(base, rewriteBody(source, cleanTitle, cleanJd));
  const meta: TailorMeta = { title: cleanTitle, jd: cleanJd, matched, skipped, source };
  return { doc: { ...next, id: cv.id, tailor: meta, updatedAt: Date.now() }, matched, skipped };
}

export function restoreTailored(cv: CvDoc): CvDoc {
  if (!cv.tailor) return cv;
  const restored = applyBody(cv, cv.tailor.source);
  return { ...restored, id: cv.id, tailor: undefined, updatedAt: Date.now() };
}

function rewriteBody(source: CvBody, title: string, jd: string): CvBody {
  const lens = detectLens(title, jd, bodyText(source));
  const facts = readFacts(source);
  return {
    ...source,
    profile: { ...source.profile, headline: title },
    summary: writeSummary(source.lang, title, lens, facts, source),
    experience: source.experience.map((role) => ({
      ...role,
      title: retitle(role.title, title, source.lang),
      company: role.company,
      bullets: role.bullets.map((bullet) => rewriteBullet(bullet, lens, source.lang)),
    })),
    skillGroups: source.skillGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => rewriteSkill(item, lens, source.lang)),
    })),
    interests: source.interests.map((item) => rewriteInterest(item, title, lens, source.lang)),
  };
}

function detectLens(title: string, jd: string, cvText: string): LensId {
  const blob = `${title}\n${title}\n${jd}`.toLowerCase();
  const rules: [LensId, RegExp][] = [
    ["cost", /تكاليف|تكلفة|costing|\bcost\b|هامش الربح/],
    ["payroll", /رواتب|أجور|اجور|payroll|compensation/],
    ["treasury", /خزين|treasury|التدفق النقد|cash management/],
    ["tax", /ضريب|vat\b|tax\b|قيمة مضافة/],
    ["audit", /مراجع|تدقيق|audit/],
    ["inventory", /مخزون|مخازن|inventory|warehouse/],
    ["arap", /موردين|عملاء|payable|receivable|دائن|مدين/],
    ["hr", /موارد بشرية|شؤون الموظفين|human resources|\bhr\b/],
    ["sales", /مبيعات|تسويق|sales|business development/],
  ];
  for (const [id, re] of rules) {
    if (re.test(blob)) return id;
  }
  for (const [id, re] of rules) {
    if (re.test(cvText.toLowerCase()) && re.test(blob)) return id;
  }
  return "general";
}

function readFacts(source: CvBody) {
  const text = bodyText(source);
  const years =
    text.match(/تتجاوز\s+(\d+)\s+سنوات/)?.[1] ??
    text.match(/(\d+)\s+سنوات/)?.[1] ??
    text.match(/over\s+(\d+)\s+years/i)?.[1] ??
    text.match(/(\d+)\+?\s+years/i)?.[1] ??
    "";
  const sectorText = `${source.summary}\n${source.profile.headline}`;
  const sectors: string[] = [];
  const sectorRules: [RegExp, string, string][] = [
    [/تصنيع|manufactur/i, "التصنيع", "manufacturing"],
    [/ديكور|معارض/i, "الديكور والمعارض", "fit-out and exhibitions"],
    [/تجزئ|retail/i, "التجزئة", "retail"],
    [/مقاول|contracting/i, "المقاولات", "contracting"],
  ];
  for (const [re, ar, en] of sectorRules) {
    if (re.test(sectorText)) sectors.push(source.lang === "ar" ? ar : en);
  }
  const tools: string[] = [];
  for (const tool of ["Excel", "Power Query", "XLOOKUP", "ERP", "SAP", "Pivot Tables"]) {
    if (text.toLowerCase().includes(tool.toLowerCase())) tools.push(tool);
  }
  return { years, sectors: sectors.slice(0, 2), tools };
}

function writeSummary(lang: Lang, title: string, lens: LensId, facts: ReturnType<typeof readFacts>, source: CvBody): string {
  const text = bodyText(source);
  if (lang === "ar") {
    const years = facts.years ? ` بخبرة عملية تتجاوز ${facts.years} سنوات` : " بخبرة عملية متصلة";
    const where = facts.sectors.length ? ` في ${joinAr(facts.sectors)}` : "";
    const duty = dutyAr(lens, text);
    const tools = facts.tools.includes("Excel")
      ? " يجيد Excel بشكل متقدم في مراجعة الأرقام وإعداد تقارير واضحة تُعرض على الإدارة."
      : facts.tools.length
        ? ` يعتمد في عمله على ${joinAr(facts.tools)}.`
        : "";
    return `${title}${years}${where}. ${duty}${tools}`.replaceAll(/\s+/g, " ").trim();
  }
  const years = facts.years ? ` with more than ${facts.years} years of experience` : " with hands-on accounting experience";
  const where = facts.sectors.length ? ` in ${joinEn(facts.sectors)}` : "";
  const duty = dutyEn(lens, text);
  const tools = facts.tools.includes("Excel")
    ? " Advanced Excel user, preparing clear reports for management."
    : facts.tools.length
      ? ` Works with ${joinEn(facts.tools)}.`
      : "";
  return `${title}${years}${where}. ${duty}${tools}`.replaceAll(/\s+/g, " ").trim();
}

function dutyAr(lens: LensId, text: string): string {
  const has = (re: RegExp) => re.test(text);
  if (lens === "cost") {
    const parts = [
      has(/تكلفة|إنتاج|مخزون|خامات/) ? "متابعة تكلفة الإنتاج وحركة المخزون من الخامات حتى تحميل المصروف على المنتج" : "",
      has(/قيود|إقفال|تسو/) ? "مراجعة القيود والتسويات المرتبطة بالتكلفة قبل الإقفال الشهري" : "",
      has(/تقارير|ميزان/) ? "إعداد تقارير توضح انحراف التكلفة وتدعم قرار الإدارة" : "",
    ].filter(Boolean);
    return `يتولى ${joinAr(parts.length ? parts : ["ربط الدورة المحاسبية بتكلفة التشغيل ومراجعتها قبل الإقفال"])}.`;
  }
  if (lens === "payroll") {
    const parts = [
      has(/رواتب|موظف|حضور/) ? "إعداد ومراجعة مسير الرواتب ومطابقة الحضور والاستحقاقات" : "",
      has(/تسو|إقفال/) ? "تسوية بنود الرواتب قبل الإقفال الشهري" : "",
      has(/تقارير/) ? "إخراج تقارير الرواتب للإدارة في موعدها" : "",
    ].filter(Boolean);
    return `يتولى ${joinAr(parts.length ? parts : ["دورة الرواتب من الاحتساب حتى التسليم والمراجعة"])}.`;
  }
  if (lens === "treasury") {
    const parts = [
      has(/خزين|نقد/) ? "إدارة الحركة اليومية للخزينة ومطابقتها على الرصيد الفعلي" : "",
      has(/تسو|فروقات/) ? "معالجة الفروقات والبنود المعلقة قبل الإقفال" : "",
      has(/تقارير|تدفق/) ? "إعداد موقف السيولة والتقارير النقدية للإدارة" : "",
    ].filter(Boolean);
    return `يتولى ${joinAr(parts.length ? parts : ["متابعة النقد اليومي وتسويته بما يطابق الدفاتر"])}.`;
  }
  if (lens === "tax") {
    return "يتولى تجهيز التسويات الضريبية ومراجعتها على القيود والفواتير، وإعداد الإقرارات في مواعيدها بالتنسيق مع الإقفال الشهري.";
  }
  if (lens === "audit") {
    return "يراجع القيود والأرصدة والمطابقات، ويوثق الفروقات قبل الإقفال، ويُعد أوراق العمل التي تعتمد عليها القوائم والتقارير.";
  }
  if (lens === "inventory") {
    return "يتابع حركة المخزون والاستلام والصرف، ويراجع الجرد والفروقات، ويربط حركة المخزن بتكلفة البضاعة والقيود.";
  }
  if (lens === "arap") {
    return "يتابع حسابات الموردين والعملاء، ويراجع الفواتير والتحصيل والسداد، ويعالج الفروقات قبل إقفال الشهر.";
  }
  if (lens === "hr") {
    return "يتابع شؤون الموظفين والحضور والإجازات ومسير الرواتب، وينسق الإجراءات اليومية مع الإدارة.";
  }
  if (lens === "sales") {
    return "يتابع دورة المبيعات من أمر البيع حتى التحصيل، ويراجع الفواتير وأرصدة العملاء والتقارير الدورية.";
  }
  const clauses = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 25 && line.length < 140 && !/^(الملخص|الخبرة|المهارات)/.test(line))
    .slice(0, 3)
    .map((line) => line.replace(/^[•\-]\s*/, "").replace(/\.$/, ""));
  if (!clauses.length) return "يتولى الدورة المحاسبية اليومية والإقفال والتقارير الدورية.";
  return `من واقع عمله: ${joinAr(clauses.map((line) => line.charAt(0).toLowerCase() + line.slice(1)))}.`;
}

function dutyEn(lens: LensId, text: string): string {
  const has = (re: RegExp) => re.test(text);
  if (lens === "cost") {
    const parts = [
      has(/cost|production|inventory|material/i) ? "production costing and inventory from materials through to the product" : "",
      has(/journal|reconcil|close/i) ? "review of cost journals and reconciliations before month-end" : "",
      has(/report|trial balance/i) ? "cost reports that show variances for management" : "",
    ].filter(Boolean);
    return `Responsible for ${joinEn(parts.length ? parts : ["linking the accounting cycle to operating cost"])}.`;
  }
  if (lens === "payroll") return "Responsible for payroll preparation, attendance matching, and payroll reports before close.";
  if (lens === "treasury") return "Responsible for daily cash, treasury reconciliation, and liquidity reporting.";
  if (lens === "tax") return "Prepares tax reconciliations against the books and files returns on time with the monthly close.";
  if (lens === "audit") return "Reviews journals, balances, and reconciliations, and documents exceptions before the close.";
  if (lens === "inventory") return "Tracks stock movements, counts, and variances, and ties the warehouse to inventory cost.";
  if (lens === "arap") return "Looks after supplier and customer accounts, invoices, collections, and month-end differences.";
  if (lens === "hr") return "Handles employee records, attendance, leave, and payroll coordination with management.";
  if (lens === "sales") return "Follows the sales cycle from order to collection, including invoices and customer balances.";
  return "Covers the day-to-day accounting cycle, reconciliations, and management reporting.";
}

function retitle(current: string, target: string, lang: Lang): string {
  if (!current.trim()) return target;
  if (/متدرب|trainee|intern/i.test(current)) return lang === "ar" ? `متدرب — ${target}` : `Trainee — ${target}`;
  return target;
}

function rewriteBullet(bullet: string, lens: LensId, lang: Lang): string {
  const text = bullet.trim();
  if (!text) return text;
  if (lang === "en") return rewriteBulletEn(text, lens);
  return rewriteBulletAr(text, lens);
}

function rewriteBulletAr(text: string, lens: LensId): string {
  const amount = text.match(/(\d[\d.,]*\s*(?:مليون|ألف)?\s*جنيه)/)?.[1];
  const people = text.match(/((?:أكثر من|اكثر من|نحو)\s+)?(\d[\d.,]*)\s*موظف/);
  const peopleLabel = people ? `${people[1] ?? ""}${people[2]} موظف`.replaceAll(/\s+/g, " ").trim() : "";
  const moves = text.match(/(\d[\d.,]*\s*حركة)/)?.[1];
  if (lens === "cost") {
    if (/تكلفة الإنتاج|تكاليف الإنتاج|تكلفة/.test(text)) {
      return "متابعة تكلفة الإنتاج ومراجعة القيود اليومية للمبيعات والخامات، مع التأكد من صحة التحميل وفق دليل الحسابات.";
    }
    if (amount && /خزين|حركة|نقد/.test(text)) {
      const moveBit = moves ? ` وتشمل ${moves}` : "";
      return `متابعة أثر التشغيل النقدي بحجم ${amount}${moveBit}، مع معالجة الفروقات قبل تحميلها على تكلفة الفترة.`;
    }
    if (/موردين|عملاء/.test(text)) {
      return "مراجعة مشتريات الموردين وأثرها على تكلفة الوحدة، وتسوية الأرصدة قبل الإقفال الشهري.";
    }
    if (/ميزان المراجعة/.test(text)) {
      return "إعداد تقارير التكلفة وميزان المراجعة لبيان الانحراف ودعم قرار الإدارة.";
    }
    if (/تقارير/.test(text) && /إقفال/.test(text)) {
      return "إعداد تقرير التكلفة الشهري وإقفاله مع باقي حسابات الفترة.";
    }
    if (/تقارير/.test(text)) {
      return "إعداد تقارير التكلفة الدورية التي توضح الانحراف للإدارة.";
    }
    if (peopleLabel && /رواتب|أجر|حضور/.test(text)) {
      return `احتساب تكلفة العمالة من كشوف الرواتب لـ${peopleLabel}، مع مطابقة الحضور والاستحقاقات.`;
    }
    if (/خزين|نقد/.test(text)) {
      return "متابعة النقد المستخدم في التشغيل وتسويته على تكلفة الفترة.";
    }
    if (/إقفال/.test(text)) {
      return "المشاركة في الإقفال الشهري واعتماد أرقام التكلفة قبل إصدار التقارير.";
    }
  }
  if (lens === "payroll") {
    if (peopleLabel) return `مراجعة مسير الرواتب لـ${peopleLabel}، ومطابقة الحضور والاستحقاقات والاستقطاعات قبل الصرف.`;
    if (/خزين|نقد/.test(text)) return "مطابقة صافي الرواتب على حركة الخزينة يوم الصرف، ومعالجة أي فرق قبل الإقفال.";
    if (/تقارير|إقفال/.test(text)) return "إعداد تقارير الرواتب الشهرية وإقفال استحقاقاتها مع باقي حسابات الشهر.";
    if (/قيود|مبيعات|تكلفة/.test(text)) return "تسجيل قيد الرواتب والاستقطاعات ومراجعته على مسير الشهر ودليل الحسابات.";
  }
  if (lens === "treasury") {
    if (amount) {
      const moveBit = moves ? `، ومتابعة ${moves}` : "";
      return `إدارة حركة الخزينة بحجم ${amount}${moveBit}، ومطابقة الرصيد ومعالجة المعلق يوميًا.`;
    }
    if (/رواتب|موظف/.test(text)) return "تنفيذ صرف الرواتب من الخزينة بعد مطابقة المسير، وتسوية قيد الصرف.";
    if (/موردين|عملاء|تسو/.test(text)) return "متابعة سداد الموردين وتحصيل العملاء وأثرهما على رصيد الخزينة قبل الإقفال.";
    if (/تقارير|إقفال|ميزان/.test(text)) return "إعداد موقف الخزينة اليومي وربطه بالإقفال الشهري وتقارير الإدارة.";
  }
  if (lens === "tax" && /قيد|فاتور|إقرار|ضريب|إقفال|تسو/.test(text)) {
    return "مراجعة القيود والفواتير ذات الأثر الضريبي وتسويتها قبل إعداد الإقرار مع الإقفال الشهري.";
  }
  if (lens === "inventory" && /مخزون|خامات|إنتاج|جرد|تكلفة/.test(text)) {
    return "متابعة حركة المخزون والاستلام والصرف، ومراجعة فروقات الجرد وربطها بتكلفة البضاعة.";
  }
  if (lens === "arap" && /موردين|عملاء|تحصيل|سداد|أرصدة/.test(text)) {
    return "متابعة أرصدة الموردين والعملاء ومراجعة الفواتير والتحصيل والسداد، ومعالجة الفروقات قبل الإقفال.";
  }
  return text.endsWith(".") ? text : `${text}.`;
}

function rewriteBulletEn(text: string, lens: LensId): string {
  const amount = text.match(/(?:EGP|USD|\$|about\s+)?\d[\d.,]*\s*(?:million|thousand)?/i)?.[0];
  const people = text.match(/\d[\d.,]*\s+employees?/i)?.[0];
  if (lens === "cost") {
    if (/production cost|cost/i.test(text)) {
      return "Track production cost and review daily journals for sales and materials, checking that charges hit the right product accounts.";
    }
    if (amount && /treasury|cash|movement/i.test(text)) {
      return `Review operating cash of ${amount} as part of period cost, and clear variances before close.`;
    }
    if (/supplier|customer/i.test(text)) {
      return "Review supplier purchases and their effect on unit cost, and reconcile balances before month-end.";
    }
    if (/report|trial balance/i.test(text)) {
      return "Prepare cost reports and the trial balance so management can see variances.";
    }
    if (people && /payroll|wage/i.test(text)) {
      return `Cost labor from payroll for ${people}, matching attendance and entitlements.`;
    }
  }
  if (lens === "payroll" && (people || /payroll|wage/i.test(text))) {
    return people
      ? `Review monthly payroll for ${people}, matching attendance, entitlements, and deductions before payment.`
      : "Review the payroll run, match it to cash, and close the accrual with the rest of the month.";
  }
  if (lens === "treasury" && /treasury|cash/i.test(text)) {
    return amount
      ? `Run treasury movements of ${amount}, match the balance, and clear open items daily.`
      : "Match daily cash to the books and report the treasury position before close.";
  }
  return /[.]$/.test(text) ? text : `${text}.`;
}

function rewriteSkill(item: string, lens: LensId, lang: Lang): string {
  const text = item.trim();
  if (!text) return text;
  if (/excel|word|powerpoint|power query|sap|erp|xlookup|pivot/i.test(text)) return text;
  if (lang === "ar" && lens === "cost") {
    if (/تحليل البيانات|مراجعة وتحليل/.test(text)) return "تحليل بنود التكلفة ومراجعتها على الحركة الفعلية";
    if (/فروقات|تسويات/.test(text)) return "معالجة فروقات التكلفة وتسويات المخزون قبل الإقفال";
    if (/تقارير/.test(text)) return "إعداد تقارير التكلفة الداعمة لقرار الإدارة";
  }
  if (lang === "ar" && lens === "payroll") {
    if (/تحليل|مراجعة/.test(text)) return "مراجعة مسير الرواتب والاستقطاعات قبل الصرف";
    if (/فروقات|تسويات/.test(text)) return "تسوية فروقات الرواتب والحضور قبل الإقفال";
    if (/تقارير/.test(text)) return "إعداد تقارير الرواتب الشهرية للإدارة";
  }
  if (lang === "ar" && lens === "treasury") {
    if (/تحليل|مراجعة/.test(text)) return "مطابقة حركة الخزينة على الدفاتر يوميًا";
    if (/فروقات|تسويات/.test(text)) return "إغلاق الفروقات والبنود المعلقة في الخزينة";
    if (/تقارير/.test(text)) return "إعداد موقف السيولة والتقارير النقدية";
  }
  if (lang === "en" && lens === "cost") {
    if (/analy|review/i.test(text)) return "Review cost lines against actual movements";
    if (/reconcil|variance/i.test(text)) return "Clear cost and inventory variances before close";
    if (/report/i.test(text)) return "Prepare cost reports for management decisions";
  }
  return text;
}

function rewriteInterest(item: string, title: string, lens: LensId, lang: Lang): string {
  const text = item.trim();
  if (!text) return text;
  if (lang === "ar") {
    if (lens === "cost" && /محاسبة/.test(text)) return text.replaceAll("المحاسبة", "تحليل التكلفة").replaceAll("محاسبة", "التكاليف");
    if (lens === "payroll" && /محاسبة/.test(text)) return text.replaceAll("المحاسبة", "الرواتب").replaceAll("محاسبة", "الرواتب");
    if (lens === "treasury" && /محاسبة/.test(text)) return text.replaceAll("المحاسبة", "الخزينة").replaceAll("محاسبة", "الخزينة");
    if (/محاسبة/.test(text) && title) return text.replace("المحاسبة", title).replace("محاسبة", title);
  }
  if (lang === "en" && lens === "cost") return text.replace(/accounting/gi, "cost accounting");
  return text;
}

function joinAr(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  if (list.length === 2) return `${list[0]} و${list[1]}`;
  return `${list.slice(0, -1).join("، ")}، و${list[list.length - 1]}`;
}

function joinEn(items: string[]): string {
  const list = items.filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

function bodyText(source: CvBody): string {
  return [
    source.summary,
    ...source.experience.flatMap((role) => [role.title, role.company, ...role.bullets]),
    ...source.skillGroups.flatMap((group) => group.items),
    ...source.training,
    ...source.interests,
  ].join("\n");
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
    const label = token.trim().replace(/^و(?=\p{L})/u, "");
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
    if (out.length >= 12) break;
  }
  return out;
}

function mentioned(hay: string, term: string): boolean {
  const key = term.toLowerCase();
  if (hay.includes(key)) return true;
  const bare = key.replace(/^ال/, "");
  return bare.length >= 3 && bare !== key && hay.includes(bare);
}
