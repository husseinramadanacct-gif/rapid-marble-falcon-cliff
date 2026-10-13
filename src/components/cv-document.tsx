import type { ReactNode } from "react";
import {
  HEADINGS,
  contactLine,
  dateRange,
  filledEducation,
  filledExperience,
  filledLanguages,
  filledLines,
  type CvDoc,
} from "@/lib/cv-model";
import { cn } from "@/lib/utils";

export function CvDocument({ cv }: { cv: CvDoc }) {
  const lang = cv.lang;
  const headings = HEADINGS[lang];
  const roles = filledExperience(cv);
  const education = filledEducation(cv);
  const langs = filledLanguages(cv);
  const training = filledLines(cv.training);
  const interests = filledLines(cv.interests);
  const groups = cv.skillGroups.filter((group) => group.items.some((item) => item.trim()));
  const name = cv.profile.name.trim() || (lang === "ar" ? "اسمك هنا" : "Your name");
  const contact = contactLine(cv);

  return (
    <article id="cv-document" className="cv-page mx-auto w-full max-w-3xl text-ink">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{name}</h1>
        {cv.profile.headline ? (
          <p className="mt-1 text-sm font-medium text-accent sm:text-base">
            <BidiText text={cv.profile.headline} />
          </p>
        ) : null}
        {contact ? (
          <p className="mt-2 text-sm text-muted">
            <BidiText text={contact} />
          </p>
        ) : null}
      </header>

      {cv.summary.trim() ? (
        <CvSection lang={lang} title={headings.summary}>
          <p className="text-sm leading-relaxed text-ink">
            <BidiText text={cv.summary.trim()} />
          </p>
        </CvSection>
      ) : null}

      {roles.length ? (
        <CvSection lang={lang} title={headings.experience}>
          <div className="flex flex-col gap-5">
            {roles.map((role) => (
              <section key={role.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="min-w-0 text-base font-semibold text-ink">
                    <BidiText text={role.title} />
                    {role.company ? (
                      <span className="font-normal text-muted">
                        {" "}
                        — <BidiText text={role.company} />
                      </span>
                    ) : null}
                  </h3>
                  {dateRange(role) ? (
                    <p className="whitespace-nowrap text-sm font-medium text-muted" dir="ltr">
                      {dateRange(role)}
                    </p>
                  ) : null}
                </div>
                {role.bullets.length ? (
                  <ul className="mt-2 list-disc space-y-1 ps-5 text-sm leading-relaxed text-ink">
                    {role.bullets.map((bullet, index) => (
                      <li key={`${role.id}-${index}`}>
                        <BidiText text={bullet} />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </CvSection>
      ) : null}

      {education.length ? (
        <CvSection lang={lang} title={headings.education}>
          <div className="flex flex-col gap-2">
            {education.map((item) => (
              <p key={item.id} className="text-sm text-ink">
                <span className="font-semibold">{item.degree || item.school}</span>
                {item.school && item.degree ? <span className="text-muted"> — {item.school}</span> : null}
                {item.year ? <span className="font-medium text-muted"> · {item.year}</span> : null}
              </p>
            ))}
          </div>
        </CvSection>
      ) : null}

      {groups.length ? (
        <CvSection lang={lang} title={headings.skills}>
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <p key={group.id} className="text-sm leading-relaxed text-ink">
                {group.title ? (
                  <span className="font-semibold">
                    <BidiText text={group.title} />:{" "}
                  </span>
                ) : null}
                <BidiText text={group.items.filter((item) => item.trim()).join("  ·  ")} />
              </p>
            ))}
          </div>
        </CvSection>
      ) : null}

      {langs.length ? (
        <CvSection lang={lang} title={headings.languages}>
          <p className="text-sm text-ink">
            <BidiText
              text={langs.map((item) => (item.level ? `${item.name} (${item.level})` : item.name)).join("  ·  ")}
            />
          </p>
        </CvSection>
      ) : null}

      {training.length ? (
        <CvSection lang={lang} title={headings.training}>
          <p className="text-sm leading-relaxed text-ink">
            <BidiText text={training.join("  ·  ")} />
          </p>
        </CvSection>
      ) : null}

      {interests.length ? (
        <CvSection lang={lang} title={headings.interests}>
          <p className="text-sm leading-relaxed text-ink">
            <BidiText text={interests.join("  ·  ")} />
          </p>
        </CvSection>
      ) : null}
    </article>
  );
}

function CvSection({
  lang,
  title,
  children,
}: {
  lang: CvDoc["lang"];
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-5">
      <h2
        className={cn(
          "text-xs font-semibold text-accent",
          lang === "en" ? "uppercase tracking-widest" : "tracking-wide",
        )}
      >
        {title}
      </h2>
      <div className="cv-rule" />
      {children}
    </section>
  );
}

function BidiText({ text }: { text: string }) {
  const re =
    /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})|(\+?\d[\d\s./()-]{4,}\d)|([A-Za-z][A-Za-z0-9+#./&'’_-]*(?:\s+[A-Za-z0-9+#./&'’_-]+)*)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(
      <bdi key={index} dir="ltr">
        {match[0]}
      </bdi>,
    );
    last = index + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}
