import { useState } from "react";
import { api } from "../api";

export default function PatientList({ patients, selectedId, onOpen, onSynced }) {
  const [syncingId, setSyncingId] = useState(null);
  const [message, setMessage] = useState("");

  const sync = async (patientId) => {
    setSyncingId(patientId);
    setMessage("");
    try {
      await api.syncFromFhir(patientId);
      setMessage(`${patientId} synced from FHIR.`);
      onSynced?.();
    } catch (e) {
      setMessage(e.response?.data?.message || `Sync failed for ${patientId}.`);
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <section className="panel patient-list">
      <div className="panel__head">
        <div>
          <h3>Patients</h3>
          <p>FHIR-registered patients and their twin status</p>
        </div>
      </div>

      <div className="table">
        <div className="table__row table__row--head">
          <span>Patient</span>
          <span>FHIR status</span>
          <span>Completeness</span>
          <span></span>
        </div>
        {patients.length === 0 && <div className="table__empty">No patient records are available yet.</div>}
        {patients.map((p) => (
          <div
            className={`table__row ${selectedId === p.id ? "is-selected" : ""}`}
            key={p.id}
            onClick={() => onOpen(p.id)}
          >
            <span>
              <b>{p.name || p.id}</b>
              <small>{p.id}</small>
            </span>
            <span className={p.twinReady ? "tag tag--ok" : "tag tag--muted"}>
              {p.twinReady ? "Synced" : "Not synced"}
            </span>
            <span>{p.completeness ?? 0}%</span>
            <span onClick={(e) => e.stopPropagation()}>
              <button className="btn btn--small" onClick={() => sync(p.id)} disabled={syncingId === p.id}>
                {syncingId === p.id ? "Syncing…" : "Sync from FHIR"}
              </button>
            </span>
          </div>
        ))}
      </div>
      {message && <div className="patient-list__message">{message}</div>}
    </section>
  );
}
