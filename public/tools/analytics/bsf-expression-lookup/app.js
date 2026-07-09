// BSF Expression Lookup — client-side gene lookup over data.parquet (DuckDB-WASM).
// Grain: annotation is transcript-level (one row per isoform), TPM is gene-level
// (a DOUBLE[] array, same for every isoform of a gene). See prep.py.

import * as duckdb from "https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm";

// ── Sample order — MUST match prep.py's `sample order:` output ──────────────
// Note MT1/MT2 (larval Malpighian tubule) and Mt1/Mt2 (adult male tarsus) are
// distinct samples that differ only by case; the parquet keeps TPM as an array
// precisely so these labels survive.
const SAMPLES = [
  "FG1","FG2","FG3","MG1","MG2","MG3","MT1","MT2","WMT1","WMT2","L","P",
  "Fw1","Fw2","Mw1","Mw2","Fh1","Fh2","Mh1","Mh2","Ft1","Ft2","Mt1","Mt2",
  "T1","T2","T3","T4","T5","T6","T7","T8","HG","MG4","MT3","WMT3","FB",
];

// ── Sample metadata (paper Table 4) ─────────────────────────────────────────
// Developmental stage, tissue, sex, and days-after-hatching for every sample.
// Drives the Stage/Tissue filters and replicate collapsing.
const STAGES = {
  "1st-2nd instar": { cls: "immature", order: 1, label: "1st–2nd instar larva" },
  "3rd-4th instar": { cls: "immature", order: 2, label: "3rd–4th instar larva" },
  "5th instar":     { cls: "immature", order: 3, label: "5th instar larva" },
  "6th instar":     { cls: "immature", order: 4, label: "6th instar larva" },
  "Pupa":           { cls: "immature", order: 5, label: "pupa" },
  "Adult":          { cls: "adult",    order: 6, label: "adult" },
};

// code -> { t: tissue, s: stage key, day?: number, sex?: "F"|"M" }
const META = {
  T1: { t: "Whole body", s: "1st-2nd instar", day: 1 },
  T2: { t: "Whole body", s: "3rd-4th instar", day: 3 },
  T3: { t: "Whole body", s: "5th instar", day: 5 },
  T4: { t: "Whole body", s: "5th instar", day: 7 },
  T5: { t: "Whole body", s: "5th instar", day: 9 },
  T6: { t: "Whole body", s: "6th instar", day: 11 },
  T7: { t: "Whole body", s: "6th instar", day: 12 },
  T8: { t: "Whole body", s: "6th instar", day: 16 },
  L:  { t: "Whole body", s: "6th instar" },
  FG1: { t: "Full gut", s: "6th instar" },
  FG2: { t: "Full gut", s: "6th instar" },
  FG3: { t: "Full gut", s: "6th instar" },
  HG:  { t: "Hindgut", s: "6th instar", day: 20 },
  MG1: { t: "Midgut", s: "6th instar" },
  MG2: { t: "Midgut", s: "6th instar" },
  MG3: { t: "Midgut", s: "6th instar" },
  MG4: { t: "Midgut", s: "6th instar", day: 20 },
  MT1: { t: "Malpighian tubules", s: "6th instar" },
  MT2: { t: "Malpighian tubules", s: "6th instar" },
  MT3: { t: "Malpighian tubules", s: "6th instar", day: 20 },
  WMT1: { t: "White Malpighian tubules", s: "6th instar" },
  WMT2: { t: "White Malpighian tubules", s: "6th instar" },
  WMT3: { t: "White Malpighian tubules", s: "6th instar", day: 20 },
  FB:  { t: "Fat body", s: "6th instar", day: 20 },
  P:   { t: "Whole body", s: "Pupa" },
  Fh1: { t: "Head", s: "Adult", sex: "F" },
  Fh2: { t: "Head", s: "Adult", sex: "F" },
  Ft1: { t: "Tarsus", s: "Adult", sex: "F" },
  Ft2: { t: "Tarsus", s: "Adult", sex: "F" },
  Fw1: { t: "Whole body", s: "Adult", sex: "F" },
  Fw2: { t: "Whole body", s: "Adult", sex: "F" },
  Mh1: { t: "Head", s: "Adult", sex: "M" },
  Mh2: { t: "Head", s: "Adult", sex: "M" },
  Mt1: { t: "Tarsus", s: "Adult", sex: "M" },
  Mt2: { t: "Tarsus", s: "Adult", sex: "M" },
  Mw1: { t: "Whole body", s: "Adult", sex: "M" },
  Mw2: { t: "Whole body", s: "Adult", sex: "M" },
};

