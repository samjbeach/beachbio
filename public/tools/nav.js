(function () {
  // ── Tool registry ────────────────────────────────────────────────────────
  // Add an entry here whenever a new tool lands in /tools/.
  const TOOLS = [
    { label: "BSF saponification timer", path: "/tools/saponification-timer/" },
    { label: "hello (test)",             path: "/tools/hello/" },
  ];

  const COLLAPSED_KEY = "tool-nav-collapsed";

  // ── Styles ───────────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --nav-w: 210px;
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
    body.nav-collapsed #tool-nav {
      transform: translateX(-100%);
    }
    body.nav-collapsed {
      margin-left: 0;
    }

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

    #tool-nav ul {
      list-style: none;
      margin: 10px 0 0;
      padding: 0 8px 20px;
    }

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

    #tool-nav li a:hover {
      background: var(--nav-hover);
      color: var(--nav-active);
    }

    #tool-nav li a.active {
      color: var(--nav-active);
      background: rgba(242,103,75,.1);
      border-left: 2px solid var(--nav-accent);
      padding-left: 6px;
    }

    /* close (collapse) button inside the sidebar header */
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
    .nav-btn:hover {
      color: var(--nav-active);
      border-color: var(--nav-accent);
      background: var(--nav-hover);
    }

    /* floating "open" button — only visible when collapsed */
    #nav-open {
      position: fixed;
      top: 14px;
      left: 14px;
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

    /* collapse to top bar on small screens — toggle hidden, always shown */
    @media (max-width: 700px) {
      #tool-nav {
        width: 100%;
        height: auto;
        position: sticky;
        border-right: none;
        border-bottom: 1px solid var(--nav-border);
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        padding: 8px 12px;
        gap: 4px;
        transform: none !important;
      }
      #tool-nav .nav-header {
        padding: 0;
        border-bottom: none;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
      }
      #tool-nav .nav-back { margin-bottom: 0; }
      #tool-nav .nav-title { display: none; }
      #tool-nav .nav-btn { display: none; }
      #tool-nav ul {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        margin: 0;
        padding: 0;
      }
      body, body.nav-collapsed { margin-left: 0; }
      #nav-open { display: none; }
    }
  `;
  document.head.appendChild(style);

  // ── Markup ───────────────────────────────────────────────────────────────
  const current = location.pathname.replace(/\/?$/, "/");

  const items = TOOLS.map(t => {
    const active = current === t.path ? ' class="active"' : "";
    return `<li><a href="${t.path}"${active}>${t.label}</a></li>`;
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
    <ul>${items}</ul>
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

  // restore saved state (no transition flash on load)
  if (localStorage.getItem(COLLAPSED_KEY) === "1") {
    document.body.classList.add("nav-collapsed");
  }

  document.getElementById("nav-close").addEventListener("click", () => setCollapsed(true));
  openBtn.addEventListener("click", () => setCollapsed(false));
})();
