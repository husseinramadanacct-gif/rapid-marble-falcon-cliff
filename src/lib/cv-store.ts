import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cloneCv, emptyCv, isCvDoc, type CvDoc, type Lang } from "./cv-model";
import { sampleAccountant } from "./cv-sample";

type CvState = {
  hydrated: boolean;
  uiLang: Lang;
  activeId: string;
  docs: CvDoc[];
  setHydrated: (value: boolean) => void;
  setUiLang: (lang: Lang) => void;
  setActive: (id: string) => void;
  createDoc: (kind: "blank" | "sample", lang: Lang) => void;
  duplicateActive: () => void;
  deleteActive: () => void;
  patchActive: (updater: (doc: CvDoc) => CvDoc) => void;
  importDoc: (doc: CvDoc) => void;
};

const memoryStorage: Storage = {
  length: 0,
  clear() {},
  getItem() {
    return null;
  },
  key() {
    return null;
  },
  removeItem() {},
  setItem() {},
};

function clientStorage(): Storage {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    /* private mode or server render */
  }
  return memoryStorage;
}

function seed(): Pick<CvState, "uiLang" | "activeId" | "docs"> {
  const doc = sampleAccountant("ar");
  return { uiLang: "ar", activeId: doc.id, docs: [doc] };
}

export const useCvStore = create<CvState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...seed(),
      setHydrated: (value) => set({ hydrated: value }),
      setUiLang: (uiLang) => set({ uiLang }),
      setActive: (activeId) => set({ activeId }),
      createDoc: (kind, lang) => {
        const doc = kind === "sample" ? sampleAccountant(lang) : emptyCv(lang);
        set({ docs: [doc, ...get().docs], activeId: doc.id });
      },
      duplicateActive: () => {
        const current = get().docs.find((item) => item.id === get().activeId);
        if (!current) return;
        const copy = cloneCv(current);
        if (copy.profile.name) copy.profile.name = `${copy.profile.name} (2)`;
        set({ docs: [copy, ...get().docs], activeId: copy.id });
      },
      deleteActive: () => {
        const { docs, activeId, uiLang } = get();
        const nextDocs = docs.filter((item) => item.id !== activeId);
        if (nextDocs.length === 0) {
          const fresh = emptyCv(uiLang);
          set({ docs: [fresh], activeId: fresh.id });
          return;
        }
        set({ docs: nextDocs, activeId: nextDocs[0].id });
      },
      patchActive: (updater) => {
        const { docs, activeId } = get();
        set({
          docs: docs.map((item) => (item.id === activeId ? { ...updater(item), updatedAt: Date.now() } : item)),
        });
      },
      importDoc: (doc) => {
        const next = isCvDoc(doc) ? { ...cloneCv(doc), updatedAt: Date.now() } : emptyCv(get().uiLang);
        set({ docs: [next, ...get().docs], activeId: next.id });
      },
    }),
    {
      name: "ats-cv-builder-v1",
      skipHydration: true,
      storage: createJSONStorage(() => clientStorage()),
      partialize: (state) => ({
        uiLang: state.uiLang,
        activeId: state.activeId,
        docs: state.docs,
      }),
    },
  ),
);

export function useActiveCv(): CvDoc {
  const docs = useCvStore((s) => s.docs);
  const activeId = useCvStore((s) => s.activeId);
  const uiLang = useCvStore((s) => s.uiLang);
  return docs.find((item) => item.id === activeId) ?? docs[0] ?? emptyCv(uiLang);
}
