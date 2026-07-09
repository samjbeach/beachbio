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

// Hook for a FUTURE enhancement (paper Table 4): mapping each sample to a
// tissue / stage / sex group for averaging. Intentionally NOT implemented —
// wire up a { sample: group } map here and group the TPM table/chart by it.
// const SAMPLE_GROUPS = { /* FG1: "larval foregut", ... */ };

const PARQUET = "data.parquet";
const $ = (id) => document.getElementById(id);

let conn = null;      // DuckDB connection
let chart = null;     // Chart.js instance

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

  // TPM table (gene-level; identical across isoforms → use first row)
  const tpm = toNums(g.tpm);
  $("tpmBody").innerHTML = SAMPLES.map((s, i) => {
    const v = tpm[i];
    return `<tr><td class="s">${esc(s)}</td><td class="v">${
      v == null || Number.isNaN(v) ? "—" : v.toFixed(2)
    }</td></tr>`;
  }).join("");

  drawChart(tpm);
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

// ── chart ───────────────────────────────────────────────────────────────────
function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }

function drawChart(tpm) {
  const ctx = $("chart").getContext("2d");
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: SAMPLES,
      datasets: [{
        data: SAMPLES.map((_, i) => (tpm[i] == null ? 0 : tpm[i])),
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
          callbacks: { label: (c) => ` ${c.parsed.y.toFixed(2)} TPM` },
        },
      },
      scales: {
        x: {
          ticks: { color: css("--faint"), font: { family: css("--mono"), size: 9 }, maxRotation: 90, minRotation: 90 },
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
    $("q").focus();
  } catch (err) {
    console.error(err);
    setStatus("Failed to load query engine: " + err.message, true);
  }
})();
