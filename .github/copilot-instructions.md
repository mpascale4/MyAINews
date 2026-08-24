# GitHub Copilot – Istruzioni per il progetto

- When the user's message starts with the prefix `:interview` (alias `:i`), force plan mode: do not take any action (no code/file/command changes) on the text after the prefix until requirements are gathered. Instead, interview the user one question at a time (via `ask_user`, preferring multiple choice) to clarify goal, scope, affected files/tests, edge cases, and acceptance criteria. Only after the user confirms the gathered requirements, propose a plan and ask for explicit confirmation before executing.
- When the user's message starts with the prefix `:f` or `:feature`, run this flow on the text after the prefix: (1) analyze it and propose a clear problem description, ask the user (`ask_user`) to confirm it; (2) once confirmed, propose a solution — using one-question-at-a-time interview clarifications if needed — and ask the user to confirm it; (3) once confirmed, `git checkout develop`, `git pull origin develop`, create a branch named `feature/<short-slug-of-the-request>` off that updated `develop`, switch to it, and start implementing the confirmed solution on that branch.
- When the user's message starts with the prefix `:push`: if currently on a feature branch, ask the user (`ask_user`) whether to finish the feature now. If confirmed: merge the current branch into `develop` with `--no-ff`, push `origin develop`, then delete the feature branch locally, and ask the user whether to also delete it on the remote if it exists there. If currently on `develop` (no active feature branch), just run `git push origin develop` directly, without asking anything.
- When the user's message starts with the prefix `:c` or `:close`: first commit all pending in-scope work (for any changed files that appear unrelated/out-of-scope for the feature described by the originating `:f`/`:feature` request, summarize them and ask the user for confirmation before including them in the commit). Then run the exact same finishing flow as `:push` (merge current branch into `develop` with `--no-ff`, push `origin develop`, delete the feature branch locally, ask whether to also delete the remote branch).
- When the user's message starts with the prefix `:h`, `:?`, or `:help`, print the same shortcut recap table described in the "Copilot Session-Start Shortcut Recap" section below, then wait for the next request.
- When the user's message starts with the prefix `:rundev`: (1) check whether the dev server port (4000) is already in use; if so, ask the user (`ask_user`) whether to stop the existing process and restart it, or leave it running and abort; (2) otherwise, launch `npm run dev` as a detached background process, redirecting output to `logs/dev-server.log`; (3) report the exact log path, a one-line command to follow it (e.g. `Get-Content -Wait logs/dev-server.log`), and the shellId for stop/read control.

## 🤖 Copilot Session-Start Shortcut Recap

At the start of every new interactive session in this repository, Copilot must proactively print a short recap table of the project's configured shortkeys/prefixes (list all shortcuts actually defined in this repo's instructions/skills, including `:h`/`:?`/`:help` for listing shortcuts). Keep the recap brief (one line per shortcut). Do not repeat this recap again later in the same session.

This is automated via a `sessionStart` prompt hook (`.github/hooks/session-start.json`), which auto-submits a request for this recap as the first turn of every new interactive session — the user does not need to type anything (e.g. `:h`) to trigger it. Note: hooks fire only for new interactive sessions, not on `/resume` or non-interactive (`-p`) runs; if a session starts without the hook firing for any reason, Copilot must still print the recap unconditionally before addressing the user's actual first request, regardless of that request's content.

Current shortcuts defined in this repo (keep this list in sync whenever a shortcut is added/renamed/removed):

