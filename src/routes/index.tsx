import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Download, FileInput, FileText, Languages, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AtsPanel } from "@/components/ats-panel";
import { CvDocument } from "@/components/cv-document";
import { CvEditor } from "@/components/cv-editor";
import { PdfExportButton } from "@/components/pdf-export";
import { t } from "@/lib/copy";
import {
  buildExportHtml,
  buildPlainText,
  displayName,
  downloadBlob,
  fileStem,
  isCvDoc,
} from "@/lib/cv-model";
import { useActiveCv, useCvStore } from "@/lib/cv-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  const uiLang = useCvStore((s) => s.uiLang);
  const setUiLang = useCvStore((s) => s.setUiLang);
  const hydrated = useCvStore((s) => s.hydrated);
  const docs = useCvStore((s) => s.docs);
  const activeId = useCvStore((s) => s.activeId);
  const setActive = useCvStore((s) => s.setActive);
  const createDoc = useCvStore((s) => s.createDoc);
  const duplicateActive = useCvStore((s) => s.duplicateActive);
  const deleteActive = useCvStore((s) => s.deleteActive);
  const importDoc = useCvStore((s) => s.importDoc);
  const cv = useActiveCv();
  const [tab, setTab] = useState<"edit" | "cv" | "ats">("edit");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const copy = t(uiLang);

  useEffect(() => {
    const finish = () => useCvStore.getState().setHydrated(true);
    if (useCvStore.persist.hasHydrated()) finish();
    const unsub = useCvStore.persist.onFinishHydration(finish);
    void useCvStore.persist.rehydrate();
    return unsub;
  }, []);

  useEffect(() => {
    document.documentElement.lang = uiLang;
    document.documentElement.dir = uiLang === "ar" ? "rtl" : "ltr";
  }, [uiLang]);

  async function copyPlain() {
    const text = buildPlainText(cv);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "true");
      area.style.position = "fixed";
      area.style.insetInlineStart = "-9999px";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      setCopied(ok);
    }
    window.setTimeout(() => setCopied(false), 1800);
  }

  function saveTxt() {
    downloadBlob(buildPlainText(cv), `${fileStem(cv)}_${cv.lang.toUpperCase()}.txt`, "text/plain;charset=utf-8");
  }

  function saveDoc() {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${displayName(cv, copy.appName)}</title></head><body>${buildExportHtml(cv)}</body></html>`;
    downloadBlob(html, `${fileStem(cv)}_${cv.lang.toUpperCase()}.doc`, "application/msword");
  }

  function exportJson() {
    downloadBlob(JSON.stringify(cv, null, 2), `${fileStem(cv)}.json`, "application/json");
  }

  function onImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (isCvDoc(parsed)) importDoc(parsed);
      } catch {
        /* ignore invalid files */
      }
    };
    reader.readAsText(file);
  }

  return (
    <main className="min-h-dvh">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-2xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent">{copy.appName}</p>
              <h1 className="text-lg font-semibold text-ink">{displayName(cv, copy.tagline)}</h1>
              <p className="text-xs text-muted">{copy.saved}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setUiLang(uiLang === "ar" ? "en" : "ar")}>
              <Languages />
              {copy.language}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-w-40 flex-1 items-center gap-2 text-xs text-muted sm:flex-none">
              <span className="sr-only">{copy.pickCv}</span>
              <select
                value={activeId}
                onChange={(event) => setActive(event.target.value)}
                className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                {docs.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {displayName(doc, copy.newCv)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" size="sm" onClick={() => createDoc("blank", uiLang)}>
              <Plus />
              {copy.newCv}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => createDoc("sample", uiLang)}>
              {copy.sampleCv}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={duplicateActive}>
              {copy.duplicateCv}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={deleteActive}>
              <Trash2 />
              {copy.deleteCv}
            </Button>
          </div>

          <div className="flex items-center gap-1 rounded-md bg-bg p-1 xl:hidden">
            <TabButton active={tab === "edit"} onClick={() => setTab("edit")}>
              {copy.editTab}
            </TabButton>
            <TabButton active={tab === "cv"} onClick={() => setTab("cv")}>
              {copy.cvTab}
            </TabButton>
            <TabButton active={tab === "ats"} onClick={() => setTab("ats")}>
              {copy.atsTab}
            </TabButton>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PdfExportButton cv={cv} uiLang={uiLang} />
            <Button type="button" variant="outline" size="sm" onClick={saveTxt}>
              <FileText />
              {copy.downloadTxt}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={saveDoc}>
              <Download />
              {copy.downloadDoc}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={copyPlain}>
              <Copy />
              {copied ? copy.copied : copy.copyText}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={exportJson}>
              {copy.exportJson}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <FileInput />
              {copy.importJson}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImportFile(file);
                event.target.value = "";
              }}
            />
          </div>
        </div>
      </header>

      <div className="print-root mx-auto grid max-w-screen-2xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)_minmax(20rem,24rem)]">
        <section
          className={cn(
            "no-print min-w-0 xl:block xl:max-h-[calc(100dvh-9rem)] xl:overflow-y-auto",
            tab === "edit" ? "block" : "hidden",
          )}
        >
          {hydrated ? <CvEditor cv={cv} uiLang={uiLang} /> : <p className="text-sm text-muted">{copy.saved}</p>}
        </section>
        <section className={cn("min-w-0 xl:block", tab === "cv" ? "block" : "hidden")}>
          <div dir={cv.lang === "ar" ? "rtl" : "ltr"}>
            <CvDocument cv={cv} />
          </div>
          <p className="no-print mt-3 text-center text-xs text-subtle">{copy.exportHint}</p>
        </section>
        <section className={cn("no-print min-w-0 xl:block", tab === "ats" ? "block" : "hidden")}>
          <AtsPanel cv={cv} uiLang={uiLang} />
        </section>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 flex-1 rounded-sm px-3 text-sm font-medium transition-[background-color,color] duration-150",
        active ? "bg-paper text-ink shadow-panel" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
