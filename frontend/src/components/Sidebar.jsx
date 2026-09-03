const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", providerOnly: false },
  { key: "patients", label: "Patients", providerOnly: true },
  { key: "twin", label: "Digital Twin", providerOnly: false },
  { key: "validation", label: "Validation", providerOnly: false },
  { key: "audit", label: "Audit Log", providerOnly: true },
];

const FUTURE_ITEMS = [
  { key: "predictions", label: "Predictions", milestone: 2 },
  { key: "alerts", label: "Alerts", milestone: 3 },
  { key: "careplans", label: "Careplans", milestone: 4 },
  { key: "reports", label: "Reports", milestone: 4 },
];

export default function Sidebar({ current, onSelect, role }) {
  const isProvider = role === "provider";

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark">M</span>
        <div>
          <strong>MediSphere</strong>
          <small>Cognitive Twin</small>
        </div>
      </div>

      <div className="sidebar__section-label">Main</div>
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const enabled = isProvider || !item.providerOnly;
          return (
            <button
              key={item.key}
              className={`sidebar__link ${current === item.key ? "is-active" : ""} ${
                !enabled ? "is-disabled" : ""
              }`}
              disabled={!enabled}
              onClick={() => enabled && onSelect(item.key)}
              title={!enabled ? "Provider accounts only (RBAC)" : undefined}
            >
              <span>{item.label}</span>
              {!enabled && <em>RBAC</em>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar__section-label">Later milestones</div>
      <nav className="sidebar__nav">
        {FUTURE_ITEMS.map((item) => (
          <button key={item.key} className="sidebar__link is-disabled" disabled title={`Ships in Milestone ${item.milestone}`}>
            <span>{item.label}</span>
            <em>M{item.milestone}</em>
          </button>
        ))}
      </nav>

      <div className="sidebar__foundation">
        <strong>Data foundation</strong>
        <span>FHIR R4 · Kafka · MongoDB</span>
        <em>● Milestone 1 of 4</em>
      </div>
      <div className="sidebar__role">Signed in as {isProvider ? "Clinician" : "Patient"}</div>
    </aside>
  );
}
