---
applyTo: "**/*.tsx,**/*.ts"
description: "Convenzioni React/TypeScript per MyAINews (React 19 + Vite + Tailwind)"
---

# Istruzioni React/TypeScript – MyAINews

Queste regole si applicano automaticamente ai file `.ts`/`.tsx` di questo repo e
integrano (non sostituiscono) `.github/copilot-instructions.md`.

- Solo componenti a funzione con hook, mai class component.
- Props e stato sempre tipizzati esplicitamente; vietato `any`.
- `useEffect` solo per veri side-effect, con cleanup e dipendenze corrette;
  logica derivabile va calcolata in render o `useMemo`, non in un effect.
- Estrarre in custom hook la logica riutilizzata 2+ volte (DRY).
- Gestire esplicitamente stati loading/error/empty per ogni flusso asincrono.
- Layout: CSS Grid con `grid-cols-[repeat(auto-fit,minmax(...))]` per griglie di
  card, mai `grid-cols-1` fisso su mobile (vedi regola griglia adattiva di progetto).
- Accessibilità sempre vincolante: HTML semantico, ARIA valido, focus visibile,
  `prefers-reduced-motion`, contrasto AA — nessuna eccezione per velocità di sviluppo.
- Badge di stato e CTA: riusare i pattern già definiti in
  `.github/copilot-instructions.md` (dimensioni, colori, `aria-hidden`,
  `disabled`/`aria-disabled`), non introdurne di nuovi.
- Test: nessun test runner presente di default; introdurre Vitest + React
  Testing Library solo se l'utente lo richiede esplicitamente.

Per una checklist più estesa con esempi, vedere la skill dedicata:
`.github/skills/react-best-practices/SKILL.md`.
