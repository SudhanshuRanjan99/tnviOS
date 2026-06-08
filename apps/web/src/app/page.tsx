const workspaceAreas = [
  {
    description: "Your daily work, approvals, and team activity will appear here.",
    label: "Employee workspace",
  },
  {
    description: "Team health, decisions, and operational priorities in one place.",
    label: "Manager workspace",
  },
  {
    description: "Organization performance and cross-functional insights.",
    label: "Executive workspace",
  },
] as const;

const portalAreas = ["Customer portal", "Vendor portal", "Partner portal"] as const;

export default function HomePage() {
  return (
    <div className="app-frame">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Tnvios home">
          <span aria-hidden="true" className="brand-mark">
            T
          </span>
          <span>Tnvios</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workspaces">Workspaces</a>
          <a href="#portals">Portals</a>
        </nav>
        <span className="shell-status">Foundation shell</span>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">One operating system for your organization</p>
          <h1 id="hero-title">Work moves better when context stays connected.</h1>
          <p className="hero-copy">
            Tnvios brings people, operations, and customer work into a governed, permission-aware
            workspace.
          </p>
          <a className="primary-action" href="#workspaces">
            Explore workspaces
          </a>
        </section>

        <section className="content-section" id="workspaces" aria-labelledby="workspaces-title">
          <div className="section-heading">
            <p className="eyebrow">Built around how teams work</p>
            <h2 id="workspaces-title">Role-aware workspaces</h2>
          </div>
          <div className="card-grid">
            {workspaceAreas.map((area) => (
              <article className="workspace-card" key={area.label}>
                <h3>{area.label}</h3>
                <p>{area.description}</p>
                <span>Coming in platform modules</span>
              </article>
            ))}
          </div>
        </section>

        <section className="portal-section" id="portals" aria-labelledby="portals-title">
          <div>
            <p className="eyebrow">Connected beyond your team</p>
            <h2 id="portals-title">A consistent experience for every relationship.</h2>
          </div>
          <ul>
            {portalAreas.map((portal) => (
              <li key={portal}>{portal}</li>
            ))}
          </ul>
        </section>
      </main>

      <footer>
        <span>Tnvios web workspace</span>
        <span>Shell ready for platform modules</span>
      </footer>
    </div>
  );
}
