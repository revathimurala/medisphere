const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", providerOnly: false },
  { key: "pipeline", label: "Data Pipeline", providerOnly: true },
  { key: "patients", label: "Patients", providerOnly: true },
  { key: "twin", label: "Digital Twin", providerOnly: false },
  { key: "validation", label: "System Compliance", providerOnly: true },
  { key: "audit", label: "Audit Log", providerOnly: true },
];

const INTELLIGENCE_ITEMS = [
  { key: "predictions", label: "Risk Predictions", tag: "AI" },
  { key: "careplans", label: "Care Protocols", tag: "Clinical" },
  { key: "reports", label: "Clinical Summary", tag: "Report" },
];

export default function Sidebar({ current, onSelect, role }) {
  const isProvider = role === "provider";
  const visibleNav = NAV_ITEMS.filter((item) => isProvider || !item.providerOnly);

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark">M</span>
        <div>
          <strong>MediSphere</strong>
          <small>{isProvider ? "Clinical Operations" : "Patient Portal"}</small>
        </div>
      </div>

      <div className="sidebar__section-label">Main</div>
      <nav className="sidebar__nav">
        {visibleNav.map((item) => (
          <button
            key={item.key}
            className={`sidebar__link ${current === item.key ? "is-active" : ""}`}
            onClick={() => onSelect(item.key)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__section-label">Clinical Intelligence</div>
      <nav className="sidebar__nav">
        {INTELLIGENCE_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sidebar__link ${current === item.key ? "is-active" : ""}`}
            onClick={() => onSelect(item.key)}
          >
            <span>{item.label}</span>
            <em>{item.tag}</em>
          </button>
        ))}
      </nav>

      <div className="sidebar__foundation">
        <strong>Clinical Data Engine</strong>
        <span>FHIR R4 · Kafka · MongoDB Atlas</span>
        <em>● Platform Active &amp; Synced</em>
      </div>
      <div className="sidebar__role">Signed in as {isProvider ? "Clinician" : "Patient"}</div>
    </aside>
  );
}
