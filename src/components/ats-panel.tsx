import { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, ClipboardList, Minus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfFormatList } from "@/components/pdf-export";
import { t } from "@/lib/copy";
import { SAMPLE_JOBS, runAts, type AtsCheck } from "@/lib/ats-engine";
import type { CvDoc, Lang } from "@/lib/cv-model";
import { cn } from "@/lib/utils";

export function AtsPanel({ cv, uiLang }: { cv: CvDoc; uiLang: Lang }) {
  const copy = t(uiLang);
  const [jd, setJd] = useState(cv.tailor?.jd ?? "");
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const report = useMemo(() => runAts(cv, jd), [cv, jd]);

  useEffect(() => {
    if (cv.tailor?.jd) setJd(cv.tailor.jd);
  }, [cv.id, cv.tailor?.jd]);

  return (
    <aside className="flex min-w-0 flex-col gap-5 overflow-x-clip">
      <ScoreCard lang={uiLang} score={report.score} original={report.originalScore} grade={report.grade} />

      <Panel>
        <h3 className="text-sm font-semibold text-ink">{copy.howTitle}</h3>
        <ul className="mt-3 space-y-2">
          {copy.howItems.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h3 className="text-sm font-semibold text-ink">{copy.pdfPanelTitle}</h3>
        <p className="mt-1 text-sm text-muted">{copy.pdfPanelHint}</p>
        <PdfFormatList cv={cv} uiLang={uiLang} className="mt-4" />
        <p className="mt-4 text-xs font-medium text-ink">{copy.pdfWhyTitle}</p>
        <ul className="mt-2 space-y-2">
          {copy.pdfWhyItems.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed text-muted">
              <Check className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <h3 className="text-sm font-semibold text-ink">{copy.checksTitle}</h3>
        <ul className="mt-3 space-y-3">
          {report.checks.map((check) => (
            <CheckRow key={check.id} check={check} lang={uiLang} />
          ))}
        </ul>
      </Panel>

      <Panel>
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-ink">{copy.keywordsTitle}</h3>
          <p className="text-xs font-medium text-muted">
            {copy.coverage} {report.keywordCoverage}%
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 overflow-hidden">
          {report.keywordHits.map((hit) => (
            <span
              key={hit.term}
              className={cn(
                "max-w-full rounded-full px-2.5 py-1 text-xs font-medium break-words",
                hit.found ? "bg-accent-soft text-accent" : "bg-score-track text-subtle",
              )}
            >
              {hit.term}
            </span>
          ))}
        </div>
      </Panel>

      <Panel>
        <h3 className="text-sm font-semibold text-ink">{copy.jdTitle}</h3>
        <p className="mt-1 text-sm text-muted">{copy.jdHint}</p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-subtle">{copy.samplesLabel}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SAMPLE_JOBS[cv.lang].map((sample) => (
            <Button
              key={sample.id}
              type="button"
              size="sm"
              variant={activeSample === sample.id ? "default" : "outline"}
              onClick={() => {
                setActiveSample(sample.id);
                setJd(sample.text);
              }}
            >
              {sample.title}
            </Button>
          ))}
        </div>
        <textarea
          value={jd}
          onChange={(event) => {
            setJd(event.target.value);
            setActiveSample(null);
          }}
          rows={6}
          className="mt-3 w-full resize-y rounded-md border border-line bg-paper px-3 py-3 text-sm text-ink outline-none transition-[box-shadow] duration-150 placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-accent/40"
          placeholder={copy.jdPlaceholder}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => { setJd(""); setActiveSample(null); }}>
            {copy.clearJd}
          </Button>
        </div>
        {report.jdCoverage !== null && (
          <div className="mt-4 rounded-md bg-accent-soft p-4">
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm font-semibold text-ink">{copy.matchScore}</p>
              <p className="text-2xl font-semibold tabular-nums text-accent">{report.jdCoverage}%</p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <KeywordList title={copy.matched} items={report.jdMatched} tone="ok" />
              <KeywordList title={copy.notMatched} items={report.jdMissing} tone="miss" />
            </div>
          </div>
        )}
      </Panel>

      <Panel>
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-accent" />
          <h3 className="text-sm font-semibold text-ink">{copy.parserTitle}</h3>
        </div>
        <p className="mt-1 text-sm text-muted">{copy.parserHint}</p>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-sm bg-ink px-3 py-3 text-xs leading-relaxed text-paper">
          {report.parserPreview}
        </pre>
      </Panel>
    </aside>
  );
}

function ScoreCard({
  lang,
  score,
  original,
  grade,
}: {
  lang: Lang;
  score: number;
  original: number;
  grade: "excellent" | "strong" | "fair" | "weak";
}) {
  const copy = t(lang);
  const gradeLabel = {
    excellent: copy.gradeExcellent,
    strong: copy.gradeStrong,
    fair: copy.gradeFair,
    weak: copy.gradeWeak,
  }[grade];

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-subtle">{copy.scoreTitle}</p>
          <p className="mt-1 text-sm font-medium text-ink">{gradeLabel}</p>
        </div>
        <ShieldCheck className="size-4 text-accent" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <ScoreGauge label={copy.thisVersion} value={score} accent />
        <ScoreGauge label={copy.originalTitle} value={original} />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">{copy.originalHint}</p>
    </Panel>
  );
}

function ScoreGauge({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const color = accent ? "var(--color-accent)" : "var(--color-warn)";
  return (
    <div className="flex items-center gap-3">
      <svg width="84" height="84" viewBox="0 0 84 84" className="shrink-0" aria-hidden>
        <circle cx="42" cy="42" r={radius} fill="none" stroke="var(--color-score-track)" strokeWidth="7" />
        <circle
          className="score-ring"
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <p className="text-3xl font-semibold tabular-nums leading-none text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function CheckRow({ check, lang }: { check: AtsCheck; lang: Lang }) {
  const copy = t(lang);
  const Icon = check.status === "pass" ? Check : check.status === "warn" ? CircleAlert : Minus;
  const tone =
    check.status === "pass" ? "text-success" : check.status === "warn" ? "text-warn" : "text-danger";
  const badge =
    check.status === "pass" ? copy.pass : check.status === "warn" ? copy.warn : copy.fail;
  return (
    <li className="rounded-sm bg-bg px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} strokeWidth={2} />
          <div>
            <p className="text-sm font-medium text-ink">{check.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{check.detail}</p>
          </div>
        </div>
        <span className={cn("shrink-0 text-xs font-medium", tone)}>{badge}</span>
      </div>
    </li>
  );
}

function KeywordList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "ok" | "miss";
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink">{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted">—</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className={cn(
                "rounded-full px-2 py-1 text-xs",
                tone === "ok" ? "bg-paper text-success" : "bg-paper text-warn",
              )}
            >
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-lg bg-bg-elevated p-5 shadow-panel",
        className,
      )}
    >
      {children}
    </section>
  );
}
