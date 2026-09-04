import { useEffect, useState } from "react";
import { api } from "../api";

export default function TimelineModal({ patientId, patientName, onClose }) {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    api.getTimeline(patientId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  const filtered = events.filter(e => filter === "all" || e.type === filter);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--large" onClick={e => e.stopPropagation()}>
        <div className="modal-card__head">
          <div>
            <h3>Clinical Event Timeline</h3>
            <p>Chronological vitals, labs, diagnoses, and prescriptions for {patientName || patientId}</p>
          </div>
          <button className="btn btn--small" onClick={onClose}>✕ Close</button>
        </div>

        <div className="timeline-filters">
          <button className={`tab-btn ${filter === "all" ? "is-active" : ""}`} onClick={() => setFilter("all")}>All Events ({events.length})</button>
          <button className={`tab-btn ${filter === "vitals" ? "is-active" : ""}`} onClick={() => setFilter("vitals")}>Wearable Vitals ({events.filter(e => e.type === "vitals").length})</button>
          <button className={`tab-btn ${filter === "lab" ? "is-active" : ""}`} onClick={() => setFilter("lab")}>Lab Results ({events.filter(e => e.type === "lab").length})</button>
          <button className={`tab-btn ${filter === "condition" ? "is-active" : ""}`} onClick={() => setFilter("condition")}>Conditions ({events.filter(e => e.type === "condition").length})</button>
          <button className={`tab-btn ${filter === "medication" ? "is-active" : ""}`} onClick={() => setFilter("medication")}>Medications ({events.filter(e => e.type === "medication").length})</button>
        </div>

        <div className="timeline-list">
          {loading && <div className="timeline-empty">Loading chronological events…</div>}
          {!loading && filtered.length === 0 && <div className="timeline-empty">No clinical events recorded for this filter.</div>}
          {!loading && filtered.map((e, idx) => (
            <div key={idx} className={`timeline-item timeline-item--${e.type}`}>
              <div className="timeline-item__badge">{e.type.toUpperCase()}</div>
              <div className="timeline-item__content">
                <strong>{e.label}</strong>
                <span>{e.detail || (e.data ? JSON.stringify(e.data) : "")}</span>
                <small>{e.timestamp ? new Date(e.timestamp).toLocaleString() : "Date not specified"}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
