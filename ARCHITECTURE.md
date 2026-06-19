# SuiteReact — Architecture

> Package: `netsuite-suitereact`
> An open-source starter that lets you build an interactive **React** UI that runs **inside NetSuite**, served by a **SuiteScript 2.1 Suitelet**, and deployed with **SDF (SuiteCloud Development Framework)**.

---

## 1. System Overview

SuiteReact ships a single-page React application *into* NetSuite. There is no separate web host, no CORS, and no token exchange. The flow is:

1. **Build.** Vite compiles the React/TypeScript app and `vite-plugin-singlefile` inlines every JS and CSS asset into **one self-contained `index.html`**. No external `<script src>` / `<link href>` references survive — everything is inline. This is required because the File Cabinet serves files individually and we want exactly one artifact to ship and reference.
2. **Stage.** `scripts/inject-bundle.mjs` copies that single HTML file from `dist/` into the SDF source tree at `src/FileCabinet/SuiteScripts/SuiteReact/ui.html`.
3. **Deploy.** SDF (`suitecloud project:deploy`) uploads the File Cabinet contents, the Suitelet script file, and the script + deployment object records to the target NetSuite account.
4. **Serve.** A browser hits the Suitelet's external/internal URL. On a plain `GET` the Suitelet reads `ui.html` from the File Cabinet via `N/file` and writes its contents to `context.response`, returning the full SPA. **React Router** then owns client-side navigation within that single page.
5. **Data.** The **same** Suitelet multiplexes a JSON data API. When the React app calls the Suitelet URL with `?action=...` (or `POST`s JSON), the Suitelet branches and returns `application/json` instead of HTML. The browser's existing NetSuite **session cookie** authenticates these calls automatically — no TBA/OAuth, no token storage in the browser.

### Why a multiplexed Suitelet (and not a RESTlet)?

| Concern | Multiplexed Suitelet (chosen) | RESTlet (rejected as default) |
|---|---|---|
| Auth from in-NetSuite browser | **Session cookie** — automatic, the user is already logged in | Requires **Token-Based Auth (TBA/OAuth 1.0a)**; you'd have to mint and store tokens client-side, which is insecure in a browser |
| Serves HTML page | Yes (`context.response.write`) | No — RESTlets cannot return a full HTML document for a top-level navigation |
| One artifact for UI + data | Yes (same script, same URL, branch on `action`) | No — needs a separate UI host |
| Tradeoff | Slightly heavier scripting to branch GET-HTML vs. action-JSON; must hand-set `Content-Type` for JSON | Cleaner REST verbs, but the auth model is wrong for an embedded SPA |

**Decision:** default to the multiplexed Suitelet. A RESTlet remains a documented escape hatch for server-to-server integrations that already hold tokens, but it is *not* how the embedded UI talks to its backend.

### Governance

A Suitelet has a **1000 unit** governance budget per execution. The data API must stay lean: prefer `N/query` (SuiteQL) or a single `N/search` over many `record.load` calls, page results, and never load full records just to display a column. Each API `action` is budgeted in §5.

---

## 2. Data-Flow Diagram (ASCII)

```
                                  NetSuite Account (authenticated browser session)
   ┌───────────────────────┐
   │   Browser (NetSuite)  │
   │                       │
   │  React SPA            │
   │  - React Router       │      (1) GET  /app/site/hosting/scriptlet.nl?script=...&deploy=...
   │  - Records Dashboard  │ ───────────────────────────────────────────────────────────┐
   │  - fetch() data calls │                                                             │
   └───────────┬───────────┘                                                             v
               │                                              ┌────────────────────────────────────────┐
               │  (4) GET ?action=list   (JSON)               │   SuiteScript 2.1 Suitelet               │
               │  (5) POST {action,...}  (JSON)               │   customscript_st_suitereact_ui          │
               ├──────────────────────────────────────────────►   onRequest(context)                    │
               │                                              │                                          │
               │                                              │   if GET and no `action`:                │
               │  (2) HTML document (full SPA)                │     ├─(2a) N/file.load(ui.html) ─────────┼──► File Cabinet
               │◄─────────────────────────────────────────────┤     │      SuiteScripts/SuiteReact/      │     ui.html
               │                                              │     └─(2b) response.write(file contents) │     (single-file bundle)
               │                                              │                                          │
               │                                              │   else (action present / POST):          │
               │                                              │     ├─ N/query (SuiteQL)  ───────────────┼──► Records
               │  (6) JSON {data:[...]}                       │     │   or N/search / N/record          │     (Customer, SO, custom…)
               │◄─────────────────────────────────────────────┤     └─ response.setHeader(JSON) + write │
               │                                              └────────────────────────────────────────┘
               v
        Render / filter
        interactively
```

