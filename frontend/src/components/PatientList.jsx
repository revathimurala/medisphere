import { useState } from "react";
import { api } from "../api";

export default function PatientList({
  patients = [],
  selectedId,
  onOpen,
  onOpenTwin,
  onOpenPredictions,
  onSynced
}) {
  const [syncingId, setSyncingId] = useState(null);
  const [message, setMessage] = useState("");
  const [filterRisk, setFilterRisk] = useState("all"); // "all" | "high" | "moderate" | "low"
  const [searchQuery, setSearchQuery] = useState("");

  const sync = async (patientId) => {
    setSyncingId(patientId);
    setMessage("");
    try {
      await api.syncFromFhir(patientId);
      setMessage(`✓ ${patientId} successfully synced from FHIR.`);
      onSynced?.();
    } catch (e) {
      setMessage(e.response?.data?.message || `Sync failed for ${patientId}.`);
    } finally {
      setSyncingId(null);
    }
  };

  // Counts for quick filter pills
  const highRiskCount = patients.filter((p) => (p.riskCategory || "").toLowerCase().includes("high") || (p.riskScore || 0) >= 20).length;
  const modRiskCount = patients.filter((p) => (p.riskCategory || "").toLowerCase().includes("moderate") || ((p.riskScore || 0) >= 12 && (p.riskScore || 0) < 20)).length;
  const lowRiskCount = patients.filter((p) => (p.riskCategory || "").toLowerCase().includes("low") || (p.riskScore || 0) < 12).length;

  // Filter and search
  const filteredPatients = patients.filter((p) => {
    const isHigh = (p.riskCategory || "").toLowerCase().includes("high") || (p.riskScore || 0) >= 20;
    const isMod = (p.riskCategory || "").toLowerCase().includes("moderate") || ((p.riskScore || 0) >= 12 && (p.riskScore || 0) < 20);
    const isLow = (p.riskCategory || "").toLowerCase().includes("low") || (p.riskScore || 0) < 12;

    if (filterRisk === "high" && !isHigh) return false;
    if (filterRisk === "moderate" && !isMod) return false;
    if (filterRisk === "low" && !isLow) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.name || "").toLowerCase().includes(q);
      const matchId = (p.id || "").toLowerCase().includes(q);
      if (!matchName && !matchId) return false;
    }
    return true;
  });

  return (
    <section className="panel patient-list">
      <div className="panel__head" style={{ flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h3>Clinical Patient Roster &amp; Risk Stratification</h3>
          <p>Real-time cohort surveillance — identify high-risk cardiovascular patients requiring immediate clinical action</p>
        </div>

        {/* Search Bar */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Search by name or ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "12.5px",
              minWidth: "180px"
            }}
          />
        </div>
      </div>

      {/* Risk Filter Bar */}
      <div className="patient-risk-filter-bar">
        <button
          className={`risk-filter-btn ${filterRisk === "all" ? "is-active" : ""}`}
          onClick={() => setFilterRisk("all")}
        >
          All Patients ({patients.length})
        </button>
        <button
          className={`risk-filter-btn risk-filter-btn--high ${filterRisk === "high" ? "is-active" : ""}`}
          onClick={() => setFilterRisk("high")}
        >
          🚨 High Risk ({highRiskCount})
        </button>
        <button
          className={`risk-filter-btn risk-filter-btn--mod ${filterRisk === "moderate" ? "is-active" : ""}`}
          onClick={() => setFilterRisk("moderate")}
        >
          ⚠️ Moderate Risk ({modRiskCount})
        </button>
        <button
          className={`risk-filter-btn risk-filter-btn--low ${filterRisk === "low" ? "is-active" : ""}`}
          onClick={() => setFilterRisk("low")}
        >
          ✓ Low Risk ({lowRiskCount})
        </button>
      </div>

      <div className="table" style={{ marginTop: "12px" }}>
        <div className="table__row table__row--head">
          <span style={{ flex: 1.5 }}>Patient</span>
          <span style={{ flex: 1.2 }}>AI CVD 10-Yr Risk</span>
          <span style={{ flex: 1.8 }}>Clinical Action Guidance</span>
          <span style={{ flex: 1 }}>Twin Coverage</span>
          <span style={{ flex: 1.6, textAlign: "right" }}>Actions</span>
        </div>

        {filteredPatients.length === 0 && (
          <div className="table__empty">No patients match the selected filter criteria.</div>
        )}

        {filteredPatients.map((p) => {
          const isHigh = (p.riskCategory || "").toLowerCase().includes("high") || (p.riskScore || 0) >= 20;
          const isMod = (p.riskCategory || "").toLowerCase().includes("moderate") || ((p.riskScore || 0) >= 12 && (p.riskScore || 0) < 20);

          let badgeClass = "badge-risk--low";
          let categoryLabel = p.riskCategory || "Low Risk";
          if (isHigh) {
            badgeClass = "badge-risk--high";
            categoryLabel = "High Risk";
          } else if (isMod) {
            badgeClass = "badge-risk--mod";
            categoryLabel = "Moderate Risk";
          }

          return (
            <div
              className={`table__row ${selectedId === p.id ? "is-selected" : ""} ${isHigh ? "row-high-risk" : ""}`}
              key={p.id}
              onClick={() => onOpen(p.id)}
              style={{ cursor: "pointer" }}
            >
              <span style={{ flex: 1.5 }}>
                <b style={{ fontSize: "13.5px" }}>{p.name || p.id}</b>
                <small>{p.id} {p.birthDate ? `· ${p.birthDate}` : ""}</small>
              </span>

              <span style={{ flex: 1.2 }}>
                <span className={`badge-risk ${badgeClass}`}>
                  <b>{p.riskPercentage || `${p.riskScore || 12}%`}</b> {categoryLabel}
                </span>
              </span>

              <span style={{ flex: 1.8, fontSize: "12px", color: isHigh ? "#991b1b" : "var(--text-muted)", fontWeight: isHigh ? "600" : "400" }}>
                {p.recommendation || (isHigh ? "Intensify statin, BP target <130/80" : "Routine surveillance")}
              </span>

              <span style={{ flex: 1 }}>
                <span className={p.twinReady ? "tag tag--ok" : "tag tag--muted"}>
                  {p.twinReady ? `${p.completeness ?? 100}% Synced` : "Not synced"}
                </span>
              </span>

              <span style={{ flex: 1.6, display: "flex", justifyContent: "flex-end", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn--small btn--action-risk"
                  title="Open AI Risk Prediction & SHAP explainability engine"
                  onClick={() => onOpenPredictions ? onOpenPredictions(p.id) : onOpen(p.id)}
                >
                  ⚡ Risk AI
                </button>
                <button
                  className="btn btn--small"
                  title="Open Digital Health Twin 3D View"
                  onClick={() => onOpenTwin ? onOpenTwin(p.id) : onOpen(p.id)}
                >
                  Twin
                </button>
                <button
                  className="btn btn--small btn--sync"
                  title="Sync patient data from FHIR R4 store"
                  onClick={() => sync(p.id)}
                  disabled={syncingId === p.id}
                >
                  {syncingId === p.id ? "…" : "Sync"}
                </button>
              </span>
            </div>
          );
        })}
      </div>

      {message && <div className="patient-list__message">{message}</div>}
    </section>
  );
}
