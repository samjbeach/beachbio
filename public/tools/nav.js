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
      transition: width .2s ease, border-color .2s ease;
    }

    body {
      margin-left: var(--nav-w) !important;
      transition: margin-left .2s ease;
    }

    /* collapsed state */
    #tool-nav.collapsed {
      width: 36px;
      overflow: hidden;
    }
    #tool-nav.collapsed ~ body,
    body.nav-collapsed {
      margin-left: 36px !important;
    }

    #tool-nav .nav-header {
      padding: 18px 14px 12px;
      border-bottom: 1px solid var(--nav-border);
      flex-shrink: 0;
      min-width: var(--nav-w);
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
      min-width: var(--nav-w);
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

    /* toggle button — sits at the bottom of the sidebar */
    #nav-toggle {
      position: fixed;
      bottom: 14px;
      left: 0;
      width: var(--nav-w);
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 0 14px;
      background: none;
      border: none;
      cursor: pointer;
      font-family: var(--nav-mono);
      font-size: 10.5px;
      color: #3d6a6e;
      transition: color .15s, width .2s ease;
      white-space: nowrap;
      z-index: 101;
    }
    #nav-toggle:hover { color: var(--nav-text); }

    #nav-toggle .toggle-icon {
      font-size: 13px;
      line-height: 1;
      flex-shrink: 0;
      transition: transform .2s ease;
    }

    /* collapsed: shrink button width to match rail, flip icon */
    #tool-nav.collapsed + #nav-toggle {
      width: 36px;
      padding: 0;
      justify-content: center;
    }
    #tool-nav.collapsed + #nav-toggle .toggle-icon {
      transform: rotate(180deg);
    }
    #tool-nav.collapsed + #nav-toggle .toggle-label {
      display: none;
    }

    /* collapse to top bar on small screens */
    @media (max-width: 700px) {
      #tool-nav {
        width: 100% !important;
        height: auto;
        position: sticky;
        border-right: none;
        border-bottom: 1px solid var(--nav-border);
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
        padding: 8px 12px;
        gap: 4px;
        overflow: visible;
      }
      #tool-nav .nav-header {
        padding: 0;
        border-bottom: none;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
        min-width: 0;
      }
      #tool-nav .nav-back { margin-bottom: 0; }
      #tool-nav .nav-title { display: none; }
      #tool-nav ul {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        margin: 0;
        padding: 0;
        min-width: 0;
      }
      body { margin-left: 0 !important; }
      #nav-toggle { display: none; }
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
      <a class="nav-back" href="/tools/">← tools</a>
      <p class="nav-title">tools</p>
    </div>
    <ul>${items}</ul>
  `;

  const toggle = document.createElement("button");
  toggle.id = "nav-toggle";
  toggle.setAttribute("aria-label", "Toggle sidebar");
  toggle.innerHTML = `<span class="toggle-icon">‹</span><span class="toggle-label">hide</span>`;

  document.body.insertBefore(nav, document.body.firstChild);
  nav.insertAdjacentElement("afterend", toggle);

  // ── Collapse logic ───────────────────────────────────────────────────────
  function setCollapsed(collapsed) {
    nav.classList.toggle("collapsed", collapsed);
    document.body.style.marginLeft = collapsed ? "36px" : "";
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }

  // restore saved state
  setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");

  toggle.addEventListener("click", () => {
    setCollapsed(!nav.classList.contains("collapsed"));
  });
})();
