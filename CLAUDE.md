# BeachBio — project context

Personal site at **beachbio.io**. Static HTML/CSS/JS, no framework, no build step.
Hosted on **Cloudflare Workers Static Assets** (NOT Pages). A public landing page
and a `/dashboard/` placeholder, plus a `/tools/` section gated behind Cloudflare
Access.

## Layout

```
public/                 everything servable lives here
├── index.html          landing page ("coming soon")
├── style.css           GLOBAL stylesheet / design system (dark teal theme)
├── dashboard/          placeholder page (to be built)
└── tools/
    ├── index.html      tools directory page
    ├── nav.js          injected grouped sidebar (tool registry lives here)
    ├── _template/      style guide + copy-me starter for new tools
    ├── modelling/      grouped tools …
    └── hplc/
wrangler.jsonc          Workers Static Assets config (assets dir = ./public)
DESIGN.md               design system + "how to add a tool" guide
```

`style.css` is the one shared stylesheet for the **whole site** — landing page,
dashboard, and every tool link it (`<link rel="stylesheet" href="/style.css">`).

There is **no Worker script** — `wrangler.jsonc` just serves `./public`.

## Deploying

**Auto-deploy (primary path):** pushing to `main` triggers
`.github/workflows/deploy.yml`, which runs `wrangler deploy` in CI using a
Cloudflare API token (repo secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`). This means changes go live from any device — including
the mobile app — without an interactive login. You can also trigger it manually
from the GitHub Actions tab (`workflow_dispatch`).

**Manual deploy (fallback):** from the repo root —

```powershell
npx wrangler deploy
```

- Wrangler is a dev dependency (`npm install` if `node_modules` is missing).
- **`wrangler login` is interactive** (opens a browser) and can't be run
  headlessly — if auth has expired, ask the user to run `npx wrangler login`
  and complete it in the browser, then resume. (CI avoids this by using the
  API token instead of `wrangler login`.)
- Live URLs: custom domain `https://beachbio.io` and the workers.dev fallback
  `https://beachbio.samjbeach9.workers.dev`.

## Git / GitHub

- Repo: **github.com/samjbeach/beachbio**, default branch `main`.
- `gh` is installed but **not on PATH** — call it by full path:
  `& "C:\Program Files\GitHub CLI\gh.exe"`. It's already authenticated.
- Normal flow after a change: `git add . ; git commit -m "…" ; git push`.
- Standard rhythm this project follows: **edit → commit → push** (CI auto-deploys
  on push to `main`; run `wrangler deploy` manually only as a fallback).

## Adding / changing tools

Tools are single self-contained `index.html` files grouped by subfolder under
`public/tools/<group>/<name>/`. To add one, follow the checklist in
[DESIGN.md](DESIGN.md): create the folder from `_template`, link `/style.css`,
add `<script src="/tools/nav.js"></script>`, register it in the `GROUPS` array
in `nav.js`, and list it on `public/tools/index.html`.

The saponification tool keeps its CSS inline (canonical look, canvas-specific);
the global `style.css` mirrors its tokens. Other tools use `style.css`.

## Cloudflare Access (security model)

`/tools/*` on `beachbio.io` is protected by a Cloudflare Access (Zero Trust)
application — only the owner's email via one-time PIN; the landing page stays
public. This is configured in the Cloudflare dashboard, not in code. The
workers.dev URL must NOT serve `/tools/*` unauthenticated (either disable the
workers.dev route or apply the same Access policy to it). Tools may assume an
authenticated user.

## Environment notes

- Windows + **PowerShell** (not bash). No `&&` chaining — use `;` or
  `if ($?) { … }`. Don't redirect native-exe stderr with `2>&1`.
- Git shows harmless `LF will be replaced by CRLF` warnings on commit — ignore.
