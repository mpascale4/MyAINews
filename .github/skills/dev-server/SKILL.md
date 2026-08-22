---
name: dev-server
description: "Skill per avviare il dev server locale di MyAINews (tsx server.ts, porta 3000). Usare quando l'utente chiede di avviare/testare l'app in locale, verificare a runtime una modifica, o fare una verifica visiva/manuale nel browser."
license: MIT
---

# Skill: Avviare il dev server (MyAINews)

Skill di riferimento per avviare il server di sviluppo locale di MyAINews.
Da invocare quando l'utente chiede di avviare/testare l'app in locale, vedere
le modifiche a runtime, o fare una verifica visiva/manuale nel browser.

## Quando usare questa skill

- L'utente chiede di "avviare il dev server", "far partire l'app", "testare in locale".
- Serve verificare a runtime una modifica appena fatta (UI, comportamento, API).

## Comando

```powershell
cd C:\works\MyAINews
npm run dev
```

- Lo script `dev` esegue `tsx server.ts` (Express + Vite dev middleware in un unico processo).
- Porta: **3000** (`const PORT = 3000` in `server.ts`).
- URL locale: http://localhost:3000

## Note

- È un processo long-running: avviarlo in modalità `async` (o `detach: true`
  se deve restare attivo oltre la sessione corrente).
- Se la porta 3000 risulta già occupata, verificare processi Node esistenti
  prima di avviarne uno nuovo, per evitare istanze duplicate.
- All'avvio il server esegue anche `seedInitialData()` e un fetch iniziale
  di tutti gli RSS feed configurati: attendere qualche secondo prima di
  considerare il server "pronto".