// Build an index-aligned metadata array (parallel to SAMPLES / the TPM array).
// repGroup keys the true biological replicates: dissected larval tissues collapse
// by tissue (MG1–4 etc.); adults by tissue+sex; the whole-body time-course keeps
// each timepoint distinct (day is part of the key), so "collapse" leaves it alone.
const SAMPLE_META = SAMPLES.map((code, i) => {
  const m = META[code];
  const cls = STAGES[m.s].cls;
  const day = m.day ?? null;
  const sex = m.sex ?? null;
  const timeCourse = m.t === "Whole body" && cls === "immature"; // T-series + L + P
  const dayKey = timeCourse ? String(day ?? "") : "";
  return {
    i, code, tissue: m.t, stage: m.s, stageClass: cls, day, sex, timeCourse,
    repGroup:   [m.t, m.s, sex ?? "", dayKey].join("|"),
    mergeGroup: [m.t, m.s, "",        dayKey].join("|"), // sex dropped
  };
});

// rep index/count within each repGroup (for "(rep n)" labels), by SAMPLES order.
{
  const count = {}, seen = {};
  SAMPLE_META.forEach((m) => { count[m.repGroup] = (count[m.repGroup] || 0) + 1; });
  SAMPLE_META.forEach((m) => {
    seen[m.repGroup] = (seen[m.repGroup] || 0) + 1;
    m.repIndex = seen[m.repGroup];
    m.repCount = count[m.repGroup];
  });
}

const PARQUET = "data.parquet";
const $ = (id) => document.getElementById(id);

let conn = null;      // DuckDB connection
let chart = null;     // Chart.js instance
let currentTPM = null; // TPM array of the gene currently shown (index-aligned to SAMPLES)

// ── DuckDB bootstrap ────────────────────────────────────────────────────────
async function initDB() {
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles); // single-thread unless COI
  const workerURL = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" })
  );
  const worker = new Worker(workerURL);
  const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerURL);

  const buf = await fetch(PARQUET).then((r) => {
    if (!r.ok) throw new Error(`fetch ${PARQUET}: ${r.status}`);
    return r.arrayBuffer();
  });
  await db.registerFileBuffer(PARQUET, new Uint8Array(buf));
  conn = await db.connect();
  // Sanity: gene count
  const [{ n }] = await q(`SELECT COUNT(DISTINCT gene_id) AS n FROM '${PARQUET}'`);
  return Number(n);
}

// Run a query, return plain JS row objects.
async function q(sql, params = []) {
  const stmt = await conn.prepare(sql);
  const res = await stmt.query(...params);
  await stmt.close();
  return res.toArray().map((r) => r.toJSON());
}

// ── helpers ─────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const isBlank = (v) => v === null || v === undefined || v === "";

// tpm column comes back as an Arrow list; normalise to a JS number array.
function toNums(v) {
  if (v == null) return [];
  if (typeof v.toArray === "function") return Array.from(v.toArray(), Number);
  return Array.from(v, Number);
}

// Normalise a gene-id-ish query to canonical HIJ###### (or null if not one).
// Accepts "HIJ123", "hij 123", "HIJ000123.t2" → "HIJ000123".
function asGeneId(s) {
  const m = s.trim().match(/^hij[_\s]*0*(\d+)(?:\.t\d+)?$/i);
  return m ? "HIJ" + m[1].padStart(6, "0") : null;
}

function fmtEval(e) {
  if (isBlank(e)) return null;
  const n = Number(e);
  if (n === 0) return "0";
  return n.toExponential(1);
}

