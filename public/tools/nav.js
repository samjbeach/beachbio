(function () {
  // ── Tool registry ────────────────────────────────────────────────────────
  // Grouped by subfolder. To add a tool: drop it in /tools/<group>/<name>/,
  // then add a { label, path } entry to the matching group below. A group with
  // `heading: null` renders as the unlabelled /tools root — for tools that
  // don't belong in a subfolder.
  const GROUPS = [
    {
      heading: "modelling",
      tools: [
        { label: "Saponification timer",  path: "/tools/modelling/saponification-timer/" },
        { label: "BSF carotenoid flux",   path: "/tools/modelling/bsf-carotenoid-flux/" },
        { label: "MVA pathway notebook",  path: "/tools/modelling/mva-flux-model/" },
      ],
    },
    {
      heading: "HPLC",
      tools: [
        { label: "Standard prep", path: "/tools/hplc/standard-prep/" },
        { label: "Analysis",      path: "/tools/hplc/analysis/" },
      ],
    },
    {
      heading: "analytics",
      tools: [
        { label: "BSF expression lookup", path: "/tools/analytics/bsf-expression-lookup/" },
      ],
    },
    {
      heading: "reference",
      tools: [
        { label: "Style guide", path: "/tools/_template/" },
      ],
    },
  ];

  const COLLAPSED_KEY = "tool-nav-collapsed";

  // ── Styles ───────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --nav-w: 220px;
      --nav-bg: #0a1a1c;
      --nav-border: #1e3e42;
      --nav-text: #8fb0ae;
      --nav-active: #eaf2f1;
      --nav-accent: #f2674b;
      --nav-hover: #122729;
      --nav-mono: 'JetBrains Mono', 'Courier New', ui-monospace, monospace;
    }

    #tool-nav {
      position: fixed;
      top: 0; left: 0;
      width: var(--nav-w);
      height: 100dvh;
      background: var(--nav-bg);
      border-right: 1px solid var(--nav-border);
      display: flex;
      flex-direction: column;
      z-index: 100;
      overflow-y: auto;
      overscroll-behavior: contain;
      transform: translateX(0);
      transition: transform .2s ease;
    }

    body {
      margin-left: var(--nav-w);
      transition: margin-left .2s ease;
    }

    /* collapsed: slide the whole sidebar off-screen, content reclaims full width */
    body.nav-collapsed #tool-nav { transform: translateX(-100%); }
    body.nav-collapsed { margin-left: 0; }

    #tool-nav .nav-header {
      padding: 18px 14px 12px;
      border-bottom: 1px solid var(--nav-border);
      flex-shrink: 0;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    #tool-nav .nav-back {
      display: block;
      font-family: var(--nav-mono);
      font-size: 10.5px;
      color: var(--nav-text);
      text-decoration: none;
      letter-spacing: .05em;
      margin-bottom: 10px;
      transition: color .15s;
      white-space: nowrap;
    }
    #tool-nav .nav-back:hover { color: var(--nav-active); }

    #tool-nav .nav-title {
      font-family: var(--nav-mono);
      font-size: 10px;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: #3d6a6e;
      margin: 0;
      white-space: nowrap;
    }

    #tool-nav .nav-body {
      padding: 8px 8px 20px;
    }

    #tool-nav .nav-group { margin-top: 4px; }
    #tool-nav .nav-group + .nav-group { margin-top: 14px; }

    #tool-nav .nav-group-label {
      font-family: var(--nav-mono);
      font-size: 9.5px;
      letter-spacing: .2em;
      text-transform: uppercase;
      color: #3d6a6e;
      padding: 0 8px 6px;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #tool-nav .nav-group-label::after {
      content: "";
      flex: 1;
      height: 1px;
      background: var(--nav-border);
    }

    #tool-nav ul { list-style: none; margin: 0; padding: 0; }

    #tool-nav li a {
      display: block;
      font-family: var(--nav-mono);
      font-size: 11.5px;
      color: var(--nav-text);
      text-decoration: none;
      padding: 6px 8px;
      border-radius: 5px;
      line-height: 1.4;
      transition: background .12s, color .12s;
      white-space: nowrap;
    }
    #tool-nav li a:hover { background: var(--nav-hover); color: var(--nav-active); }

    #tool-nav li a.active {
      color: var(--nav-active);
      background: rgba(242,103,75,.1);
      border-left: 2px solid var(--nav-accent);
      padding-left: 6px;
    }

    /* close / open buttons */
    .nav-btn {
      background: none;
      border: 1px solid var(--nav-border);
      border-radius: 5px;
      color: var(--nav-text);
      cursor: pointer;
      font-family: var(--nav-mono);
      font-size: 14px;
      line-height: 1;
      padding: 3px 7px;
      transition: color .15s, border-color .15s, background .15s;
    }
    .nav-btn:hover { color: var(--nav-active); border-color: var(--nav-accent); background: var(--nav-hover); }

    #nav-open {
      position: fixed;
      top: 14px; left: 14px;
      z-index: 99;
      opacity: 0;
      pointer-events: none;
      transform: translateX(-8px);
      transition: opacity .2s ease, transform .2s ease;
      background: var(--nav-bg);
    }
    body.nav-collapsed #nav-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(0);
    }

    /* on small screens the sidebar is an off-canvas drawer that overlays the
       content (rather than pushing it). The same collapse logic slides it in
       and out, so it can be fully hidden — tap › to open, ‹ to close. */
    @media (max-width: 700px) {
      #tool-nav {
        width: min(264px, 80vw);
        box-shadow: 2px 0 18px rgba(0, 0, 0, .45);
      }
      body, body.nav-collapsed { margin-left: 0; }
      #nav-open { top: 12px; left: 12px; }
    }
  `;
  document.head.appendChild(style);

  // ── Markup ───────────────────────────────────────────────────────────────
  const current = location.pathname.replace(/\/?$/, "/");

  const groupsHtml = GROUPS.map(g => {
    const items = g.tools.map(t => {
      const active = current === t.path ? ' class="active"' : "";
      return `<li><a href="${t.path}"${active}>${t.label}</a></li>`;
    }).join("");
    const label = g.heading ? `<p class="nav-group-label">${g.heading}</p>` : "";
    return `<div class="nav-group">${label}<ul>${items}</ul></div>`;
  }).join("");

  const nav = document.createElement("nav");
  nav.id = "tool-nav";
  nav.setAttribute("aria-label", "Tools navigation");
  nav.innerHTML = `
    <div class="nav-header">
      <div>
        <a class="nav-back" href="/tools/">← tools</a>
        <p class="nav-title">tools</p>
      </div>
      <button class="nav-btn" id="nav-close" aria-label="Hide sidebar" title="Hide sidebar">‹</button>
    </div>
    <div class="nav-body">${groupsHtml}</div>
  `;

  const openBtn = document.createElement("button");
  openBtn.id = "nav-open";
  openBtn.className = "nav-btn";
  openBtn.setAttribute("aria-label", "Show sidebar");
  openBtn.title = "Show sidebar";
  openBtn.textContent = "›";

  document.body.insertBefore(nav, document.body.firstChild);
  document.body.appendChild(openBtn);

  // ── Collapse logic ───────────────────────────────────────────────────────
  function setCollapsed(collapsed) {
    document.body.classList.toggle("nav-collapsed", collapsed);
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }

  const stored = localStorage.getItem(COLLAPSED_KEY);
  // On narrow viewports (≤700px) the sidebar is an overlay drawer that covers
  // the tool, so always start it hidden on load — regardless of any saved
  // open/closed preference. Otherwise opening the drawer once would leave it
  // open across every subsequent tool, blocking the content. The saved
  // preference only governs wider screens, where the sidebar pushes content
  // aside instead of covering it. (Tapping › still opens the drawer for the
  // current page; it just won't persist across navigations.)
  const isNarrow = window.matchMedia("(max-width: 700px)").matches;
  if (isNarrow || stored === "1") {
    document.body.classList.add("nav-collapsed");
  }

  document.getElementById("nav-close").addEventListener("click", () => setCollapsed(true));
  openBtn.addEventListener("click", () => setCollapsed(false));
})();
