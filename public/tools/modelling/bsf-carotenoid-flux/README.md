# BSF isoprenoid → carotenoid pathway model

A single-file, client-side steady-state model of the isoprenoid → carotenoid pathway
in black soldier fly (*Hermetia illucens*) fat body. It is a **shared back-of-envelope
for spotting bottlenecks and deciding which enzymes to add or boost — not a titre
predictor.** Everything lives in [`index.html`](index.html) — no build step, no
dependencies (the upstream brief's React/Vite stack was adapted to the BeachBio
no-framework tool convention). The full write-up also lives folded at the bottom of the
tool page itself.

## The pathway view (v4 — presentation only, no model changes)

The map was rebuilt around a single reframe: **enzymes are the primary objects,
flux + leverage (flux-control coefficient) are the primary quantities, and
metabolite pools are demoted to small hedged chips on the wire.** Enzyme boxes
carry a leverage bar (solid green once the ensemble calls it "engineer next",
hatched gold when "measure first"), a provenance border (native / recombinant /
heterologous / engineered-variant), and a confidence dot. MVK's product
inhibition is drawn as dashed ⊣ arcs from GPP/FPP/GGPP that grey out when the
variant is switched to FBR; the cyclase's substrate inhibition is a self-loop
that fades out under Y27R; SaGGPPs' DMAPP-direct route and phytoene synthase's
2×GGPP requirement are drawn as AND-junctions; competing sinks (squalene,
dolichol, CoQ, GG-prenyl) are drawn as flux-proportional leaks. Hover or click
any box for a full inspector (kinetics, source/confidence, current flux, FCC,
active regulation, ensemble verdict). This view is desktop-first by design —
it's an instrument panel meant to be read on a real monitor with a mouse, not
optimized for a phone. Everything above reads the model's existing outputs; it
does not touch any rate law, the solver, or the ensemble sampler.

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
`thiolase`, `hmgr`, `mva_lower` and `idi`/`fpps`/`ggpps_native`. The tool's **native levels**
toggle (top panel, next to the host selector) now plugs a compressed version of this table
into `NATIVE_DEF.insect_transcript` — see caveats below before trusting it further.

**Reference point:** the two annotated "larval serum protein 2-like" genes (BSF's
Lsp2 paralogs) both peak sharply at **8–12 day larva** (day 8: ~92,900 / ~31,700 TPM-like
units; day 12: ~38,300 / ~36,700), then collapse everywhere else — i.e. late feeding
larva is the developmental window "Lsp2b active" refers to.

**Correction:** several MSTRG loci in the raw sheet had a second row sharing the exact same
gene coordinates with a blank description — a StringTie artifact (one locus split across two
transcript records, only one of which got the RefSeq annotation), not a second gene. An
initial pass missed this and reported IDI and MVD as reading near-zero at this stage; summing
the paired rows shows both are in fact highly expressed. Table below is corrected (both rows
summed where this applies).

| Model node | Enzyme | Gene / locus | 8-d-L | 12-d-L |
|---|---|---|---|---|
| `thiolase` | Acetyl-CoA acetyltransferase, mitochondrial (2 rows summed) | LOC119654848 (MSTRG.20791) | 8412 | 8347 |
| `thiolase` | Acetyl-CoA acetyltransferase, cytosolic | LOC119649954 (MSTRG.9956) | 360 | 188 |
| — | HMG-CoA synthase 1 (2 rows summed) | LOC119659028 (MSTRG.24483) | 1682 | 3393 |
| `hmgr` | HMG-CoA reductase | LOC119652831 (MSTRG.14070) | 260 | 100 |
| `mva_lower` | Phosphomevalonate kinase | LOC119651040 (MSTRG.15632) | 16 | 4 |
| `mva_lower` | Diphosphomevalonate decarboxylase (2 rows summed) | LOC119658387 (MSTRG.23023) | 30,909 | 33,358 |
| `mva_lower` | Mevalonate kinase | **not found** — see caveats | — | — |
| `idi` | Isopentenyl-diphosphate Δ-isomerase 1 (2 rows summed) | LOC119651563 (MSTRG.12422) | 4956 | 2372 |
| `fpps` | Farnesyl pyrophosphate synthase (active paralog) | LOC119657789 (MSTRG.1162) | 496 | 501 |
| `ggpps_native` | Geranylgeranyl pyrophosphate synthase | LOC119647985 (MSTRG.9233) | 45 | 78 |
| — | HMG-CoA lyase, mitochondrial (2 rows summed; ketogenic branch, not MVA) | LOC119652739 (MSTRG.14367) | 0 | 2200 |

Full table across all 11 stages: `mva_pathway_expression_corrected.csv` (generated during
analysis, not committed to this repo — regenerate from the source workbook if needed).

**Reading the corrected numbers:** thiolase, HMGS, MVD and IDI are all robustly transcribed
at this stage (thousands of units) — none of them read as "off." **Phosphomevalonate kinase
(PMK) is the one standout low value, consistently, across every developmental stage** (single
to low double digits vs. thousands for its neighbours), which is a real, stage-independent
signal that PMK — not MVD — is the likely rate-limiter inside the lumped `mva_lower` node.
HMGR also sits noticeably lower than thiolase/HMGS/MVD/IDI, consistent with it being
regulated/limiting rather than off.

**How this maps to the model's `NATIVE_DEF.insect_transcript`:** raw mRNA ratios between
these nodes span ~800-fold (thiolase vs. PMK), which is too extreme to use as a literal
linear flux-capacity multiplier — a highly-expressed enzyme with a low catalytic rate could
still be non-limiting, and vice versa. Each node's value is therefore log-compressed toward
the existing thiolase placeholder (`new = 0.1 × (mRNA_node / mRNA_thiolase)^0.35`), which
preserves rank order and relative spread without the low end collapsing to ~0. `mva_lower`
uses PMK alone (not an MVD/PMK average) as the representative value, since a linear chain's
throughput is set by its slowest member. Resulting values: thiolase 0.10 (anchor), IDI 0.074,
FPPS 0.037, HMGR 0.026, GGPPS 0.018, mva_lower 0.0094.

**Caveats before trusting this further:**
- mRNA, not protein or flux — HMGR especially is post-translationally regulated in other
  systems, so transcript level is a weak proxy for its activity specifically.
- Single value per stage in the source sheet, no replicates — no way to bound noise.
- The log-compression exponent (0.35) is a judgment call to avoid an implausibly extreme
  spread, not a fitted or literature-derived constant — treat the resulting ratios as
  illustrative/directional, not calibrated.
- `NATIVE_DEF` is a flat per-enzyme scalar with no developmental axis; this data is
  stage-resolved. The toggle uses the 8–12-d-L average — appropriate if targeting the Lsp2b
  window specifically, less so for a different developmental target.
- Mevalonate kinase has no matching annotation anywhere in the workbook (checked all 4
  sheets/columns for `mevalonate|MVK|GHMP|mevalonic`, and genes flanking the PMK locus on
  NC_051851.1) — likely present in the genome but unnamed by the automated annotation, not
  confirmed absent. The model's `mvk_*` constants remain AaMVK-sourced proxies regardless.