Legend: (1)/(2) = initial page load handshake. (4)/(5)/(6) = in-app data API over the same URL, same session cookie.

---

## 3. Repository File / Folder Manifest

Repo root is the current working directory. Branch is already set up. `src/` is the **SDF project root** (SDF convention), `app/` is the **React source**.

```
.
├── ARCHITECTURE.md                      # This document.
├── README.md                            # Project intro, quickstart, prerequisites (Node, SuiteCloud CLI).
├── LICENSE                              # Open-source license (e.g. MIT).
├── .gitignore                           # Ignores node_modules/, dist/, built ui.html in src, .env, SDF auth cache.
├── package.json                         # npm scripts (dev/build/inject/deploy/test/lint), deps, package name "netsuite-suitereact".
├── package-lock.json                    # Locked dependency tree.
├── tsconfig.json                        # Base TS config (references app + node configs).
├── tsconfig.app.json                    # TS config for the React app (DOM libs, jsx).
├── tsconfig.node.json                   # TS config for Vite config + scripts (node libs).
├── vite.config.ts                       # Vite build: React plugin + vite-plugin-singlefile; outDir dist/; single-file inline.
├── tailwind.config.js                   # Tailwind content globs (app/**) + theme.
├── postcss.config.js                    # PostCSS pipeline (tailwindcss + autoprefixer).
├── eslint.config.js                     # ESLint flat config (TS + React hooks rules).
├── vitest.config.ts                     # Vitest config (jsdom env, setup file, RTL).
├── suitecloud.config.js                 # SDF CLI config: points defaultProjectFolder at src/.
├── .env.example                         # Documents required env (SDF account/auth id) — never commit real .env.
│
├── scripts/
│   └── inject-bundle.mjs                # Copies dist/index.html -> src/FileCabinet/SuiteScripts/SuiteReact/ui.html.
│
├── app/                                 # ── React source (built by Vite) ─────────────────────────────
│   ├── index.html                       # Vite entry HTML (dev). Mounts #root, loads src/main.tsx.
│   ├── public/
│   │   └── favicon.svg                  # Static asset (inlined by singlefile at build).
│   └── src/
│       ├── main.tsx                     # React root: createRoot + <BrowserRouter> (basename from Suitelet URL).
│       ├── App.tsx                      # Top-level routes (<Routes>) + layout shell.
│       ├── index.css                    # Tailwind directives (@tailwind base/components/utilities).
│       ├── vite-env.d.ts                # Vite client type references.
│       ├── lib/
│       │   ├── suiteletClient.ts        # fetch() wrapper: builds Suitelet URL, adds ?action=, parses JSON, error handling.
│       │   └── suiteletUrl.ts           # Resolves the Suitelet base URL/basename at runtime (from window.location).
│       ├── types/
│       │   └── api.ts                    # Shared TS types for the JSON API contract (request/response shapes).
│       ├── components/
│       │   ├── RecordsTable.tsx         # Presentational table of records.
│       │   ├── FilterBar.tsx            # Client-side filter/search controls.
│       │   └── ErrorBanner.tsx          # Renders API/load errors.
│       ├── pages/
│       │   ├── DashboardPage.tsx        # "Records Dashboard": fetches list via API, filters interactively.
│       │   └── RecordDetailPage.tsx     # Detail route (React Router) for a single record.
│       └── __tests__/
│           ├── DashboardPage.test.tsx   # Vitest + RTL: renders dashboard, mocks suiteletClient, asserts rows/filter.
│           └── suiteletClient.test.ts   # Unit test for URL building + JSON parsing.
│
└── src/                                 # ── SDF project root (deployed to NetSuite) ──────────────────
    ├── manifest.xml                     # SDF manifest: projecttype=ACCOUNTCUSTOMIZATION, account features, dependencies.
    ├── deploy.xml                       # SDF deploy descriptor: which objects/files to deploy.
    ├── FileCabinet/
    │   └── SuiteScripts/
    │       └── SuiteReact/
    │           ├── st_suitereact_ui.js  # The Suitelet (SuiteScript 2.1): serves HTML on GET, JSON on action/POST.
    │           └── ui.html              # GENERATED single-file React bundle (injected by inject-bundle.mjs; git-ignored or committed per policy).
    └── Objects/
        ├── customscript_st_suitereact_ui.xml       # <scriptdeployment>-bearing <suitelet> script record object.
        └── (deployment is nested inside the script object — see §6)
```

