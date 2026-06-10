const administrationAreas = [
  {
    description: "Manage platform-wide controls and operational defaults.",
    label: "Platform administration",
    signal: "Platform",
  },
  {
    description: "Review tenants, lifecycle state, and administrative access.",
    label: "Tenant administration",
    signal: "Tenants",
  },
  {
    description: "Configure organization structure and operating boundaries.",
    label: "Organization setup",
    signal: "Organizations",
  },
  {
    description: "Control installed modules and platform capabilities.",
    label: "Module management",
    signal: "Modules",
  },
  {
    description: "Review identity, authorization, and policy posture.",
    label: "Security center",
    signal: "Security",
  },
  {
    description: "Inspect governed activity and administrative changes.",
    label: "Audit center",
    signal: "Audit",
  },
  {
    description: "Manage shared platform defaults and operational preferences.",
    label: "System settings",
    signal: "Settings",
  },
] as const;

const readinessItems = [
  "Identity and access controls",
  "Organization configuration",
  "Module governance",
  "Audit and security review",
] as const;

export default function AdminHomePage() {
  return (
    <div className="admin-frame">
      <aside className="sidebar" aria-label="Administration navigation">
        <a className="brand" href="/" aria-label="Tnvios administration home">
          <span aria-hidden="true" className="brand-mark">
            T
          </span>
          <span>
            Tnvios
            <small>Administration</small>
          </span>
        </a>

        <nav aria-label="Admin sections">
          <a aria-current="page" href="#overview">
            Overview
          </a>
          <a href="#administration">Administration</a>
          <a href="#readiness">System readiness</a>
        </nav>

        <p className="sidebar-note">Access will be governed by platform permissions.</p>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Control center</p>
            <span>Administration shell</span>
          </div>
          <span className="environment-badge">Foundation</span>
        </header>

        <main id="main-content">
          <section className="overview" id="overview" aria-labelledby="overview-title">
            <div>
              <p className="eyebrow">Governed administration</p>
              <h1 id="overview-title">Configure the platform with clarity and control.</h1>
              <p className="overview-copy">
                The Tnvios administration center brings platform setup, security, and governance
                into one permission-aware workspace.
              </p>
            </div>
            <div className="status-panel" aria-label="Shell status">
              <span>Admin shell</span>
              <strong>Ready</strong>
              <p>Prepared for identity, organization, permissions, and audit engines.</p>
            </div>
          </section>

          <section
            className="administration-section"
            id="administration"
            aria-labelledby="administration-title"
          >
            <div className="section-heading">
              <p className="eyebrow">Administrative domains</p>
              <h2 id="administration-title">One control surface for platform operations.</h2>
            </div>
            <div className="admin-grid">
              {administrationAreas.map((area) => (
                <article className="admin-card" key={area.label}>
                  <span>{area.signal}</span>
                  <h3>{area.label}</h3>
                  <p>{area.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="readiness-section" id="readiness" aria-labelledby="readiness-title">
            <div>
              <p className="eyebrow">Platform readiness</p>
              <h2 id="readiness-title">Built for deliberate configuration.</h2>
            </div>
            <ol>
              {readinessItems.map((item, index) => (
                <li key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ol>
          </section>
        </main>

        <footer>
          <span>Tnvios administration</span>
          <span>Shell ready for platform engines</span>
        </footer>
      </div>
    </div>
  );
}
