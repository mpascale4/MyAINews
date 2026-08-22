---
name: react-best-practices
description: "Checklist di best practice React 19 + TypeScript + Vite + Tailwind per MyAINews. Usare prima di creare/rifattorizzare componenti o hook, prima di introdurre state management o side-effect, o come checklist finale prima di proporre una modifica come conclusa."
license: MIT
---

# Skill: React Best Practices (MyAINews)

Skill di riferimento per applicare best practice React/TypeScript/Vite quando si
scrive o si rifattorizza codice in questo repository. Da invocare esplicitamente
(tool `skill`) quando serve una checklist puntuale prima/dopo un intervento su
componenti, hook o logica applicativa.

Stack reale del progetto (verificato da `package.json`):
React 19, Vite 6, TypeScript 5.8 (`tsc --noEmit` come "lint"), Tailwind CSS 4,
`lucide-react`, `motion`, `express` per il server. Nessun test runner presente
al momento (Vitest/RTL da introdurre solo su richiesta esplicita dell'utente).

## Quando usare questa skill

- Prima di creare un nuovo componente/hook, per verificare pattern coerenti col resto del repo.
- Durante un refactor di componenti React esistenti (specialmente JSX complesso).
- Prima di introdurre state management, side-effect o logica async.
- Come checklist finale prima di proporre una modifica come conclusa.

## Checklist

### Componenti

- Solo componenti a funzione con hook; niente class component.
- Props tipizzate esplicitamente con `type`/`interface`, niente `any`.
- Un componente = una responsabilità; se il JSX cresce troppo, estrarre
  sotto-componenti invece di annidare condizioni profonde (coerente con la
  regola "Strutturare JSX complesso in blocchi piccoli" del progetto).
- Evitare prop drilling eccessivo: usare Context (o uno store dedicato) solo
  quando lo stato è realmente condiviso da più livelli, non di default.

### Hook e stato

- `useState`/`useReducer` per stato locale; `useEffect` solo per veri side-effect
  (subscription, timer, I/O), mai per derivare dati che possono essere calcolati
  in render o con `useMemo`.
- Cleanup esplicito in ogni `useEffect` che registra listener/timer/subscription.
- Estrarre logica riutilizzata (2+ usi) in custom hook dedicati (`useXxx`),
  seguendo il principio DRY già richiesto dalle istruzioni di progetto.
- Mantenere `useCallback`/stable refs per funzioni passate come dipendenze di
  effect critici (vedi learning di progetto su TTS/`speak`).

### Tipi ed errori

- TypeScript strict: niente `any` implicito, tipizzare risposte async e stati
  di errore/loading/empty in modo esplicito.
- Gestire sempre i tre stati di un fetch/async flow: loading, error, success —
  mai lasciare uno stato implicito non gestito.

### Accessibilità (vincolante per questo progetto)

- HTML semantico + ARIA valido; navigazione da tastiera e focus visibile su
  ogni elemento interattivo custom.
- Nessuna informazione veicolata solo dal colore; rispettare
  `prefers-reduced-motion` per animazioni (incluse quelle con `motion`).
- Badge di stato (check/lucchetto) e CTA disabilitate devono seguire
  esattamente i pattern già definiti in `.github/copilot-instructions.md`
  (dimensioni, colori, `aria-hidden`, `disabled`/`aria-disabled`).

### Layout

- Seguire la gerarchia Design System > CSS Grid > Flexbox > HTML semantico già
  definita nelle istruzioni di progetto; usare `grid-cols-[repeat(auto-fit,minmax(...))]`
  per griglie di card, non `grid-cols-1 sm:grid-cols-2 ...`.

### Testing (solo su richiesta esplicita)

- Se l'utente richiede test, usare **Vitest + React Testing Library** (coerenti
  con Vite) per coprire logica critica: generazione distractor, PIN auth,
  riduttori di stato complessi.
- Coprire happy path + edge case (input vuoto/invalido, errori), non solo il
  caso positivo.

## Buon esempio

```tsx
type UserCardProps = {
  name: string;
  avatarUrl: string;
};

export function UserCard({ name, avatarUrl }: UserCardProps) {
  return (
    <article className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">
      <img src={avatarUrl} alt="" aria-hidden="true" />
      <span>{name}</span>
    </article>
  );
}
```

## Da evitare

```tsx
export function UserCard(props: any) {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    fetch('/api/user').then((r) => r.json()).then(setUser);
  }); // niente array di dipendenze, niente gestione errori/loading
  return <div>{user.name}</div>; // niente stato loading/error gestito
}
```
