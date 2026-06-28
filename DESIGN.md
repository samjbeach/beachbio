# BeachBio tools — design system

The `/tools` section is a set of small, self-contained, single-file HTML tools
that share one visual language. This doc is the guide for keeping them
consistent and for adding new ones.

## The two reference files

| File | What it is |
|------|------------|
| [`public/tools/tool.css`](public/tools/tool.css) | The single source of truth for tokens (colours, type) and component styling. Every tool links it. |
| [`public/tools/_template/index.html`](public/tools/_template/index.html) | A live style guide + copy-me starter. Open it in the browser (or in Claude Design) to see every component rendered. Start new tools by copying its `<head>` and structure. |

`tool.css` and the template are meant to be edited together: if you add a
reusable pattern, put the styles in `tool.css` and show it off in the template.

## Design language at a glance

- **Dark, instrument-panel aesthetic.** Deep teal surfaces, high-contrast text.
- **Type:** [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk)
  for prose/UI, [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
  for numbers, labels, and anything tabular.
- **One accent.** Coral (`--accent`) is the *only* primary accent — main action,
  active state, the single most important number. Gold / cyan / rose
  (`--gold`, `--cyan`, `--rose`) are for distinguishing data series, not for
  emphasis. Don't introduce new accent colours per tool.
- **Status colours:** `--ok` (green) and `--warn` (coral) only.

### Tokens

All defined as CSS variables in `tool.css`:

```
surfaces  --ground --panel --field --line --inputbg --inputbd
text      --ink --muted --faint
accents   --accent --gold --cyan --rose
status    --ok --warn
type      --sans --mono
```

Use the variables — never hard-code a hex value in a tool's own `<style>`.

### Components

The template renders all of these; the class names are stable:

- Layout: `.wrap`, `.grid` (2-col), `.two` (2-col pair), `.inline`, `.rowbtns`
- Headings: `.eyebrow`, `h1`, `h2`, `.sub`, `.hint`, `.step` (numbered)
- Panels: `.panel` (+ `.panel h2`), `fieldset`/`legend`/`.legend-sub`
- Forms: `.field-row`, `.unit`, inputs/selects/textareas, `.toggle`
- Buttons: `button`, `button.primary`, `.preset`
- Tables: `table`, `.ro` (read-only cell), `tr.flag`, `.row-win`, `td input.lbl`
- Readouts: `.summary` / `.readout`, `.derived`
- Callouts: `.verdict.ok`, `.verdict.warn`, `.note`, `.warn`, `.flag`, `.flagnote`

## Folder layout

Tools are grouped into subfolders by domain. Each tool is its own folder with an
`index.html` so the URL is clean (`/tools/<group>/<name>/`).

```
public/tools/
├── index.html                      directory page (lists all tools)
├── tool.css                        shared design system
├── nav.js                          injected sidebar (grouped registry)
├── _template/index.html            style guide + starter
├── hello/index.html                root group (ungrouped tools)
├── modelling/
│   └── saponification-timer/index.html
└── hplc/
    ├── standard-prep/index.html
    └── analysis/index.html
```

## Adding a new tool

1. **Create the folder.** Pick a group: `public/tools/<group>/<name>/index.html`
   (or drop it directly under `public/tools/<name>/` for an ungrouped/root tool).
2. **Start from the template.** Copy the `<head>` boilerplate and overall
   structure from `_template/index.html`. Link `tool.css`; keep tool-specific
   CSS in a small `<style>` block.
3. **Add the sidebar script.** Include `<script src="/tools/nav.js"></script>`
   immediately before `</body>`.
4. **Register it in the sidebar.** Add a `{ label, path }` entry to the matching
   group in the `GROUPS` array at the top of [`nav.js`](public/tools/nav.js).
   To create a new group, add a `{ heading, tools: [...] }` block.
5. **List it on the directory page.** Add a link in
   [`public/tools/index.html`](public/tools/index.html).
6. **Deploy:** `npx wrangler deploy`.

## Notes

- These are static single-file tools — no build step, no framework. Keep each
  tool's JS self-contained in its own `index.html`.
- Everything under `/tools/*` is gated by Cloudflare Access (see project README /
  deploy notes), so tools can assume an authenticated user.
- The sidebar (`nav.js`) is the one shared piece of runtime JS; it injects
  itself and shifts page content. Tools don't need to know about it beyond
  including the script tag.