| Shortcut | Cosa fa |
|---|---|
| `:interview` (alias `:i`) | Forza modalità piano: raccoglie i requisiti a domande (una alla volta) prima di agire; richiede autopilot off. |
| `:f` / `:feature` | Analizza la richiesta → conferma problema → propone soluzione (con eventuale interview) → conferma → crea branch `feature/<slug>` da `develop` aggiornato e inizia l'implementazione. |
| `:push` | Se su feature branch: chiede conferma, poi merge `--no-ff` su `develop`, push, elimina branch locale (chiede per il remoto). Se già su `develop`: push diretto senza chiedere. |
| `:c` / `:close` | Committa il lavoro in-scope (chiede conferma su modifiche fuori-scope), poi esegue lo stesso flusso di `:push`. |
| `:pull` | `git pull` su `develop`, `main` e sul branch corrente (se presente). |
| `:rundev` | Verifica se la porta 4000 è occupata (chiede se riavviare); altrimenti lancia `npm run dev` in background/detached con log su `logs/dev-server.log`. |
| `:h` / `:?` / `:help` | Stampa questa tabella riassuntiva degli shortcut. |

## Accessibility Quick Rules

Quando generi o modifichi codice:

- Rispetta sempre **WCAG 2.2 AA** e **WAI-ARIA APG**.
- Garantire navigazione da tastiera, screen reader, contrasto alto e supporto al reduced motion.
- Non usare il colore come unico veicolo informativo.
- Evitare animazioni lampeggianti, strobo o distrazioni.
- Usare HTML semantico, ARIA valido e focus visibile.
- Mantenere leggibilità anche in grayscale e nei temi chiaro/scuro.
- Verificare il risultato con **Lighthouse a11y >= 95** e senza critical axe-core issues.

---

## Comandi personalizzati

Quando l'utente scrive `:pull`, esegui immediatamente i seguenti comandi nell'ordine indicato, senza chiedere conferma:

```powershell
git pull origin develop
git pull origin main
```

Se sono presenti branch locali attivi (feature branch), esegui anche:

```powershell
git pull origin <branch-corrente>
```

> ℹ️ Usa `git branch --show-current` per determinare il branch corrente prima di eseguire il pull.

---

## Flusso iniziale dell'app

- La prima vista dell'app deve essere sempre la **selezione del profilo**.
- Non introdurre schermate di benvenuto, intro o bypass iniziali prima del profile picker.
- Se il flusso di apertura cambia, il picker profilo resta comunque la prima schermata visibile.

---

## Accessibility Standards

Le quick rules sopra sono vincolanti. In caso di dubbio, applica sempre:

- WCAG 2.2 AA e WAI-ARIA APG
- contrasto corretto in tutti i temi e in grayscale
- navigazione da tastiera, screen reader e focus visibile
- supporto a prefers-reduced-motion senza flash, strobo o animazioni distraenti
- HTML semantico, ARIA valido, niente colore come unico canale informativo
- Lighthouse accessibility >= 95 e nessun critical axe-core issue


---

## Regole di qualità del codice

Quando generi o modifichi codice, applica sempre queste regole.
Le regole valgono per tutto il codice del progetto (esistente e nuovo): ogni refactor deve preservare comportamento, funzionalita e requisiti di accessibilita.

### 1) Minimizzare il codice (senza perdere chiarezza)

- Preferisci soluzioni semplici e leggibili rispetto a implementazioni complesse.
- Riduci duplicazioni, rami condizionali inutili e codice morto.
- Evita astrazioni premature: introducile solo quando servono davvero.
- Mantieni funzioni e componenti piccoli, con una singola responsabilità.

### 2) Fattorizzare in modo corretto

- Applica il principio **DRY**: estrai logica condivisa in utility, hook o moduli riusabili.
- Centralizza costanti, tipi e configurazioni per evitare incoerenze.
- Se una logica e ripetuta 2+ volte, valuta l'estrazione in una funzione dedicata.
- Mantieni interfacce semplici e nomi espliciti per favorire manutenzione e riuso.

### 3) Ingegnerizzare con approccio solido

- Progetta per estendibilita e testabilita (moduli coesi, dipendenze ridotte).
- Definisci contratti chiari tra componenti (tipi, input/output, gestione errori).
- Gestisci errori e stati limite in modo esplicito, evitando comportamenti impliciti.
- Ottimizza solo dove necessario, dopo aver verificato il collo di bottiglia.

### 4) Applicare best practice

