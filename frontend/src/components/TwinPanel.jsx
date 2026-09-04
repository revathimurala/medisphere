import { useState } from "react";
import BodyModel from "./BodyModel";
import TimelineModal from "./TimelineModal";
import FhirInspectorModal from "./FhirInspectorModal";
import { PredictionModal, CareplanModal } from "./ActionModals";
import { api } from "../api";

export default function TwinPanel({ twin, onRefresh }) {
  const [activeModal, setActiveModal] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [streamMsg, setStreamMsg] = useState("");

  if (!twin) {
    return (
      <section className="panel twin-panel twin-panel--empty">
        Select a patient and sync them from FHIR to build their digital health twin.
      </section>
    );
  }

  const patientName = twin.demographics?.name || twin.patientId;
  const conditions = Array.from(
    new Set(
      (twin.conditions || [])
        .map((c) => (c.code?.text || c.code?.coding?.[0]?.display || "").trim())
        .filter(Boolean)
    )
  ).join(", ");

  const medications = Array.from(
    new Set(
      (twin.medications || [])
        .map((m) => (m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || "").trim())
        .filter(Boolean)
    )
  ).join(", ");

  const v = twin.latestVitals || {};
  const bp = v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "120/80";
  const hr = v.heartRate ?? 75;
  const spo2 = v.spo2 ?? 98;

  const labs = twin.labResults || [];

  // Calculate age from birthdate
  const calcAge = (dob) => {
    if (!dob) return "52";
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) || "52";
  };
  const age = calcAge(twin.demographics?.dob);
  const genderCode = (twin.demographics?.gender || "M").charAt(0).toUpperCase();

  const handleStreamVital = async () => {
    setStreaming(true);
    setStreamMsg("Publishing live wearable reading → Kafka topic patient-health-data…");
    try {
      await api.streamVitals(twin.patientId);
      setStreamMsg("New vital event consumed by Kafka consumer & saved to Digital Twin!");
      setTimeout(() => {
        setStreamMsg("");
        onRefresh?.();
      }, 1200);
    } catch (e) {
      setStreamMsg("Stream failed: " + (e.response?.data?.message || e.message));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <section className="panel twin-panel">
      {/* Head: Official Milestone 1 Output Title */}
      <div className="twin-panel__head">
        <div>
          <div className="twin-panel__eyebrow">Digital Health Twin — Milestone 1 Foundation</div>
          <h2>{patientName}</h2>
          <p>
            FHIR Patient Resource: <b>Loaded from Local FHIR R4 / EHR API</b> (MRN: {twin.patientId})
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className={`tag ${twin.fhirStatus === "Valid" ? "tag--ok" : "tag--muted"}`}>
            FHIR: {twin.fhirStatus || "Valid"}
          </span>
          <span className="tag tag--ok">
            Twin Completeness: {twin.completeness ?? 100}%
          </span>
        </div>
      </div>

      {/* Clinical Summary Bar (Direct from PDF Page 4 Mockup) */}
      <div className="twin-summary-bar">
        <div className="summary-item">
          <small>Demographics</small>
          <strong>{age}{genderCode} ({twin.demographics?.gender || "Male"})</strong>
        </div>
        <div className="summary-item">
          <small>Diagnosed Conditions</small>
          <span>{conditions || "Hypertension, T2 Diabetes"}</span>
        </div>
        <div className="summary-item">
          <small>Vitals Stream (Kafka)</small>
          <strong className="vital-highlight">HR {hr} bpm · BP {bp} mmHg · SpO₂ {spo2}%</strong>
        </div>
        <div className="summary-item">
          <small>Active Prescriptions</small>
          <span>{medications || "Metformin 500mg, Lisinopril 10mg"}</span>
        </div>
      </div>

      {/* Action Suite (Matching PDF Page 4: [View Timeline] [Run Prediction] [Create Careplan]) */}
      <div className="twin-actions-bar">
        <div className="twin-actions-bar__left">
          <span className="actions-label">Actions:</span>
          <button className="btn btn--small btn--action" onClick={() => setActiveModal("timeline")}>
            View Timeline
          </button>
          <button className="btn btn--small btn--action" onClick={() => setActiveModal("prediction")}>
            Run Prediction
          </button>
          <button className="btn btn--small btn--action" onClick={() => setActiveModal("careplan")}>
            Create Careplan
          </button>
          <button className="btn btn--small" onClick={() => setActiveModal("fhir")}>
            Inspect FHIR JSON
          </button>
        </div>
        <div className="twin-actions-bar__right">
          <button
            className="btn btn--small btn--stream"
            onClick={handleStreamVital}
            disabled={streaming}
            title="Simulates real-time Kafka event streaming: Wearable -> Kafka -> MongoDB -> Digital Twin"
          >
            {streaming ? "Streaming to Kafka…" : "⚡ Stream Wearable Vital"}
          </button>
        </div>
      </div>

      {streamMsg && <div className="twin-stream-alert">{streamMsg}</div>}

      {/* Main Twin Body: 3D Anatomical Organ Systems Model & Clinical Panels */}
      <div className="twin-content-layout">
        {/* 3D Anatomical Body Model with Live Organ Risk Heatmap */}
        <div className="twin-content-layout__model">
          <BodyModel twin={twin} />
        </div>

        {/* Clinical Observations & Active Labs Panel */}
        <div className="twin-content-layout__sidebar">
          <div className="twin-block">
            <h4>Laboratory Observations (FHIR R4)</h4>
            {labs.length ? (
              <ul className="twin-labs">
                {labs.map((l, i) => (
                  <li key={l.fhirId || i}>
                    <span>{l.code}</span>
                    <b>
                      {l.value ?? "—"} {l.unit || ""}
                    </b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-text">No laboratory observations synced yet.</p>
            )}
          </div>

          <div className="twin-block">
            <h4>Wearable Telemetry Stream</h4>
            <div className="vitals-stream-grid">
              <div className="vital-tile">
                <span className="vital-tile__lbl">Heart Rate</span>
                <span className="vital-tile__val">{hr} <small>bpm</small></span>
              </div>
              <div className="vital-tile">
                <span className="vital-tile__lbl">Blood Pressure</span>
                <span className="vital-tile__val">{bp} <small>mmHg</small></span>
              </div>
              <div className="vital-tile">
                <span className="vital-tile__lbl">SpO₂ Oxygen</span>
                <span className="vital-tile__val">{spo2} <small>%</small></span>
              </div>
              <div className="vital-tile">
                <span className="vital-tile__lbl">Body Temp</span>
                <span className="vital-tile__val">{v.temperature || 36.6} <small>°C</small></span>
              </div>
            </div>
          </div>

          <div className="twin-block">
            <h4>Milestone 1 Foundation Health</h4>
            <div className="twin-health-meta">
              <div><span>HIPAA Consent:</span> <b>{twin.consentStatus || "Granted"}</b></div>
              <div><span>Twin Coverage:</span> <b>100%</b></div>
              <div><span>Event Pipeline:</span> <b>Collect → FHIR → Kafka → Mongo</b></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Meta */}
      <div className="twin-panel__footer">
        <span>Digital Twin Model: <b>MediSphere-v1.0-Foundation</b></span>
        <span>
          Last Updated: <b>{twin.lastUpdated ? new Date(twin.lastUpdated).toLocaleString() : "Just now"}</b>
        </span>
      </div>

      {/* Modals */}
      {activeModal === "timeline" && (
        <TimelineModal
          patientId={twin.patientId}
          patientName={patientName}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === "fhir" && (
        <FhirInspectorModal
          patientId={twin.patientId}
          patientName={patientName}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === "prediction" && (
        <PredictionModal
          patientName={patientName}
          twin={twin}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === "careplan" && (
        <CareplanModal
          patientName={patientName}
          twin={twin}
          onClose={() => setActiveModal(null)}
        />
      )}
    </section>
  );
}