// ── search entry point ──────────────────────────────────────────────────────
async function search() {
  const raw = $("q").value.trim();
  if (!raw) return;
  hide($("results"));
  hide($("detail"));
  setStatus("Searching…");

  try {
    const gid = asGeneId(raw);
    if (gid) {
      const rows = await q(
        `SELECT * FROM '${PARQUET}' WHERE gene_id = ? ORDER BY transcript_id`, [gid]
      );
      if (rows.length) return renderGene(rows);
      // fall through to substring search if the id wasn't found
    }

    const like = `%${raw}%`;
    const hits = await q(
      `SELECT gene_id,
              any_value(nr_desc) AS nr_desc,
              any_value(dm_desc) AS dm_desc,
              COUNT(*) AS n_iso
       FROM '${PARQUET}'
       WHERE nr_desc ILIKE ? OR dm_desc ILIKE ? OR pfam ILIKE ?
          OR interpro ILIKE ? OR go ILIKE ? OR nr_hit ILIKE ? OR dm_hit ILIKE ?
       GROUP BY gene_id
       ORDER BY gene_id
       LIMIT 101`,
      Array(7).fill(like)
    );

    if (hits.length === 0) {
      setStatus(`No gene or annotation matches “${raw}”.`, true);
      return;
    }
    if (hits.length === 1) {
      const rows = await q(
        `SELECT * FROM '${PARQUET}' WHERE gene_id = ? ORDER BY transcript_id`,
        [hits[0].gene_id]
      );
      return renderGene(rows);
    }
    renderPicklist(hits, raw);
  } catch (err) {
    console.error(err);
    setStatus("Query failed: " + err.message, true);
  }
}

// ── render: multi-match pick-list ───────────────────────────────────────────
function renderPicklist(hits, raw) {
  const capped = hits.length > 100;
  const shown = hits.slice(0, 100);
  const box = $("results");
  box.innerHTML =
    `<h2>Matches <span class="unit">${capped ? "100+" : hits.length}</span></h2>` +
    `<div class="panel"><div class="pick"></div>` +
    (capped ? `<p class="hint">Showing the first 100 — refine your term to narrow it.</p>` : "") +
    `</div>`;
  const pick = box.querySelector(".pick");
  for (const h of shown) {
    const desc = !isBlank(h.nr_desc) ? h.nr_desc : (!isBlank(h.dm_desc) ? h.dm_desc : "—");
    const iso = Number(h.n_iso) > 1 ? ` ·${h.n_iso} iso` : "";
    const b = document.createElement("button");
    b.className = "preset";
    b.dataset.gene = h.gene_id;
    b.innerHTML = `<span class="pid">${esc(h.gene_id)}</span>` +
                  `<span class="pdesc">${esc(desc)}${iso}</span>`;
    b.addEventListener("click", () => selectGene(h.gene_id));
    pick.appendChild(b);
  }
  const n = capped ? "100+" : hits.length;
  setStatus(`${n} genes match “${raw}”. Pick one — the list stays so you can compare.`);
  show(box);
}

