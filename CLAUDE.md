# CLAUDE.md

Guidance for working in this repo. **SuiteReact** ships an interactive React SPA *inside* NetSuite, served by a SuiteScript 2.1 Suitelet and deployed with SDF.

## The one thing to internalize: two runtimes

This repo spans **two execution environments** that must not be confused:

| `app/` + root config | `src/` |
| --- | --- |
| Runs in **Node/Vite/the browser**. Modern React + TS, npm packages allowed. | Runs in the **NetSuite server** (SuiteScript 2.1). No npm packages — only `N/*` modules and `define([...])`. |
| Built into one self-contained `dist/index.html`. | Deployed verbatim via SDF (File Cabinet + Objects). |

The build bridge: `npm run bundle` produces `dist/index.html` and copies it to `src/FileCabinet/SuiteScripts/SuiteReact/ui.html`, which the Suitelet reads with `N/file` and writes to the response.

## Commands

```bash
npm install        # deps
npm run build      # tsc -b && vite build  → dist/index.html (single file, all assets inlined)
npm test           # vitest (21 tests; jsdom)
npm run lint       # eslint
npm run bundle     # build + inject into the SDF File Cabinet tree
npm run ship       # bundle + suitecloud project:deploy   (requires CLI auth)
```

Always run `npm run build` and `npm test` after changing `app/`. There is no automated test for the SuiteScript side (it needs a NetSuite account) — review it carefully by hand.

## Where things live

- **Suitelet** (the whole backend): `src/FileCabinet/SuiteScripts/SuiteReact/st_suitereact_ui.js`. Multiplexes GET-html vs `?action=`/POST-json. Actions: `list`, `get`, `update`.
- **API contract**: `ARCHITECTURE.md` §5. The client (`app/src/lib/suiteletClient.ts` + `app/src/types/api.ts`) and the Suitelet must agree exactly — change both together.
- **Allow-list**: `RECORD_TYPES` in the Suitelet is the server-side gate on which record types/columns are queryable. Never query a client-supplied `type` without it.

## NetSuite gotchas (verified — don't regress these)

- **SuiteQL silently ignores `OFFSET`.** Use the ROWNUM subquery technique for paging (already implemented in `actionList`). Naive `OFFSET … FETCH NEXT` returns the first page every time with no error.
- **`query.runSuiteQL(...).asMappedResults()` keys are lowercase**, regardless of the alias casing in the SQL. Access `row.total`, not `row.TOTAL`.
- **Suitelet POST body is a string** — `JSON.parse(context.request.body)`. (Unlike RESTlets, it is not pre-parsed.)
- **Parameterize SuiteQL** with the `params` array (`?` placeholders). Never string-concatenate user input. Clamp numeric inputs.
- **Governance**: a Suitelet has a 1000-unit budget per execution. Keep each action to ~1 query; page results; avoid `record.load` for lists.
- **Auth** is the session cookie (no TBA/OAuth). Keep the deployment `availablewithoutlogin=F` and the audience restricted.

## React/build conventions

- Vite `root` is `app/`; build `outDir` is `../dist`. `vite-plugin-singlefile` (v2 API: `viteSingleFile()` with no args) inlines everything — keep it that way so one File Cabinet file is the whole app.
- `noUnusedLocals`/`strict` are on; `tsc -b` will fail on unused imports.
- React Router `basename` comes from `getSuiteletBasename()` (`app/src/lib/suiteletUrl.ts`) so routing works under the Suitelet URL path.
- Render record data as text (JSX auto-escapes). Avoid `dangerouslySetInnerHTML`.

## Multi-agent provenance

This project was scaffolded by a crew: an architect (`ARCHITECTURE.md`), a SuiteScript dev (`src/`), a UI/UX dev (`app/`), and QA. When extending it, keep the architecture doc and this file in sync with reality.