- Segui i principi **SOLID**, **KISS**, **YAGNI** e le convenzioni del progetto.
- Usa nomi chiari e consistenti; evita abbreviazioni ambigue.
- Scrivi o aggiorna test per logica critica e regressioni.
- Mantieni lint, typecheck e test verdi prima di finalizzare le modifiche.
- Esegui il commit solo quando `npm run lint` termina senza errori.
- Documenta decisioni non ovvie con commenti brevi e mirati.

### 5) Strutturare JSX complesso in blocchi piccoli

- Quando un componente JSX cresce molto, spezzare i rami condizionali grandi in blocchi più piccoli e leggibili.
- Evitare annidamenti profondi di `<>`, `()`, `{}` e `&&` nello stesso tratto di render quando una sottosezione può essere isolata.
- Preferire wrapper espliciti e componenti/estratti dedicati se aiutano a ridurre errori di chiusura e regressioni di parsing.
- Dopo refactor di JSX complesso, verificare sempre con `lint`/`typecheck` prima di considerare la modifica conclusa.


---

## Layout Consistency Rules (Mandatory)

Queste regole sono vincolanti e devono essere applicate in tutto il progetto per garantire consistenza visiva, accessibilità e manutenibilità.

### Principi generali

- Utilizzare sempre gli stessi pattern di layout per la stessa tipologia di contenuto.
- Non introdurre layout alternativi se esiste già un pattern equivalente nel progetto.
- Prima di creare una nuova struttura, cercare e riutilizzare la soluzione già presente nel codebase.
- Privilegiare la coerenza rispetto alle preferenze personali o alle alternative tecnicamente equivalenti.

---

### Gerarchia dei sistemi di layout

Ordine di preferenza:

1. Componenti condivisi del Design System
2. CSS Grid
3. Flexbox
4. HTML semantico nativo

Se più soluzioni sono possibili, utilizzare sempre quella con priorità più alta.

---

### Utilizzo di CSS Grid

CSS Grid è il sistema di layout predefinito dell'applicazione.

Utilizzare Grid per:

- dashboard
- card
- widget
- gallerie
- raccolte di elementi
- risultati di ricerca
- cataloghi
- elenchi visuali
- pannelli responsive

Pattern standard:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
</div>
```

---

## Regola griglia adattiva (Mandatory)

Quando le card si impilano verticalmente invece di distribuirsi su più colonne:

1. **Individua il padre**: cerca `grid-cols-1` o `flex-col` che forza il layout in colonna singola.
2. **Non usare `w-full` o `flex: 1` sulle card**: lasciar dimensionare il browser in base al contenuto.
3. **Usa sempre `auto-fit/minmax`** per griglie di card/elementi visuali:

```tsx
// ✅ Corretto — si adatta allo spazio disponibile
<div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-4">

// ❌ Sbagliato — forza una colonna su mobile
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
```

4. **Non aggiungere `width: 100%` o `flex: 1` sulle card** al di fuori di un contesto dove il genitore ha altezza/larghezza definita.
5. Se la griglia non si espande, verifica che il padre non abbia `flex-col`, `w-fit`, `max-w` troppo restrittivo o `overflow: hidden` che limitino il contenuto.

### Liste in layout card/grid (Mandatory)

- Non usare `<ul>`/`<li>` per layout visuali a card o sezioni tecniche informative.
- Usa sempre `<div role="list">` come contenitore e `<div role="listitem">` per gli elementi.
- Anche quando la lista è verticale, mantieni pattern grid: `grid grid-cols-1`.
- Per liste card responsive usa `grid-cols-[repeat(auto-fit,minmax(...))]`.
- Mantieni semantica accessibile tramite ruoli ARIA (`role="list"`, `role="listitem"`).

---

## Badge di stato (Mandatory)

I badge di stato devono essere **visualmente uniformi** in tutto il progetto.

### Badge check (completato/selezionato)

Usa sempre questo pattern:

```tsx
<span
  className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-emerald-500 text-white text-[10px] font-black shadow-md"
  aria-hidden="true"
