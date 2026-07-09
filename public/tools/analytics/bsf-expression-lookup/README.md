# BSF Expression Lookup

Point-lookup tool for a single *Hermetia illucens* gene: functional annotation +
TPM across all 37 RNA-seq samples. Static, client-side; queries `data.parquet`
in the browser with DuckDB-WASM. Part of the BeachBio `/tools/analytics/` section.

## Files

| File | Role |
|------|------|
| `prep.py` | One-time (re-runnable) build script: joins the sources → `data.parquet`. |
| `data.parquet` | The joined, committed data the frontend loads (~2.5 MB). |
| `index.html` | UI shell (uses the global `/style.css`). |
| `app.js` | DuckDB-WASM bootstrap, search, render, chart. |

## Data model — read this

- **TPM** (`merged_gene_2.tsv`) is **gene-level**: one value per gene per sample,
  17,891 genes, 1:1 on `gene_id`.
- **Annotation** (`BSF_Gene_FunctionalAnnotation.xlsx`) is **transcript-level**:
  18,830 rows because 918 genes have 2–4 isoforms, and 592 of those have
  *genuinely different* annotations between isoforms.

So `data.parquet` is at **transcript grain**: one row per isoform, carrying that
isoform's annotation plus the gene's TPM as a single `DOUBLE[] tpm` array
(repeated across a gene's isoforms — parquet compresses the repetition away).
The frontend groups by `gene_id`: it shows one annotation block per isoform and
the TPM once.

Why TPM is an array, not 37 columns: the sample set contains both `MT1/MT2`
(larval Malpighian tubule) and `Mt1/Mt2` (adult male tarsus), which collide under
DuckDB's case-insensitive SQL identifiers. The array preserves exact labels and
order. `SAMPLES` in `app.js` must match the `sample order:` line prep.py prints.

## Rebuilding the data

Run whenever the source `.tsv` / `.xlsx` change:

```powershell
python -m pip install duckdb openpyxl      # once
python prep.py                             # uses the default source paths
# or point at moved sources:
python prep.py --tsv <path.tsv> --xlsx <path.xlsx> --out data.parquet
```

It prints an id-set overlap check (`only_tpm` / `only_ann` should both be 0) and
the final row/gene counts. Default source paths are the `G:\My Drive\EntoZyme\…`
locations; edit the `DEFAULT_*` constants at the top of `prep.py` if they move.

## Serving locally

DuckDB-WASM won't load from `file://` — serve over HTTP from the repo root:

```powershell
npx wrangler dev        # serves ./public with the site's routing
# or any static server, e.g.:  python -m http.server 8080 --directory public
```

Then open `http://localhost:<port>/tools/analytics/bsf-expression-lookup/`.
In production it's deployed with the rest of the site (see repo README) and gated
by Cloudflare Access.

## Not built yet (hooks left in place)

- **Group/average TPM by tissue/stage/sex** (paper Table 4). `app.js` has a
  commented `SAMPLE_GROUPS` hook and a note on the code decoding; wire a
  `{ sample: group }` map there to add it.
