import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/copy";
import {
  emptyEducation,
  emptyLanguage,
  emptyRole,
  emptySkillGroup,
  type CvDoc,
  type Lang,
} from "@/lib/cv-model";
import { CvTailorPanel } from "@/components/cv-tailor-panel";
import { useCvStore } from "@/lib/cv-store";
import { cn } from "@/lib/utils";

export function CvEditor({ cv, uiLang }: { cv: CvDoc; uiLang: Lang }) {
  const copy = t(uiLang);
  const patchActive = useCvStore((s) => s.patchActive);

  function patch(updater: (doc: CvDoc) => CvDoc) {
    patchActive(updater);
  }

  return (
    <div className="flex flex-col gap-6">
      <CvTailorPanel cv={cv} uiLang={uiLang} />
      <section className="rounded-lg bg-bg-elevated p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">{copy.sectionProfile}</h2>
          <div className="flex items-center gap-1 rounded-md bg-bg p-1">
            <button
              type="button"
              className={cn(
                "h-9 rounded-sm px-3 text-xs font-medium",
                cv.lang === "ar" ? "bg-paper text-ink shadow-panel" : "text-muted",
              )}
              onClick={() => patch((doc) => ({ ...doc, lang: "ar" }))}
            >
              {copy.cvLangAr}
            </button>
            <button
              type="button"
              className={cn(
                "h-9 rounded-sm px-3 text-xs font-medium",
                cv.lang === "en" ? "bg-paper text-ink shadow-panel" : "text-muted",
              )}
              onClick={() => patch((doc) => ({ ...doc, lang: "en" }))}
            >
              {copy.cvLangEn}
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={copy.name} value={cv.profile.name} onChange={(name) => patch((d) => ({ ...d, profile: { ...d.profile, name } }))} />
          <Field label={copy.headline} value={cv.profile.headline} onChange={(headline) => patch((d) => ({ ...d, profile: { ...d.profile, headline } }))} />
          <Field label={copy.email} value={cv.profile.email} onChange={(email) => patch((d) => ({ ...d, profile: { ...d.profile, email } }))} />
          <Field label={copy.phone} value={cv.profile.phone} onChange={(phone) => patch((d) => ({ ...d, profile: { ...d.profile, phone } }))} />
          <Field label={copy.location} value={cv.profile.location} onChange={(location) => patch((d) => ({ ...d, profile: { ...d.profile, location } }))} />
        </div>
      </section>

      <section className="rounded-lg bg-bg-elevated p-5 shadow-panel">
        <h2 className="text-sm font-semibold text-ink">{copy.sectionSummary}</h2>
        <textarea
          value={cv.summary}
          rows={5}
          onChange={(event) => patch((d) => ({ ...d, summary: event.target.value }))}
          className={fieldClass()}
        />
      </section>

      <section className="rounded-lg bg-bg-elevated p-5 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">{copy.sectionExperience}</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => patch((d) => ({ ...d, experience: [...d.experience, emptyRole()] }))}>
            <Plus />
            {copy.addJob}
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-5">
          {cv.experience.map((role, index) => (
            <div key={role.id} className="rounded-md border border-line bg-paper p-4">
              <div className="mb-3 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    patch((d) => ({
                      ...d,
                      experience: d.experience.length > 1 ? d.experience.filter((item) => item.id !== role.id) : [emptyRole()],
                    }))
                  }
                >
                  <Trash2 />
                  {copy.removeJob}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={copy.jobTitle}
                  value={role.title}
                  onChange={(title) =>
                    patch((d) => ({
                      ...d,
                      experience: d.experience.map((item) => (item.id === role.id ? { ...item, title } : item)),
                    }))
                  }
                />
                <Field
                  label={copy.company}
                  value={role.company}
                  onChange={(company) =>
                    patch((d) => ({
                      ...d,
                      experience: d.experience.map((item) => (item.id === role.id ? { ...item, company } : item)),
                    }))
                  }
                />
                <Field
                  label={copy.start}
                  value={role.start}
                  onChange={(start) =>
                    patch((d) => ({
                      ...d,
                      experience: d.experience.map((item) => (item.id === role.id ? { ...item, start } : item)),
                    }))
                  }
                />
                <Field
                  label={copy.end}
                  value={role.end}
                  onChange={(end) =>
                    patch((d) => ({
                      ...d,
                      experience: d.experience.map((item) => (item.id === role.id ? { ...item, end, current: false } : item)),
                    }))
                  }
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  checked={!!role.current}
                  onChange={(event) =>
                    patch((d) => ({
                      ...d,
                      experience: d.experience.map((item) =>
                        item.id === role.id
                          ? {
                              ...item,
                              current: event.target.checked,
                              end: event.target.checked ? (d.lang === "ar" ? "حتى الآن" : "Present") : item.end,
                            }
                          : item,
                      ),
                    }))
                  }
                />
                {copy.currentJob}
              </label>
              <label className="mt-3 block text-xs font-medium text-muted">
                {copy.bullets}
                <textarea
                  value={role.bullets.join("\n")}
                  rows={Math.max(4, role.bullets.length + 1)}
                  onChange={(event) =>
                    patch((d) => ({
                      ...d,
                      experience: d.experience.map((item) =>
                        item.id === role.id ? { ...item, bullets: event.target.value.split("\n") } : item,
                      ),
                    }))
                  }
                  className={cn(fieldClass(), "mt-1")}
                />
              </label>
              {index < cv.experience.length - 1 ? <div className="sr-only">{index}</div> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-bg-elevated p-5 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">{copy.sectionEducation}</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => patch((d) => ({ ...d, education: [...d.education, emptyEducation()] }))}>
            <Plus />
            {copy.addEducation}
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {cv.education.map((item) => (
            <div key={item.id} className="grid gap-3 sm:grid-cols-3">
              <Field
                label={copy.degree}
                value={item.degree}
                onChange={(degree) =>
                  patch((d) => ({
                    ...d,
                    education: d.education.map((row) => (row.id === item.id ? { ...row, degree } : row)),
                  }))
                }
              />
              <Field
                label={copy.school}
                value={item.school}
                onChange={(school) =>
                  patch((d) => ({
                    ...d,
                    education: d.education.map((row) => (row.id === item.id ? { ...row, school } : row)),
                  }))
                }
              />
              <div className="flex items-end gap-2">
                <Field
                  className="flex-1"
                  label={copy.year}
                  value={item.year}
                  onChange={(year) =>
                    patch((d) => ({
                      ...d,
                      education: d.education.map((row) => (row.id === item.id ? { ...row, year } : row)),
                    }))
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={copy.deleteCv}
                  onClick={() =>
                    patch((d) => ({
                      ...d,
                      education: d.education.length > 1 ? d.education.filter((row) => row.id !== item.id) : [emptyEducation()],
                    }))
                  }
                >
                  <Minus />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-bg-elevated p-5 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">{copy.sectionSkills}</h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patch((d) => ({ ...d, skillGroups: [...d.skillGroups, emptySkillGroup(d.lang)] }))}
          >
            <Plus />
            {copy.addSkillGroup}
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {cv.skillGroups.map((group) => (
            <div key={group.id} className="rounded-md border border-line bg-paper p-4">
              <div className="flex items-end gap-2">
                <Field
                  className="flex-1"
                  label={copy.groupTitle}
                  value={group.title}
                  onChange={(title) =>
                    patch((d) => ({
                      ...d,
                      skillGroups: d.skillGroups.map((row) => (row.id === group.id ? { ...row, title } : row)),
                    }))
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    patch((d) => ({
                      ...d,
                      skillGroups:
                        d.skillGroups.length > 1
                          ? d.skillGroups.filter((row) => row.id !== group.id)
                          : [emptySkillGroup(d.lang)],
                    }))
                  }
                >
                  <Minus />
                </Button>
              </div>
              <label className="mt-3 block text-xs font-medium text-muted">
                {copy.skillItems}
                <textarea
                  value={group.items.join("\n")}
                  rows={Math.max(3, group.items.length)}
                  onChange={(event) =>
                    patch((d) => ({
                      ...d,
                      skillGroups: d.skillGroups.map((row) =>
                        row.id === group.id ? { ...row, items: event.target.value.split("\n") } : row,
                      ),
                    }))
                  }
                  className={cn(fieldClass(), "mt-1")}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-bg-elevated p-5 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink">{copy.sectionLanguages}</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => patch((d) => ({ ...d, languages: [...d.languages, emptyLanguage()] }))}>
            <Plus />
            {copy.addLanguage}
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3">
          {cv.languages.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Field
                label={copy.langName}
                value={item.name}
                onChange={(name) =>
                  patch((d) => ({
                    ...d,
                    languages: d.languages.map((row) => (row.id === item.id ? { ...row, name } : row)),
                  }))
                }
              />
              <Field
                label={copy.langLevel}
                value={item.level}
                onChange={(level) =>
                  patch((d) => ({
                    ...d,
                    languages: d.languages.map((row) => (row.id === item.id ? { ...row, level } : row)),
                  }))
                }
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => patch((d) => ({ ...d, languages: d.languages.filter((row) => row.id !== item.id) }))}
              >
                <Minus />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-bg-elevated p-5 shadow-panel">
        <h2 className="text-sm font-semibold text-ink">{copy.sectionTraining}</h2>
        <textarea
          value={cv.training.join("\n")}
          rows={3}
          onChange={(event) => patch((d) => ({ ...d, training: event.target.value.split("\n") }))}
          className={cn(fieldClass(), "mt-3")}
        />
      </section>

      <section className="rounded-lg bg-bg-elevated p-5 shadow-panel">
        <h2 className="text-sm font-semibold text-ink">{copy.sectionInterests}</h2>
        <textarea
          value={cv.interests.join("\n")}
          rows={3}
          onChange={(event) => patch((d) => ({ ...d, interests: event.target.value.split("\n") }))}
          className={cn(fieldClass(), "mt-3")}
        />
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("block text-xs font-medium text-muted", className)}>
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className={cn(fieldClass(), "mt-1")} />
    </label>
  );
}

function fieldClass() {
  return "w-full min-h-11 rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none transition-[box-shadow] duration-150 placeholder:text-subtle focus-visible:ring-2 focus-visible:ring-accent/40";
}