Notes:
- `src/FileCabinet/SuiteScripts/SuiteReact/ui.html` is a **build artifact**. Recommended: git-ignore it and regenerate on every build, so the repo never carries a stale bundle. (If you prefer reproducible deploys without a build step, commit it — documented as a policy choice in README.)
- Everything under `src/` mirrors what lands in the NetSuite account. Everything under `app/` is local-only tooling that never ships.

---

## 4. The Suitelet (`st_suitereact_ui.js`) — responsibilities

```js
/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/file', 'N/query', 'N/log'], (file, query, log) => {
  const onRequest = (context) => {
    const { request, response } = context;
    const action = request.parameters.action;

    // ---- DATA API branch (JSON) ----
    if (request.method === 'POST' || action) {
      response.setHeader({ name: 'Content-Type', value: 'application/json' });
      try {
        const payload = handleAction(action, request);     // see §5 for actions
        response.write(JSON.stringify({ ok: true, data: payload }));
      } catch (e) {
        response.write(JSON.stringify({ ok: false, error: String(e.message || e) }));
      }
      return;
    }

    // ---- UI branch (HTML) ----  GET, no action
    const html = file.load({ id: 'SuiteScripts/SuiteReact/ui.html' }).getContents();
    response.write(html);          // Content-Type defaults to text/html for Suitelet writes
  };
  return { onRequest };
});
```

(Illustrative — actual implementation is a code task, not part of this doc. `file.load` may use the internal File ID or path depending on account; resolving by path is shown.)

---

## 5. Request-Multiplexing Contract

The browser always calls **one URL** (the Suitelet deployment URL). Branching is by `request.method` and the `action` query parameter.

### 5.1 Initial page load — HTML
```
GET <suitelet-url>
→ 200 text/html   (the full single-file SPA; React Router takes over)
```
No `action` param, method `GET` ⇒ HTML branch.

### 5.2 List records — JSON (GET)
```
GET <suitelet-url>?action=list&type=customer&limit=50&offset=0&q=acme
→ 200 application/json
{
  "ok": true,
  "data": {
    "rows": [ { "id": 123, "name": "Acme Co", "email": "a@acme.com", "date": "2026-06-01" } ],
    "total": 412,
    "limit": 50,
    "offset": 0
  }
}
```
Query params: `action=list` (required), `type` (record family, server-validated against an allow-list), `limit`/`offset` (paging), `q` (optional server-side filter passed safely into SuiteQL via **parameterized** query params — never string-concatenated).
Governance budget: one `N/query` SuiteQL `.runPaged` / `.run` ≈ **10 units**. Stay well under 1000.

