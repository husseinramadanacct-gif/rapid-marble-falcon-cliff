import { useEffect, useState } from "react";
import { RotateCcw, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/copy";
import type { CvDoc, Lang } from "@/lib/cv-model";
import { useCvStore } from "@/lib/cv-store";

export function CvTailorPanel({ cv, uiLang }: { cv: CvDoc; uiLang: Lang }) {
  const copy = t(uiLang);
  const applyTailor = useCvStore((s) => s.applyTailor);
  const restoreTailor = useCvStore((s) => s.restoreTailor);
  const [title, setTitle] = useState(cv.tailor?.title ?? "");
  const [jd, setJd] = useState(cv.tailor?.jd ?? "");

  useEffect(() => {
    setTitle(cv.tailor?.title ?? "");
    setJd(cv.tailor?.jd ?? "");
  }, [cv.id, cv.tailor?.title, cv.tailor?.jd]);

  const ready = title.trim().length > 0 && jd.trim().length > 0;

  return (
    <section className="rounded-lg border border-accent/40 bg-bg-elevated p-5 shadow-panel">
      <h2 className="text-sm font-semibold text-ink">{copy.tailorTitle}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{copy.tailorHint}</p>
      <label className="mt-4 block text-xs font-medium text-muted">
        {copy.tailorRole}
        <input
          value={title}
          placeholder={copy.tailorRolePh}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>
      <label className="mt-3 block text-xs font-medium text-muted">
        {copy.tailorJd}
        <textarea
          value={jd}
          rows={6}
          placeholder={copy.tailorJdPh}
          onChange={(event) => setJd(event.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm leading-relaxed text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!ready} onClick={() => applyTailor(title, jd)}>
          <WandSparkles />
          {copy.tailorApply}
        </Button>
        {cv.tailor ? (
          <Button type="button" size="sm" variant="outline" onClick={restoreTailor}>
            <RotateCcw />
            {copy.tailorRestore}
          </Button>
        ) : null}
      </div>
      {cv.tailor ? (
        <div className="mt-4 space-y-3 text-sm">
          <p className="font-medium text-ink">{copy.tailorDone}</p>
          {cv.tailor.matched.length ? (
            <TermList label={copy.tailorMatched} terms={cv.tailor.matched} found />
          ) : null}
          {cv.tailor.skipped.length ? <TermList label={copy.tailorSkipped} terms={cv.tailor.skipped} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function TermList({ label, terms, found }: { label: string; terms: string[]; found?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {terms.map((term) => (
          <span
            key={term}
            className={
              found
                ? "rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
                : "rounded-full bg-score-track px-2.5 py-1 text-xs font-medium text-subtle"
            }
          >
            {term}
          </span>
        ))}
      </div>
    </div>
  );
}
