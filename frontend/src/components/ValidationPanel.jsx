const LABELS = {
  fhirResourceValidation: "FHIR resource validation",
  hipaaAuditLogging: "HIPAA audit logging",
  twinCompleteness: "Twin completeness (>95%)",
  vitalsRangeValidation: "Vitals range validation",
  rbac: "RBAC by provider/patient",
};

function detailFor(key, v) {
  switch (key) {
    case "fhirResourceValidation":
      return `${v.total} resources checked, ${v.invalid} invalid`;
    case "hipaaAuditLogging":
      return `${v.events} events logged`;
    case "twinCompleteness":
      return `${v.average}% average (requires ${v.requirement})`;
    case "vitalsRangeValidation":
      return `${v.checked} readings checked, ${v.invalid} out of range`;
    case "rbac":
      return `provider: ${v.provider}, patient: ${v.patient}`;
    default:
      return "";
  }
}

export default function ValidationPanel({ data }) {
  if (!data) {
    return <section className="panel validation-panel validation-panel--empty">Loading validation checks…</section>;
  }

  return (
    <section className="panel validation-panel">
      <div className="panel__head">
        <div>
          <h3>Milestone 1 validation</h3>
          <p>Required foundation checks from the project specification</p>
        </div>
      </div>
      <div className="validation-grid">
        {Object.entries(data).map(([key, v]) => (
          <div className="validation-item" key={key}>
            <div className={v.status === "PASS" ? "validation-item__mark is-pass" : "validation-item__mark is-review"}>
              {v.status === "PASS" ? "✓" : "!"}
            </div>
            <div>
              <b>{LABELS[key] || key}</b>
              <small>{detailFor(key, v)}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