### 5.3 Get one record — JSON (GET)
```
GET <suitelet-url>?action=get&type=customer&id=123
→ 200 application/json
{ "ok": true, "data": { "id": 123, "fields": { ... } } }
```
Backs the React Router `RecordDetailPage`.

### 5.4 Mutations — JSON (POST)
All writes are `POST` with a JSON body; the `action` lives in the body (and/or query). Same session cookie authenticates.
```
POST <suitelet-url>
Content-Type: application/json
Body:
{ "action": "update", "type": "customer", "id": 123, "values": { "comments": "VIP" } }

→ 200 application/json
{ "ok": true, "data": { "id": 123 } }
```
Standard envelope for **every** JSON response:
```
{ "ok": true,  "data": <payload> }
{ "ok": false, "error": "<message>" }
```
`POST` with no `action` is treated as a JSON request and returns `{ ok:false, error:"missing action" }` — it must **never** fall through to the HTML branch.

### 5.5 Branch decision table

| method | `action` present? | Branch | Content-Type |
|---|---|---|---|
| GET | no | UI (load `ui.html`) | text/html |
| GET | yes | Data API (read action) | application/json |
| POST | (in body or query) | Data API (read/write action) | application/json |

---

## 6. SDF Objects (script + deployment records)

SDF represents the Suitelet as a **script object** with a nested **scriptdeployment**. File and ID conventions:

### 6.1 Script record — `customscript_st_suitereact_ui`
- **SDF object file:** `src/Objects/customscript_st_suitereact_ui.xml`
- **Object type:** `<suitelet>` with `scriptid="customscript_st_suitereact_ui"`
- **`scriptfile`:** `[/SuiteScripts/SuiteReact/st_suitereact_ui.js]` (File Cabinet reference)
- **`name`:** `SuiteReact UI`

### 6.2 Deployment record — `customdeploy_st_suitereact_ui`
- Nested inside the script object's `<scriptdeployments>` element.
- **`scriptid`:** `customdeploy_st_suitereact_ui`
- **`status`:** `RELEASED`
- **`isdeployed`:** `T`
- **`title`:** `SuiteReact UI Deployment`
- **`audience` / roles:** **explicitly restricted** (see §7) — do not ship `audslevel=ALLPARTNERS/ALLEMPLOYEES` blindly.
- The deployment record yields the **URL** the browser uses (`/app/site/hosting/scriptlet.nl?script=<internalId>&deploy=<internalId>`, plus the external URL form if `availablewithoutlogin` is enabled — which we keep **off**).

### 6.3 Chosen identifiers (concrete)

| Thing | Value |
|---|---|
| Script ID | `customscript_st_suitereact_ui` |
| Deployment ID | `customdeploy_st_suitereact_ui` |
| Suitelet source file | `src/FileCabinet/SuiteScripts/SuiteReact/st_suitereact_ui.js` |
| File Cabinet path (deployed) | `/SuiteScripts/SuiteReact/st_suitereact_ui.js` |
| UI bundle source file | `src/FileCabinet/SuiteScripts/SuiteReact/ui.html` |
| File Cabinet path (deployed) | `/SuiteScripts/SuiteReact/ui.html` |
| SDF object file (script) | `src/Objects/customscript_st_suitereact_ui.xml` |
| `N/file.load` id used at runtime | `SuiteScripts/SuiteReact/ui.html` (path) or its internal File ID |

> Naming convention used: `st_` prefix = SuiteReact starter; matches `customscript_`/`customdeploy_` NetSuite-required prefixes.

---

## 7. Security Notes

