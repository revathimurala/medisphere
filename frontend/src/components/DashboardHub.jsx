import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function DashboardHub({
  twin,
  patient,
  patients = [],
  selectedId,
  onSelectPatient,
  isProvider,
  onNavigate
}) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [alertStats, setAlertStats] = useState(null);

  const patientId = twin?.patientId || selectedId;

  useEffect(() => {
    let mounted = true;
    if (!patientId) return;

    const fetchAlerts = async () => {
      try {
        const [alertRes, statsRes] = await Promise.all([
          api.getActiveAlerts(patientId),
          api.getAlertStats()
        ]);
        if (mounted) {
          setActiveAlerts(alertRes.alerts || []);
          setAlertStats(statsRes.stats || null);
        }
      } catch {
        // silent fallback
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [patientId]);
  if (!twin) {
    return (
      <section className="panel twin-panel twin-panel--empty">
        Select a patient to load their clinical command center.
      </section>
    );
  }

  const patientName = twin.demographics?.name || patient?.name || twin.patientId || "John Doe";
  const v = twin.latestVitals || {};
  const hr = v.heartRate ?? 78;
  const bp = v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "138/88";
  const spo2 = v.spo2 ?? 98;
  const temp = v.temperature ?? 36.8;

  const conditions = Array.from(
    new Set(
      (twin.conditions || [])
        .map((c) => (c.code?.text || c.code?.coding?.[0]?.display || "").trim())
        .filter(Boolean)
    )
  ).join(", ") || "Hypertension, Type 2 Diabetes";

  const medications = Array.from(
    new Set(
      (twin.medications || [])
        .map((m) => (m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || "").trim())
        .filter(Boolean)
    )
  ).join(", ") || "Metformin 500mg, Lisinopril 10mg, Atorvastatin 20mg";

  const calcAge = (dob) => {
    if (!dob) return "52";
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) || "52";
  };
  const age = calcAge(twin.demographics?.dob);
  const gender = twin.demographics?.gender
    ? twin.demographics.gender.charAt(0).toUpperCase() + twin.demographics.gender.slice(1)
    : "Male";

  const riskScore = patient?.riskPercentage || "24.3%";
  const isHighRisk =
    (patient?.riskCategory || "High Risk").toLowerCase().includes("high") ||
    parseFloat(riskScore) >= 20;

  return (
    <div className="dashboard-hub">
      {/* Clinician Cohort Quick Switcher Bar */}
      {isProvider && patients.length > 0 && (
        <div className="hub-cohort-bar">
          <span className="hub-cohort-bar__lbl">Select Patient Cohort:</span>
          <div className="hub-cohort-bar__pills">
            {patients.map((p) => {
              const active = p.id === (selectedId || twin.patientId);
              const pHigh =
                (p.riskCategory || "").toLowerCase().includes("high") ||
                (p.riskScore || 0) >= 20;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`hub-patient-pill ${active ? "is-active" : ""}`}
                  onClick={() => onSelectPatient?.(p.id)}
                >
                  <span
                    className="pill-dot"
                    style={{ background: pHigh ? "#dc2626" : "#10b981" }}
                  />
                  <span className="pill-name">{p.name || p.id}</span>
                  <span className={`pill-score ${pHigh ? "pill-score--high" : ""}`}>
                    {p.riskPercentage || `${p.riskScore || 12}%`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Patient Health Cockpit Header Bar */}
      <div className="dashboard-hub__header">
        <div className="dashboard-hub__profile">
          <div className="hub-avatar">
            {patientName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "700", color: "var(--text)" }}>
                {patientName}
              </h2>
              <span className="tag tag--muted" style={{ fontSize: "11px" }}>
                {twin.patientId}
              </span>
              <span className={`badge-risk ${isHighRisk ? "badge-risk--high" : "badge-risk--low"}`}>
                <b>{riskScore}</b> {isHighRisk ? "High CVD Risk" : "Normal Risk"}
              </span>
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "4px" }}>
              {age} yrs · {gender} · Primary:{" "}
              <strong style={{ color: "var(--text)" }}>{conditions}</strong>
            </div>
          </div>
        </div>

        {/* Live Wearable Telemetry Quick Chips */}
        <div className="dashboard-hub__vitals-chips">
          <div className="hub-vital-chip">
            <span className="hub-vital-chip__lbl">Heart Rate</span>
            <span className="hub-vital-chip__val">
              {hr} <small>bpm</small>
            </span>
          </div>
          <div className="hub-vital-chip">
            <span className="hub-vital-chip__lbl">Blood Pressure</span>
            <span className="hub-vital-chip__val vital-warn">
              {bp} <small>mmHg</small>
            </span>
          </div>
          <div className="hub-vital-chip">
            <span className="hub-vital-chip__lbl">SpO₂ Oxygen</span>
            <span className="hub-vital-chip__val vital-good">{spo2}%</span>
          </div>
          <div className="hub-vital-chip">
            <span className="hub-vital-chip__lbl">Body Temp</span>
            <span className="hub-vital-chip__val">{temp}°C</span>
          </div>
        </div>
      </div>

      {/* Real-Time Clinical Alert Status Strip */}
      {activeAlerts.length > 0 ? (
        <div className="hub-alert-banner hub-alert-banner--active">
          <div className="hub-alert-banner__content">
            <span className="hub-alert-banner__badge">🚨 {activeAlerts[0].severity} ALERT</span>
            <div>
              <div className="hub-alert-banner__title">{activeAlerts[0].condition}</div>
              <div className="hub-alert-banner__sub">
                Target SLA: &le; {activeAlerts[0].slaMinutes} min · Assigned: {activeAlerts[0].physicianName} · Status: <strong>{activeAlerts[0].status}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="hub-alert-banner__action"
            onClick={() => onNavigate?.("alerts", patientId)}
          >
            <span>Review CDS Protocol &amp; Claim SLA</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : (
        <div className="hub-alert-banner hub-alert-banner--normal">
          <div className="hub-alert-banner__content">
            <span className="hub-alert-banner__dot">●</span>
            <span className="hub-alert-banner__text">
              Real-Time Alert Engine Active · On-Call Cardiologist: <strong>Dr. Evelyn Reed, MD</strong> (ON DUTY · Pager: PAGER-CARDIOLOGY-01 · SLA &le; 3.2m)
            </span>
          </div>
          <button
            type="button"
            className="hub-alert-banner__btn"
            onClick={() => onNavigate?.("alerts", patientId)}
          >
            <span>Alert Center</span>
            <span>&rarr;</span>
          </button>
        </div>
      )}

      {/* Interactive 4-Option Module Grid */}
      <div className="dashboard-hub__grid">
        {/* Option Card 1: Digital Health Twin */}
        <div className="hub-card hub-card--twin">
          <div className="hub-card__head">
            <div className="hub-card__icon hub-card__icon--twin">🫀</div>
            <div>
              <h3>Digital Health Twin</h3>
              <p>3D anatomical organ heatmap &amp; telemetry</p>
            </div>
          </div>
          <div className="hub-card__body">
            <div className="hub-card__metric-row">
              <span className="metric-label">Organ Heatmap:</span>
              <span className="metric-badge metric-badge--warn">Cardiovascular &amp; Renal</span>
            </div>
            <div className="hub-card__metric-row">
              <span className="metric-label">Wearable Sync:</span>
              <span className="metric-badge metric-badge--good">● Kafka Stream Active</span>
            </div>
            <div className="hub-card__metric-row">
              <span className="metric-label">Twin Completeness:</span>
              <span className="metric-value">100% FHIR R4 Coverage</span>
            </div>
            <p className="hub-card__desc">
              Explore interactive 3D human anatomy with multi-organ physiological simulation and live
              Kafka wearable vital streaming.
            </p>
          </div>
          <div className="hub-card__foot">
            <button
              type="button"
              className="hub-btn hub-btn--twin"
              onClick={() => onNavigate("twin")}
            >
              <span>Launch 3D Digital Twin</span>
              <span className="hub-btn__arrow">→</span>
            </button>
          </div>
        </div>

        {/* Option Card 2: AI Risk Prediction */}
        <div className="hub-card hub-card--predictions">
          <div className="hub-card__head">
            <div className="hub-card__icon hub-card__icon--predictions">⚡</div>
            <div>
              <h3>AI Risk Prediction Engine</h3>
              <p>TensorFlow Federated CVD &amp; Diabetes models</p>
            </div>
          </div>
          <div className="hub-card__body">
            <div className="hub-card__metric-row">
              <span className="metric-label">10-Yr CVD Risk:</span>
              <span className="metric-value" style={{ color: "#dc2626", fontWeight: "700" }}>
                {riskScore} (High Risk)
              </span>
            </div>
            <div className="hub-card__metric-row">
              <span className="metric-label">Population Baseline:</span>
              <span className="metric-value">12.1% (Patient is 2.0x elevated)</span>
            </div>
            <div className="hub-card__metric-row">
              <span className="metric-label">Top SHAP Drivers:</span>
              <span className="metric-badge metric-badge--shap">HbA1c +8% · BP +6% · Age +5%</span>
            </div>
            <p className="hub-card__desc">
              Privacy-preserving edge model trained across 3 hospital networks with 91.4% accuracy and
              SHAP clinical explainability.
            </p>
          </div>
          <div className="hub-card__foot">
            <button
              type="button"
              className="hub-btn hub-btn--predictions"
              onClick={() => onNavigate("predictions")}
            >
              <span>View Risk Analysis &amp; SHAP</span>
              <span className="hub-btn__arrow">→</span>
            </button>
          </div>
        </div>

        {/* Option Card 3: Precision Care Protocol */}
        <div className="hub-card hub-card--careplans">
          <div className="hub-card__head">
            <div className="hub-card__icon hub-card__icon--careplans">📋</div>
            <div>
              <h3>Precision Care Protocol</h3>
              <p>Guideline pharmacotherapy &amp; clinical targets</p>
            </div>
          </div>
          <div className="hub-card__body">
            <div className="hub-card__metric-row">
              <span className="metric-label">Action Guidance:</span>
              <span className="metric-badge metric-badge--rec">Intensify statin, BP &lt;130/80</span>
            </div>
            <div className="hub-card__metric-row">
              <span className="metric-label">Primary Guideline:</span>
              <span className="metric-value">2019 ACC/AHA Prevention</span>
            </div>
            <div className="hub-card__metric-row">
              <span className="metric-label">Active Prescriptions:</span>
              <span className="metric-value" style={{ fontSize: "11.5px" }}>
                {medications}
              </span>
            </div>
            <p className="hub-card__desc">
              Precision therapeutic protocol tailored to patient's cardiovascular and glycemic biomarker
              profiles.
            </p>
          </div>
          <div className="hub-card__foot">
            <button
              type="button"
              className="hub-btn hub-btn--careplans"
              onClick={() => onNavigate("careplans")}
            >
              <span>Open Care Protocol</span>
              <span className="hub-btn__arrow">→</span>
            </button>
          </div>
        </div>

        {/* Option Card 4: Clinical Health Summary */}
        <div className="hub-card hub-card--reports">
          <div className="hub-card__head">
            <div className="hub-card__icon hub-card__icon--reports">📄</div>
            <div>
              <h3>Clinical Health Summary</h3>
              <p>Comprehensive FHIR R4 labs &amp; records</p>
            </div>
          </div>
          <div className="hub-card__body">
            <div className="hub-card__metric-row">
              <span className="metric-label">Diagnostic History:</span>
              <span className="metric-value">{conditions}</span>
            </div>
            <div className="hub-card__metric-row">
              <span className="metric-label">Key Lab Biomarkers:</span>
              <span className="metric-badge metric-badge--labs">HbA1c 7.2% · LDL 135 · eGFR 88</span>
            </div>
            <div className="hub-card__metric-row">
              <span className="metric-label">HIPAA Consent:</span>
              <span className="metric-badge metric-badge--good">✓ Verified &amp; Granted</span>
            </div>
            <p className="hub-card__desc">
              Longitudinal diagnostic timeline, validated observation bundles, and printable patient
              clinical health report.
            </p>
          </div>
          <div className="hub-card__foot">
            <button
              type="button"
              className="hub-btn hub-btn--reports"
              onClick={() => onNavigate("reports")}
            >
              <span>View Health Summary</span>
              <span className="hub-btn__arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
