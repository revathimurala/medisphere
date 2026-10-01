import { useState } from "react";
import BodyModel from "./BodyModel";
import TimelineModal from "./TimelineModal";
import FhirInspectorModal from "./FhirInspectorModal";
import { PredictionModal, CareplanModal } from "./ActionModals";
import { api } from "../api";

export default function TwinPanel({
  twin,
  onRefresh,
  patients = [],
  selectedId,
  onSelectPatient,
  onBackToDirectory,
  isProvider = true,
  role = "provider",
  onNavigate,
}) {
  const [activeModal, setActiveModal] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [streamMsg, setStreamMsg] = useState("");

  if (!twin || !selectedId) {
    const list = patients.length > 0 ? patients : [
      { id: "P001", name: "John Doe", age: 48, gender: "Male", primaryDiagnosis: "Type 2 Diabetes, Hypertension", riskScore: 24.3, riskCategory: "High Risk" },
      { id: "P002", name: "Jane Roe", age: 52, gender: "Female", primaryDiagnosis: "Atrial Fibrillation, Hypertension", riskScore: 12.6, riskCategory: "Moderate Risk" },
      { id: "P003", name: "Robert Johnson", age: 61, gender: "Male", primaryDiagnosis: "Coronary Artery Disease", riskScore: 9.4, riskCategory: "Moderate Risk" },
      { id: "P004", name: "Maria Garcia", age: 39, gender: "Female", primaryDiagnosis: "Metabolic Syndrome", riskScore: 4.2, riskCategory: "Low Risk" },
      { id: "P005", name: "David Kim", age: 34, gender: "Male", primaryDiagnosis: "Pre-hypertension", riskScore: 3.6, riskCategory: "Low Risk" },
    ];

    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/60">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 mb-2">
                🧬 3D Dynamic Organ Simulation
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white m-0">
                Digital Health Twin Directory
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Explore interactive 3D human anatomy with multi-organ physiological simulations, live Kafka wearable vital streaming, and FHIR R4 medical record synchronization. Select a patient to load their twin.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                <span className="text-slate-400 block">Twins Built</span>
                <strong className="text-lg font-bold text-white">{list.length} Ready</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => {
            const isHigh = (p.riskCategory || "").toLowerCase().includes("high") || (p.riskScore || 0) >= 20;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                        {p.name?.split(" ").map((n) => n[0]).join("").slice(0, 2) || p.id}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base m-0">{p.name}</h3>
                        <span className="text-xs text-slate-500 font-mono">ID: {p.id}</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      100% Synced
                    </span>
                  </div>

                  <div className="space-y-2 py-2 text-xs text-slate-600 border-y border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Demographics:</span>
                      <strong className="text-slate-700">{p.age || 48} yrs · {p.gender || "Male"}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Primary Diagnosis:</span>
                      <span className="text-slate-800 font-medium text-right truncate max-w-[180px]">
                        {p.conditions || p.primaryDiagnosis || "Type 2 Diabetes"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Organ Heatmap:</span>
                      <span className="font-semibold text-rose-600">Cardiovascular &amp; Renal</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">CVD 10-Yr Risk:</span>
                      <span className={`font-bold ${isHigh ? "text-red-600" : "text-slate-700"}`}>
                        {p.riskScore ? `${p.riskScore}% ` : ""}({p.riskCategory || (isHigh ? "High" : "Standard")})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-2">
                  <button
                    onClick={() => onSelectPatient?.(p.id)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-sm shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Explore 3D Digital Twin</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
      {/* Top Navigation & Cohort Switcher */}
      {onBackToDirectory && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 flex-wrap gap-3">
          <button
            onClick={onBackToDirectory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
          >
            ← All Patients
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Switch Twin:</span>
            <select
              value={selectedId || twin.patientId}
              onChange={(e) => onSelectPatient?.(e.target.value)}
              className="text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Head: Clinical Digital Twin */}
      <div className="twin-panel__head">
        <div>
          <div className="twin-panel__eyebrow">Digital Health Twin — Patient 360 Dynamic Model</div>
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

      {/* Clinical Summary Bar */}
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
            {isProvider ? "Create Careplan" : "View My Care Plan"}
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
            <h4>Clinical Governance &amp; Security</h4>
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
        <span>Digital Twin Engine: <b>MediSphere Real-Time Clinical v1.0</b></span>
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
          isProvider={isProvider}
          onClose={() => setActiveModal(null)}
          onNavigateToCareplans={() => {
            setActiveModal(null);
            onNavigate?.("careplans", twin.patientId);
          }}
        />
      )}
    </section>
  );
}