1. **Inline-HTML / XSS surface.** The HTML branch writes the entire bundle verbatim — that is *trusted, build-time* content (your own React app), so writing it directly is fine. The real XSS risk is in the **data API**: never interpolate user/record data into HTML on the server. The Suitelet returns **JSON only** for data; React renders it as text (JSX auto-escapes). Avoid `dangerouslySetInnerHTML` in the React app entirely. If any record field could contain markup, it is still safe because it crosses the boundary as JSON and is rendered as a string.
2. **SuiteQL / injection.** Build SuiteQL with **parameterized** values (the `params` array of `query.runSuiteQL`), never string concatenation of `q`, `id`, `type`. Validate `type` against a **server-side allow-list** of record types; reject anything else. Validate/clamp `limit` and `offset` to sane numeric bounds.
3. **JSON response hardening.** Always `response.setHeader({name:'Content-Type', value:'application/json'})` on the data branch so browsers don't sniff/execute it as HTML. Return the `{ ok, data|error }` envelope; never echo raw stack traces to the client (log server-side via `N/log`).
4. **Role / permission on the deployment.** Restrict the deployment `audience` to the specific roles/employees who should use the dashboard — do **not** default to "all roles." Keep `availablewithoutlogin = F` so the session-cookie auth model holds (no anonymous access). The Suitelet only does what the **logged-in user's role** permits; NetSuite enforces record permissions on every `N/query`/`N/record` call, so a user cannot read records their role can't see.
5. **CSRF posture.** Because auth is the NetSuite session cookie, treat state-changing `POST`s with care. Same-origin (the SPA is served from the same Suitelet URL) limits exposure; keep mutations behind explicit `action`s and validate inputs. Document that builders should add their own request-validation if they expose sensitive writes.
6. **Governance budget (1000 units/execution).** Keep each action lean: one SuiteQL/search per request, page results, avoid `record.load` for list views. Log unit usage during development. A runaway loop can exhaust the budget and throw `SSS_GOVERNANCE_LIMIT_EXCEEDED`.
7. **Secrets.** No tokens in the browser bundle (that's the whole point of the Suitelet/session model). `.env` (SDF auth) is git-ignored; only `.env.example` is committed.

---

## 8. Build → Deploy Workflow

`package.json` scripts (names indicative):

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Local React dev server (data calls mocked or proxied; no NetSuite). |
| `build` | `tsc -b && vite build` | Type-check, then produce the single-file `dist/index.html`. |
| `inject` | `node scripts/inject-bundle.mjs` | Copy `dist/index.html` → `src/FileCabinet/SuiteScripts/SuiteReact/ui.html`. |
| `bundle` | `npm run build && npm run inject` | Build + stage in one step. |
| `deploy` | `suitecloud project:deploy` | SDF deploy of `src/` (files + objects) to the configured account. |
| `ship` | `npm run bundle && npm run deploy` | Full pipeline. |
| `test` | `vitest run` | Vitest + RTL. |
| `lint` | `eslint .` | ESLint. |

End-to-end sequence:

```
[1] npm run build      # Vite + vite-plugin-singlefile -> dist/index.html (all JS/CSS inlined)
[2] npm run inject     # scripts/inject-bundle.mjs copies it to src/FileCabinet/.../ui.html
[3] suitecloud account:setup   # one-time: authenticate the SDF CLI to the target account
[4] npm run deploy     # SDF uploads FileCabinet (ui.html + suitelet .js) + Objects (script & deployment)
[5] Open the deployment URL in NetSuite  -> Suitelet serves ui.html -> SPA boots -> calls ?action=list
```

First-time setup also requires: install the **SuiteCloud CLI** (`@oracle/suitecloud-cli`), run `suitecloud account:setup` (or `account:savetoken`) to create the auth ID referenced by `suitecloud.config.js`, and enable the **SuiteCloud Development Framework** / **SuiteScript** features in the target account.

---

## 9. Open Decisions / Adapt Points

- **Record family** in the Records Dashboard is parameterized (`type=`) with a server allow-list — swap in your own record types.
- **Read engine:** `N/query` (SuiteQL) is the default for lists (lean, joinable). `N/search` is the fallback when a saved search already exists. `N/record` only for single-record detail/writes.
- **Bundle artifact policy:** git-ignore `ui.html` (regenerate every build) vs. commit it (reproducible deploy without Node). README states the chosen default: **git-ignore + regenerate**.
