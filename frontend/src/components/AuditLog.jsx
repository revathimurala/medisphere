import { useEffect, useState } from "react";
import { api } from "../api";

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getAuditLog().then(setRows).catch((e) => setError(e.response?.data?.message || "Could not load audit log"));
  }, []);

  return (
    <section className="panel audit-panel">
      <div className="panel__head">
        <div>
          <h3>HIPAA audit trail</h3>
          <p>Every collection, FHIR/Kafka event, and twin view is logged</p>
        </div>
      </div>
      {error && <div className="audit-panel__error">{error}</div>}
      <div className="table">
        <div className="table__row table__row--head">
          <span>When</span>
          <span>Actor</span>
          <span>Action</span>
          <span>Patient</span>
          <span>Result</span>
        </div>
        {rows.length === 0 && !error && <div className="table__empty">No audit events yet.</div>}
        {rows.map((r) => (
          <div className="table__row" key={r._id}>
            <span>{new Date(r.timestamp).toLocaleString()}</span>
            <span>{r.actor}</span>
            <span>{r.action}</span>
            <span>{r.patientId || "—"}</span>
            <b>{r.result}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
