# BSF isoprenoid → carotenoid pathway model

A single-file, client-side steady-state model of the isoprenoid → carotenoid pathway
in black soldier fly (*Hermetia illucens*) fat body. It is a **shared back-of-envelope
for spotting bottlenecks and deciding which enzymes to add or boost — not a titre
predictor.** Everything lives in [`index.html`](index.html) — no build step, no
dependencies (the upstream brief's React/Vite stack was adapted to the BeachBio
no-framework tool convention). The full write-up also lives folded at the bottom of the
tool page itself.

## The model (v2)

- **Endogenous vs heterologous** enzymes are first-class and visually distinct. The
  pathway map is a clean vertical cascade; every arrow is one enzyme, coloured by who
  runs it (grey = native, cyan = recombinant, coral = heterologous, gold = fed).
- **Native vs recombinant.** Endogenous enzymes have feedback-limited native activity;
  adding a **recombinant (cisgenic, semi-synthetic-promoter) copy** removes the feedback
  term and scales the enzyme by its cassette's promoter strength. Recombinant feedback-free
  HMGR *is* "tHMGR".
- **Cassettes.** Recombinant/heterologous enzymes are grouped into cassettes; one
  promoter-strength slider scales every enzyme in a cassette together. An enzyme can sit
  in **several cassettes at once** — its expression is the sum of those promoters.
- **IUP is a buildable module.** BSF has no native route from fed isopentenols into the
  pathway, so the prenol/isoprenol feed does nothing until you add choline kinase + IPK
  (the IUP module) to a cassette. Lets you compare recombinant-MVA vs IUP-feed vs both.
- **Push vs pull.** Downstream consumption relieves FPP feedback on *native* MVA enzymes
  (recombinant copies are feedback-free), so a strong pull lifts native supply — strongest
  in yeast mode; weak in BSF (sterol auxotroph → little feedback, no squalene leak), which
  is why a tHMGR push works relatively better in BSF. Modelled crudely; flagged for the
  Deep Research pass.
- **Native expression is data-settable** (the "native level" column) — the hook for
  plugging in transcriptomics/proteomics of the endogenous MVA/prenyl enzymes.
- **Steady state** solved directly (dC/dt = 0) by damped Newton with a finite-difference
  Jacobian (11 species). **Leverage** bars are ±1% finite-difference flux-control
  coefficients on the end-product flux (β-carotene, or astaxanthin if CrtW-Z is in).
- Fat-body lipogenesis competition for acetyl-CoA is always on (coarse, illustrative).

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

- **Yeast validation** preset (squalene sink on, flooded "strong GGPPS" supply, WT
  cyclase): lycopene accumulates massively (≈ 16) with low β-carotene (≈ 3). Switch CarRP
  to Y27R and lycopene collapses (≈ 1.8) while β-carotene jumps (≈ 17) — the Ma 2022/2023
  WT-vs-Y27R behaviour. The framework isn't tied to one dataset: add another reference by
  making a preset and setting that host's native levels.
- **BSF wild-type** preset (no engineered enzymes) → essentially no carotenoid flux,
  matching Günther / aphid-pigmentation intuition.

> The cyclase kcat/Km/Ki were rescaled from the brief's placeholder 30/100 figures to the
> model's operating pool range so the central WT-vs-Y27R behaviour actually emerges — the
> relative, defensible behaviour is the point, not the absolute constants.

## Re-parameterising

All editable kinetics are near the top of the `<script>` in `index.html`: the `V` (per-
reaction turnover), `KM`, `LCY` (cyclase) and `NATIVE_DEF` (host native-expression
defaults) objects, plus the `ENZYMES` registry. This is meant to be a living document —
update as real BSF data arrives.
