# BSF isoprenoid → carotenoid pathway model

A single-file, client-side steady-state model of the isoprenoid → carotenoid pathway
in black soldier fly (*Hermetia illucens*) fat body. It is a **shared back-of-envelope
for spotting bottlenecks and deciding which enzymes to add or boost — not a titre
predictor.** Everything lives in [`index.html`](index.html) — no build step, no
dependencies (the upstream brief's React/Vite stack was adapted to the BeachBio
no-framework tool convention). The full write-up also lives folded at the bottom of the
tool page itself.

## The model (v3)

- **Endogenous vs heterologous** enzymes are first-class and visually distinct. The
  pathway map is a clean vertical cascade; every arrow is one enzyme, coloured by who
  runs it (grey = native, cyan = recombinant, coral = heterologous, gold = fed).
- **Two kinds of "feedback", split (v3).** Endogenous regulation is separated into
  `regFeedback` (transcriptional/ERAD — *escaped* by a recombinant copy behind a strong
  promoter; this is HMGR/tHMGR) and `productInhibition` (competitive at the active site —
  applies to native **and** recombinant copies alike; this is **MVK**, inhibited by
  GPP/FPP/GGPP at its ATP site using insect-direct AaMVK Ki's). Overexpressing native MVK
  stays throttled; only a **feedback-resistant (FBR) MVK variant** escapes — the actual
  cisgenic-vs-engineered lever, selectable in the MVK row.
- **Cassettes.** Recombinant/heterologous enzymes are grouped into cassettes; one
  promoter-strength slider scales every enzyme in a cassette together. An enzyme can sit
  in **several cassettes at once** — its expression is the sum of those promoters.
- **IUP is a buildable module, ATP-gated (v3).** BSF has no native route from fed
  isopentenols into the pathway, so the prenol/isoprenol feed does nothing until you add
  choline kinase + IPK to a cassette. The 2-ATP-per-C5 cost is gated against an **ATP
  headroom** slider (no headroom → throttled, not free flux), and the route consumes **no
  acetyl-CoA carbon and no NADPH** — its whole advantage.
- **Shared cofactor pools (v3).** Acetyl-CoA and NADPH are **bounded shared pools** with
  conservation: the MVA entry (thiolase) and FAS compete for acetyl-CoA; HMGR (2 NADPH/mev)
  and FAS compete for NADPH. Either can become the limiting step. A single **FAS draw**
  slider tunes the diversion and has a sweet spot (lipid droplets also sequester/partition
  the lipophilic product, lifting CrtW-Z accessibility).
- **Rate-law corrections (v3).** Phytoene synthase is cooperative (Hill n=2) in GGPP; the
  SaGGPPs DMAPP-direct route is ~2nd-order in IPP; the cyclase keeps its substrate-inhibition
  form (Ma 2022). These make GGPP/IPP supply appropriately load-bearing.
- **Native expression is data-settable** (the "native level" column).
- **Steady state** solved directly (dC/dt = 0) by damped Newton with a finite-difference
  Jacobian (11 species), **cold-started for determinism** (the cyclase substrate-inhibition
  term is bistable). **Leverage** bars are ±1% finite-difference flux-control coefficients on
  the end-product flux (β-carotene, or astaxanthin if CrtW-Z is in).
- **Sensitivity ensemble (v3).** A "run sensitivity analysis" button samples every kinetic
  constant from its `[lo,hi]` range (~240 Monte-Carlo draws), re-solves and re-ranks each
  draw, and reports the distribution of each enzyme's control coefficient — classifying steps
  as **engineer next** (robustly top) vs **measure first** (rank unstable to the unknowns).

State is saved to `localStorage` and URL-encoded (the *copy link* button).

## Key insect assumptions (relative-to-yeast)

- **No squalene/sterol sink** — the dominant yeast drain; off in insect mode.
- **Low native MVA throughput** — default 0.1× yeast; the native thiolase/MVD steps cap
  C5 supply, so the *first* thing the model tells you about the current construct is that
  it's supply-starved. Expressing the MVA block recombinantly (escaping feedback), or
  feeding prenol/isoprenol, is what unlocks flux.
- **IDI activity is unknown** — the highlighted key uncertainty.
- Most kinetic constants are placeholders extrapolated from yeast / *Drosophila*; see the
  parameter table on the page.

## Validation checks

- **Yeast validation** preset (squalene sink on, microbial IDI Keq, flooded "strong GGPPS"
  supply, WT cyclase): lycopene accumulates (≈ 6.4) with low β-carotene (≈ 0.6). Switch CarRP
  to Y27R and lycopene collapses (≈ 0.4) while β-carotene jumps (≈ 6.6) — the Ma 2022/2023
  WT-vs-Y27R behaviour. The framework isn't tied to one dataset: add another reference by
  making a preset and setting that host's native levels.
- **BSF wild-type** preset (no engineered enzymes) → essentially no carotenoid flux,
  matching Günther / aphid-pigmentation intuition.
- **MVK variant check (v3):** `+ recombinant MVA` (WT MVK) leaves MVK as a product-inhibited
  bottleneck in the leverage bars; switching MVK to FBR (or the `+ FBR MVK` preset) releases
  flux and drops MVK out of the bottleneck list.

> The cyclase kcat/Km/Ki were rescaled to the model's operating lycopene-pool range so the
> central WT-vs-Y27R substrate-inhibition behaviour actually emerges — the relative,
> defensible behaviour is the point, not the absolute constants.

## Re-parameterising

All editable kinetics are near the top of the `<script>` in `index.html`: the `V` (per-
reaction turnover), `ENS` (sampled `[lo,hi]` ranges used by both the midpoint view and the
ensemble), `PARAM` (the source/confidence table) and `NATIVE_DEF` (host native-expression
defaults) objects, plus the `ENZYMES` registry. This is meant to be a living document —
update as real BSF data arrives.

## Real BSF developmental expression data (2026-07)

A BSF whole-body developmental RNA-seq set (egg → adult, `clustering_results_stages_FAMA`
sheet, 33k gene models) was screened for the MVA-pathway enzymes this model lumps into
`thiolase`, `hmgr`, `mva_lower` and `idi`/`fpps`/`ggpps_native`. This is a first look, not
a re-parameterisation — see caveats below before touching `NATIVE_DEF`.

**Reference point:** the two annotated "larval serum protein 2-like" genes (BSF's
Lsp2 paralogs) both peak sharply at **8–12 day larva** (day 8: ~92,900 / ~31,700 TPM-like
units; day 12: ~38,300 / ~36,700), then collapse everywhere else — i.e. late feeding
larva is the developmental window "Lsp2b active" refers to.

| Model node | Enzyme | Gene / locus | 8-d-L | 12-d-L |
|---|---|---|---|---|
| `thiolase` | Acetyl-CoA acetyltransferase, mitochondrial | LOC119654848 (MSTRG.20791) | 8340 | 0 |
| `thiolase` | Acetyl-CoA acetyltransferase, cytosolic | LOC119649954 (MSTRG.9956) | 360 | 188 |
| — | HMG-CoA synthase 1 | LOC119659028 (MSTRG.24483) | 0 | 969 |
| `hmgr` | HMG-CoA reductase | LOC119652831 (MSTRG.14070) | 260 | 100 |
| `mva_lower` | Phosphomevalonate kinase | LOC119651040 (MSTRG.15632) | 16 | 4 |
| `mva_lower` | Diphosphomevalonate decarboxylase | LOC119658387 (MSTRG.23023) | 0 | 5 |
| `mva_lower` | Mevalonate kinase | **not found** — see caveats | — | — |
| `idi` | Isopentenyl-diphosphate Δ-isomerase 1 | LOC119651563 (MSTRG.12422) | 0 | 0 |
| `fpps` | Farnesyl pyrophosphate synthase (paralog) | LOC119657789 (MSTRG.1162) | 496 | 501 |
| `ggpps_native` | Geranylgeranyl pyrophosphate synthase | LOC119647985 (MSTRG.9233) | 45 | 78 |
| — | HMG-CoA lyase, mitochondrial (ketogenic branch, not MVA) | LOC119652739 (MSTRG.14367) | 0 | 2200 |

Notable: IDI mRNA reads **zero at 8-d-L and 12-d-L** in this dataset, only appearing at
L-prepupa/E-pupa/L-pupa (333/265/646). If real, that's a direct hit on the README's
"IDI activity is unknown" flag — it would mean IDI is a genuine bottleneck specifically
during the Lsp2b-driven larval window, not just an unknown. Treat as a hypothesis to
test, not a confirmed value (see caveats).

**Caveats before this touches `NATIVE_DEF`:**
- mRNA, not protein or flux — HMGR especially is post-translationally regulated in other
  systems, so transcript level is a weak proxy for its activity specifically.
- Single value per stage in the source sheet, no replicates — no way to bound noise,
  particularly for the low-hundreds/single-digit rows (PMK, MVD, HMG-CoA lyase).
- `NATIVE_DEF` is a flat per-enzyme scalar with no developmental axis; this data is
  stage-resolved. Using it means picking a representative stage (8–12-d-L, if targeting
  the Lsp2b window) rather than a single organism-wide number.
- Mevalonate kinase has no matching annotation anywhere in the workbook (checked all 4
  sheets/columns for `mevalonate|MVK|GHMP|mevalonic`, and genes flanking the PMK locus on
  NC_051851.1) — likely present in the genome but unnamed by the automated annotation, not
  confirmed absent. The model's `mvk_*` constants remain AaMVK-sourced proxies.
- A handful of MSTRG loci in the raw sheet have a second row sharing the same cluster ID
  with a blank description and much higher values (StringTie overlap artifact); those were
  excluded from the table above as unreliable.