// Load + show a gene from the pick-list, keeping the list visible so you can
// click between hits. Only jump to the detail on the first pick; after that the
// detail swaps in place while you stay on the list.
async function selectGene(geneId) {
  const wasHidden = $("detail").classList.contains("hidden");
  const rows = await q(
    `SELECT * FROM '${PARQUET}' WHERE gene_id = ? ORDER BY transcript_id`, [geneId]
  );
  renderGene(rows);
  if (wasHidden) $("detail").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Highlight the pick that matches the shown gene (no-op if no list is present).
function markActivePick(geneId) {
  const btns = document.querySelectorAll("#results .pick button");
  let active = null;
  btns.forEach((b) => {
    const on = b.dataset.gene === geneId;
    b.classList.toggle("sel", on);
    if (on) active = b;
  });
  if (active) active.scrollIntoView({ block: "nearest" });
}

// ── render: single gene detail ──────────────────────────────────────────────
// Note: does NOT hide the results pick-list — a multi-match list stays visible
// so you can click between hits. search() hides it up front for direct lookups.
function renderGene(rows) {
  const g = rows[0];

  // header
  const loc = isBlank(g.chrom) ? "" :
    `${g.chrom}:${g.start ?? "?"}–${g.end ?? "?"} (${String(g.strand || "").trim() || "?"})`;
  const cds = isBlank(g.cds_len) ? "" : ` · CDS ${g.cds_len} bp`;
  $("geneHead").innerHTML =
    `<span class="gid">${esc(g.gene_id)}</span>` +
    (loc ? `<span class="loc">${esc(loc)}${cds}</span>` : "") +
    `<span class="niso">${rows.length} isoform${rows.length > 1 ? "s" : ""}</span>`;

  // isoform annotation blocks
  $("isoforms").innerHTML = rows.map(isoformBlock).join("");

  // TPM (gene-level; identical across isoforms → use first row). Filtering,
  // collapsing and charting are all derived from this array by renderExpression.
  currentTPM = toNums(g.tpm);
  renderExpression();

  show($("detail"));

  markActivePick(g.gene_id);
  const inList = !$("results").classList.contains("hidden");
  setStatus(inList
    ? `Showing ${g.gene_id} — click another match above to compare.`
    : `Showing ${g.gene_id}.`);
}

function isoformBlock(r) {
  const rowsDl = [];
  const addHit = (label, id, pid, ev, desc) => {
    if (isBlank(id) && isBlank(desc)) {
      rowsDl.push(`<dt>${label}</dt><dd class="none">no hit</dd>`);
      return;
    }
    const meta = [];
    if (!isBlank(pid)) meta.push(`${Number(pid)}% id`);
    const e = fmtEval(ev);
    if (e !== null) meta.push(`E ${e}`);
    rowsDl.push(
      `<dt>${label}</dt><dd>` +
        (isBlank(desc) ? "" : esc(desc)) +
        (isBlank(id) ? "" : ` <span class="sub">${esc(id)}${meta.length ? " · " + meta.join(" · ") : ""}</span>`) +
      `</dd>`
    );
  };

  addHit("nr hit", r.nr_hit, r.nr_pident, r.nr_evalue, r.nr_desc);
  addHit("Dm ortholog", r.dm_hit, r.dm_pident, r.dm_evalue, r.dm_desc);

  const dom = (label, v) =>
    `<dt>${label}</dt>` +
    (isBlank(v)
      ? `<dd class="none">—</dd>`
      : `<dd class="mono">${esc(String(v).replace(/\|/g, " · "))}</dd>`);

  rowsDl.push(dom("Pfam", r.pfam));
  rowsDl.push(dom("InterPro", r.interpro));
  rowsDl.push(dom("GO", r.go));

  return (
    `<div class="iso">` +
      `<p class="iso-id">${esc(r.transcript_id || r.gene_id)}` +
      (isBlank(r.cds_len) ? "" : `<span class="tag">CDS ${r.cds_len} bp</span>`) +
      `</p>` +
      `<dl class="ann">${rowsDl.join("")}</dl>` +
    `</div>`
  );
}

// ── expression view (filter · collapse · table · chart) ─────────────────────
const sexSym = (s) => (s === "F" ? "♀" : s === "M" ? "♂" : "");

function sampleLabel(m) {
  let s = `${m.tissue}, ${STAGES[m.stage].label}`;
  if (m.timeCourse && m.day != null) s += `, day ${m.day}`;
  if (m.sex) s += ` ${sexSym(m.sex)}`;
  if (m.repCount > 1) s += ` (rep ${m.repIndex})`;
  return s;
}

function groupLabelFor(members, merged) {
  const m0 = members[0];
  let s = `${m0.tissue}, ${STAGES[m0.stage].label}`;
  if (m0.timeCourse && m0.day != null) s += `, day ${m0.day}`;
  if (!merged && m0.sex) s += ` ${sexSym(m0.sex)}`;
  return s;
}

// Recompute the TPM table + chart from currentTPM and the control state.
function renderExpression() {
  if (!currentTPM) return;
  const stageSel = $("fStage").value;
  const tissueSel = $("fTissue").value;
  const collapse = $("cCollapse").checked;
  const mergeSex = collapse && $("cMergeSex").checked;

  // "merge sexes" only means something when collapsing
  $("cMergeSex").disabled = !collapse;
  $("mergeWrap").classList.toggle("disabled", !collapse);
  $("tpmValHead").textContent = collapse ? "Mean TPM" : "TPM";

  const sel = SAMPLE_META.filter((m) => {
    if (tissueSel !== "all" && m.tissue !== tissueSel) return false;
    if (stageSel === "all") return true;
    if (stageSel === "immature") return m.stageClass === "immature";
    return m.stage === stageSel;
  });

  let rows;
  if (!collapse) {
    rows = sel.map((m) => ({ label: sampleLabel(m), value: currentTPM[m.i], sem: null, n: 1 }));
  } else {
    const groups = new Map();
    for (const m of sel) {
      const key = mergeSex ? m.mergeGroup : m.repGroup;
      (groups.get(key) || groups.set(key, []).get(key)).push(m);
    }
    rows = [...groups.values()].map((members) => {
      const vals = members.map((m) => currentTPM[m.i]).filter((v) => v != null && !Number.isNaN(v));
      const n = vals.length;
      const mean = n ? vals.reduce((a, b) => a + b, 0) / n : null;
      let sem = null;
      if (n >= 2) {
        const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
        sem = sd / Math.sqrt(n);
      }
      return {
        label: groupLabelFor(members, mergeSex), value: mean, sem, n,
        order: Math.min(...members.map((x) => x.i)),
      };
    });
    rows.sort((a, b) => a.order - b.order);
  }

  if (rows.length === 0) {
    $("tpmBody").innerHTML =
      `<tr><td colspan="2" class="s" style="color:var(--faint)">No samples match this stage + tissue.</td></tr>`;
    if (chart) { chart.destroy(); chart = null; }
    return;
  }
  updateTpmTable(rows, collapse);
  drawChart(rows);
}

function updateTpmTable(rows, collapse) {
  $("tpmBody").innerHTML = rows.map((r) => {
    let v;
    if (r.value == null || Number.isNaN(r.value)) v = "—";
    else if (r.sem != null) v = `${r.value.toFixed(2)} <span class="pm">± ${r.sem.toFixed(2)}</span>`;
    else v = r.value.toFixed(2);
    const nTag = collapse && r.n > 1 ? ` <span class="ntag">n=${r.n}</span>` : "";
    return `<tr><td class="s">${esc(r.label)}${nTag}</td><td class="v">${v}</td></tr>`;
  }).join("");
}

// ── chart ───────────────────────────────────────────────────────────────────
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

// Custom plugin: draw SEM whiskers (Chart.js has no native error bars). Lower
// cap is clamped at 0 so it never dips below the zero baseline.
function errorBarPlugin(sems) {
  return {
    id: "errorbars",
    afterDatasetsDraw(ch) {
      const { ctx, scales: { y } } = ch;
      const data = ch.data.datasets[0].data;
      ctx.save();
      ctx.strokeStyle = css("--muted");
      ctx.lineWidth = 1.25;
      ch.getDatasetMeta(0).data.forEach((bar, i) => {
        const sem = sems[i], val = data[i];
        if (sem == null || !(sem > 0) || val == null) return;
        const x = bar.x;
        const yTop = y.getPixelForValue(val + sem);
        const yBot = y.getPixelForValue(Math.max(0, val - sem));
        const cap = Math.min(4, Math.max(2, bar.width * 0.2));
        ctx.beginPath();
        ctx.moveTo(x, yTop); ctx.lineTo(x, yBot);
        ctx.moveTo(x - cap, yTop); ctx.lineTo(x + cap, yTop);
        ctx.moveTo(x - cap, yBot); ctx.lineTo(x + cap, yBot);
        ctx.stroke();
      });
      ctx.restore();
    },
  };
}

function drawChart(rows) {
  const ctx = $("chart").getContext("2d");
  if (chart) chart.destroy();
  const sems = rows.map((r) => r.sem);
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: rows.map((r) => r.label),
      datasets: [{
        data: rows.map((r) => (r.value == null ? 0 : r.value)),
        backgroundColor: css("--accent"),
        borderWidth: 0,
        borderRadius: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0].label,
            label: (c) => {
              const s = sems[c.dataIndex];
              return ` ${c.parsed.y.toFixed(2)}${s != null ? " ± " + s.toFixed(2) : ""} TPM`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: css("--faint"), font: { family: css("--mono"), size: 9 },
            maxRotation: 90, minRotation: 90,
            callback: function (v) {
              const lab = this.getLabelForValue(v);
              return lab.length > 26 ? lab.slice(0, 25) + "…" : lab;
            },
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: css("--faint"), font: { family: css("--mono"), size: 10 } },
          grid: { color: css("--line") },
          title: { display: true, text: "TPM", color: css("--muted"), font: { family: css("--mono"), size: 10 } },
        },
      },
    },
    plugins: [errorBarPlugin(sems)],
  });
}

// ── small UI helpers ────────────────────────────────────────────────────────
function setStatus(msg, isErr = false) {
  const el = $("status");
  el.textContent = msg;
  el.classList.toggle("err", isErr);
}
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

// ── boot ────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const n = await initDB();
    setStatus(`Ready — ${n.toLocaleString()} genes indexed.`);
    $("q").disabled = false;
    $("go").disabled = false;
    $("go").addEventListener("click", search);
    $("q").addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });
    ["fStage", "fTissue", "cCollapse", "cMergeSex"].forEach((id) =>
      $(id).addEventListener("change", renderExpression));
    $("q").focus();
  } catch (err) {
    console.error(err);
    setStatus("Failed to load query engine: " + err.message, true);
  }
})();
