export default function TwinPanel({ twin }) {
  if (!twin) {
    return (
      <section className="panel twin-panel twin-panel--empty">
        Select a patient and sync them from FHIR to build their digital twin.
      </section>
    );
  }

  const conditions = (twin.conditions || [])
    .map((c) => c.code?.text || c.code?.coding?.[0]?.display)
    .filter(Boolean)
    .join(", ");

  const medications = (twin.medications || [])
    .map((m) => m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display)
    .filter(Boolean)
    .join(", ");

  const v = twin.latestVitals || {};
  const bp = v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "—";

  const labs = (twin.labResults || []).slice(0, 4);

  return (
    <section className="panel twin-panel">
      <div className="twin-panel__head">
        <div>
          <div className="twin-panel__eyebrow">Digital Health Twin</div>
          <h2>{twin.demographics?.name || twin.patientId}</h2>
          <p>
            FHIR Patient resource: {twin.fhirStatus === "Valid" ? "loaded from FHIR R4" : "not yet synced"}
          </p>
        </div>
        <span className={`tag ${twin.fhirStatus === "Valid" ? "tag--ok" : "tag--muted"}`}>
          {twin.fhirStatus || "Unknown"}
        </span>
      </div>

      <div className="twin-grid">
        <div className="twin-block">
          <h4>Demographics</h4>
          <p>
            {twin.demographics?.gender || "—"} · DOB {twin.demographics?.dob || "—"}
          </p>
        </div>
        <div className="twin-block">
          <h4>Conditions</h4>
          <p>{conditions || "None on file"}</p>
        </div>
        <div className="twin-block">
          <h4>Vitals stream</h4>
          <p>
            HR {v.heartRate ?? "—"} bpm · BP {bp} mmHg · SpO₂ {v.spo2 ?? "—"}%
          </p>
        </div>
        <div className="twin-block">
          <h4>Lab results</h4>
          {labs.length ? (
            <ul className="twin-labs">
              {labs.map((l) => (
                <li key={l.fhirId}>
                  <span>{l.code}</span>
                  <b>
                    {l.value ?? "—"} {l.unit || ""}
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <p>No lab observations yet</p>
          )}
        </div>
        <div className="twin-block">
          <h4>Active medications</h4>
          <p>{medications || "None on file"}</p>
        </div>
      </div>

      <div className="twin-panel__footer">
        <span>
          Completeness: <b>{twin.completeness ?? 0}%</b>
        </span>
        <span>
          Last updated: <b>{twin.lastUpdated ? new Date(twin.lastUpdated).toLocaleString() : "—"}</b>
        </span>
      </div>
    </section>
  );
}
