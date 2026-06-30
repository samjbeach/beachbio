# BSF isoprenoid → carotenoid flux model

A single-file, client-side steady-state flux model of the isoprenoid → carotenoid
pathway as it would run in black soldier fly (*Hermetia illucens*) fat body. It is a
**thinking-aid for spotting bottlenecks, not a titre predictor.** Everything lives in
[`index.html`](index.html) — no build step, no dependencies (fits the BeachBio
no-framework tool convention; the upstream brief's React/Vite stack was adapted to a
self-contained page).

## What it does

- **Live SVG flux map** — edge width ∝ steady-state flux, node size ∝ pool size. The
  squalene/sterol branch is greyed in insect mode (insects lack it).
- **Steady state** is solved directly (dC/dt = 0) with a damped Newton method and a
  finite-difference Jacobian (11 ODEs) — avoids stiffness, no time integration needed.
- **Metabolic Control Analysis** — each enzyme's expression multiplier is perturbed
  ±1%, the target flux (β-carotene, or astaxanthin if enabled) is re-solved, and the
  normalised sensitivity gives the flux control coefficient (FCC) ranking.
- **Diagnostics** — data-driven rules paired with the FCC ranking call out the likely
  bottleneck (cyclase substrate inhibition, phytoene-synthase limiting, weak IDI, C5
  supply limiting, accessibility, lipogenesis cannibalisation).

Scenario state is saved to `localStorage` and URL-encoded (the *copy link* button).

## Key insect assumptions (relative-to-yeast)

- **No squalene/sterol sink** — the dominant yeast drain; off in insect mode.
- **Low native MVA throughput** — default 0.1× yeast; the native thiolase/MVD steps cap
  C5 supply, so adding tHMGR alone often barely helps (raise `expr_MVA` or feed
  prenol/isoprenol instead — the model shows this).
- **IDI activity is unknown** — the highlighted key tunable.
- Most kinetic constants are placeholders extrapolated from yeast / *Drosophila*.

## Validation checks (build trust before extrapolating)

On the **yeast** preset (squalene sink on, strong SaGGPPs, WT cyclase) the model
reproduces the qualitative Ma 2022/2023 behaviour:

- **WT cyclase → lycopene accumulates** (lycopene ≈ 3.3 vs β-carotene ≈ 1.6): the
  substrate-inhibited cyclase `v = Vmax·L/(Km + L + L²/Ki)` is driven past its peak
  throughput and chokes.
- **Switch to Y27R** (Ki → ∞, monotonic): lycopene drops (≈ 1.9) and β-carotene nearly
  doubles (≈ 3.0) — flux restored. Lowering `expr_SaGGPPs` does the same by keeping
  lycopene below the inhibitory regime.
- **BSF baseline** preset (native GGPPS only, no engineered enzymes) shows essentially
  no carotenoid flux — consistent with Gunther / aphid-pigmentation intuition.

> The cyclase Km/Ki were rescaled from the brief's placeholder 30/100 to the model's
> operating pool range (~1) so this central WT-vs-Y27R behaviour actually emerges; the
> relative, defensible behaviour is the point, not the absolute constants.

## Re-parameterising

All editable kinetics are in two places near the top of the `<script>` in `index.html`:
the fixed `K` constants object and the `SLIDERS` config (each with a value, tooltip and
confidence tag). This is meant to be a living document — update as real BSF data arrives.