>
  ✓
</span>
```

### Badge lucchetto (bloccato)

Usa sempre questo pattern:

```tsx
<span
  className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] shadow-md"
  aria-hidden="true"
>
  🔒
</span>
```

### Regole

- Dimensione fissa: `h-5 w-5`
- Posizione fissa: `absolute -top-1 -right-1`
- Forma: `rounded-full`
- Check: sfondo verde (`bg-emerald-500`), testo bianco, bordo bianco
- Lucchetto: sfondo bianco, bordo slate, emoji `🔒`
- Sempre `aria-hidden="true"` (informazione trasmessa anche da colore/testo)
- Non usare `✅` nei badge di stato su card (solo nei testi descrittivi)

---

## Regola CTA cliccabili (Mandatory)

- Se una CTA non è realmente disponibile, deve essere `disabled` (o equivalente semantico) e non deve risultare cliccabile.
- Il testo del badge/CTA deve riflettere lo stato reale (`Vai alla Sfida` solo se azione disponibile; altrimenti stato bloccato esplicito).
- Mantieni coerenza tra comportamento, stile e accessibilità (`disabled`/`aria-disabled`, cursore, contrasto testo).

---

## Session Learnings

- Per download automatici di asset audio da Wikimedia Commons, preferire endpoint `Special:FilePath/<nome-file>` con `User-Agent` esplicito e piccole pause tra richieste per ridurre errori `429 Too many requests`.
- Per notifiche vocali critiche (es. sblocco indizi/regno), mantenere `speak` stabile (`useCallback` nel context), emettere l'annuncio da `useEffect` legato allo stato del modal (con breve delay), e aggiungere fallback accessibile con `aria-live` per garantire feedback anche quando TTS non disponibile o disattivata.
- Nei mini-game con helper contestuali (es. mosca in Salto), preferire comparsa solo dopo inattivita (es. 6s), rendering icon-only ma focusabile da tastiera, movimento continuo leggibile (attraversamento lato-lato con zig-zag leggero) e disattivare audio helper se confligge con feedback numerico/TTS primario.
- Nei casi `×1`, mantenere i badge guida persistenti (senza auto-consumo timeout) nei mini-game dove richiesto e rendere disponibili helper/pericoli necessari alla guida visuale gia da `×1` (es. calabrone in Raccogli, ostacolo in Salto, trappola in Costruisco), rispettando le eccezioni definite per step (es. in Trucchi `×1` solo `touch` sul target corretto).
- Per push GitHub da ambiente locale, preferire token letto da `.env.local` (`GITHUB_TOKEN`/`GITHUB_PAT`) e autenticazione temporanea via `git -c http.https://github.com/.extraheader=AUTHORIZATION: basic ... push ...`, evitando di stampare o hardcodare la chiave.
- Se `git push` fallisce con 403 "Permission denied" o "Invalid username or token" verso `mpascale4/Tabellandia`, la causa più probabile è che l'account `gh` attivo non è quello giusto (es. `massimopascale4` invece di `mpascale4`). Verificare con `gh auth status`, poi eseguire `gh auth switch --user mpascale4` seguito da `gh auth setup-git` (per aggiornare il credential helper git) prima di ritentare il push — non serve il token di `.env.local` in questo caso.
- Questo repository può essere condiviso in parallelo con un'altra sessione/utente attiva contemporaneamente: un altro processo può cambiare l'HEAD (checkout di un altro branch) mentre si sta lavorando, causando commit accidentali sul branch sbagliato. Prima di ogni `git add`/`git commit`, verificare `git branch --show-current` e `git log -1 --oneline` per assicurarsi di essere sul branch atteso. Se un commit finisce comunque su un branch non corretto, usare `git cherry-pick <hash>` sul branch giusto e poi `git reset --hard <hash-precedente>` su quello sbagliato per ripristinarlo senza toccare i commit altrui.
