# MVA pathway — minimal flux model (interactive notebook)

A stripped-down, MVP version of the [BSF carotenoid flux tool](../bsf-carotenoid-flux/),
delivered as a real Jupyter notebook that runs **entirely in the browser** — no install, no
server. Python is compiled to WebAssembly and executed client-side via
[JupyterLite](https://jupyterlite.readthedocs.io/) + [Pyodide](https://pyodide.org/).

## What's here

```
mva-flux-model/
├── index.html            styled launcher page (links into the notebook)
├── mva-flux-model.ipynb  the notebook source (also served for download)
└── lite/                 the pre-built JupyterLite site (static files)
```

`index.html` is the BeachBio-styled entry; the "Open the notebook" button links to
`lite/notebooks/index.html?path=mva-flux-model.ipynb`. Everything is static — it serves through
the existing Cloudflare Workers assets pipeline with no build step at deploy time.

## The model

Only the **mevalonate (MVA) trunk** of the full tool:

```
acetyl-CoA → HMG-CoA → mevalonate → IPP ⇌ DMAPP → GPP → FPP
             (HMGR)    (MVK·PMK·MVD)  (IDI)      (FPPS) (FPPS)
```

Six Michaelis–Menten reactions over seven pools, plus a first-order dilution term on every pool
(the full tool's `K_DIL` device) so the system settles to a finite steady state. Integrated to
steady state with `scipy.integrate.solve_ivp`. Baseline `V` values match the parent tool.

Left out on purpose (this is the MVP skeleton): shared acetyl-CoA/NADPH pools, MVK product
inhibition, expression cassettes, the carotenoid tail (phytoene → … → astaxanthin), and the
Monte-Carlo sensitivity ensemble. Units are **relative, not µM** — the point is relative
structure and where flux backs up, not a calibrated titre.

## First load

The Python runtime (numpy / scipy / matplotlib) is pulled from a CDN on first visit (~tens of MB),
then cached by the browser. Source maps were stripped from the `lite/` build to keep the
committed footprint down (~19 MB).

## Rebuilding the JupyterLite site

If you edit `mva-flux-model.ipynb`, regenerate `lite/`:

```bash
pip install jupyterlite-core jupyterlite-pyodide-kernel jupyter-server
mkdir -p _stage/files && cp mva-flux-model.ipynb _stage/files/
cd _stage && jupyter lite build --contents files --output-dir dist --apps notebooks --apps repl
find dist -name '*.js.map' -delete          # drop debug source maps
rm -rf ../lite && mv dist ../lite            # replace the served build
```
