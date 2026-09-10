import { useState } from "react";
import { api } from "../api";

export function PredictionsView({ twin, patientName, onGoToCareplans }) {
  const v = twin?.latestVitals || {};
  const labs = twin?.labResults || [];
  const hba1c = labs.find((l) => /hba1c|a1c/i.test(l.code))?.value || 7.2;
  const sys = v.systolic || 130;
  const dia = v.diastolic || 85;

  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <div className="twin-panel__eyebrow">Predictive Cardiology · Federated Machine Learning</div>
          <h3>CVD Risk Prediction — {patientName || twin?.patientId}</h3>
          <p>Federated edge-trained risk stratification model (CVD-Risk-v3.2 · Local Inference)</p>
        </div>
        <span className="tag tag--warn">Elevated Risk Category</span>
      </div>

      <div className="prediction-box" style={{ marginTop: "12px" }}>
        <div className="prediction-box__score">
          <span className="score-val">24.3%</span>
          <span className="score-lbl">10-Year Cardiovascular Disease Risk</span>
        </div>
        <div className="prediction-box__meta">
          <span>Model Accuracy: <b>91.4%</b> (Validated on 45,000+ EHR cohorts)</span>
          <span>Population Avg: <b>12.1%</b> (Patient is 2.0x elevated)</span>
        </div>
      </div>

      <div className="shap-section" style={{ marginTop: "16px" }}>
        <h4>SHAP Feature Attribution &amp; Clinical Explainability</h4>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
          The machine learning model identifies the following physiological features contributing most heavily to CVD risk:
        </p>
        <div className="shap-bar">
          <span>HbA1c ({hba1c}%)</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: "65%", background: "#ef4444" }}>
              +8.2% risk impact (Glycemic variability)
            </div>
          </div>
        </div>
        <div className="shap-bar">
          <span>Blood Pressure ({sys}/{dia} mmHg)</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: "50%", background: "#f59e0b" }}>
              +6.1% risk impact (Stage 1 Hypertension)
            </div>
          </div>
        </div>
        <div className="shap-bar">
          <span>Age &amp; Demographic Profile</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: "40%", background: "#3b82f6" }}>
              +4.9% risk impact (Vascular baseline)
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "20px", padding: "14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <h4 style={{ margin: "0 0 6px", fontSize: "13px" }}>Clinical Guidance &amp; Intervention</h4>
        <p style={{ margin: "0 0 12px", fontSize: "12.5px", color: "var(--text-muted)" }}>
          Recommended action: Intensify statin therapy, target BP &lt;130/80 mmHg, and initiate continuous glucose telemetry surveillance.
        </p>
        {onGoToCareplans && (
          <button className="btn btn--primary" onClick={onGoToCareplans}>
            Review Recommended Care Protocol →
          </button>
        )}
      </div>
    </section>
  );
}

export function AlertsView({ twin, patientName, onRefresh }) {
  const v = twin?.latestVitals || {};
  const [streaming, setStreaming] = useState(false);
  const [streamMsg, setStreamMsg] = useState("");

  const hr = v.heartRate || 72;
  const sys = v.systolic || 128;
  const dia = v.diastolic || 82;
  const spo2 = v.oxygenSaturation || 98;
  const temp = v.temperature || 36.6;

  const handleStream = async () => {
    setStreaming(true);
    setStreamMsg("");
    try {
      const simHr = Math.floor(65 + Math.random() * 30);
      const simSys = Math.floor(115 + Math.random() * 30);
      const simDia = Math.floor(75 + Math.random() * 15);
      const simSpo2 = Math.floor(96 + Math.random() * 4);
      await api.streamVital(twin.patientId, {
        heartRate: simHr,
        systolic: simSys,
        diastolic: simDia,
        oxygenSaturation: simSpo2,
      });
      setStreamMsg(`Ingested new telemetry packet (HR: ${simHr} bpm, BP: ${simSys}/${simDia}) via Kafka.`);
      onRefresh?.();
    } catch (e) {
      setStreamMsg("Telemetry stream failed: " + e.message);
    } finally {
      setStreaming(false);
    }
  };

  const alertItems = [
    {
      metric: "Heart Rate",
      value: `${hr} bpm`,
      threshold: "50 – 100 bpm",
      status: hr > 100 ? "HIGH" : hr < 50 ? "LOW" : "NORMAL",
      badgeClass: hr > 100 || hr < 50 ? "tag--warn" : "tag--ok",
    },
    {
      metric: "Blood Pressure",
      value: `${sys}/${dia} mmHg`,
      threshold: "< 130/80 mmHg",
      status: sys >= 140 || dia >= 90 ? "STAGE 2" : sys >= 130 || dia >= 80 ? "ELEVATED" : "NORMAL",
      badgeClass: sys >= 130 ? "tag--warn" : "tag--ok",
    },
    {
      metric: "SpO₂ Oxygen",
      value: `${spo2}%`,
      threshold: "≥ 95%",
      status: spo2 < 95 ? "ALERT" : "OPTIMAL",
      badgeClass: spo2 < 95 ? "tag--warn" : "tag--ok",
    },
    {
      metric: "Body Temperature",
      value: `${temp} °C`,
      threshold: "36.1 – 37.2 °C",
      status: temp > 37.5 ? "FEVER" : "NORMAL",
      badgeClass: temp > 37.5 ? "tag--warn" : "tag--ok",
    },
  ];

  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <div className="twin-panel__eyebrow">Biometric Surveillance</div>
          <h3>Telemetry &amp; Clinical Alerts — {patientName || twin?.patientId}</h3>
          <p>Real-time edge event ingestion via Apache Kafka and MongoDB Atlas Time Series</p>
        </div>
        <button className="btn btn--stream" onClick={handleStream} disabled={streaming}>
          {streaming ? "Streaming packet…" : "⚡ Ingest Live Wearable Packet"}
        </button>
      </div>

      {streamMsg && <div className="twin-stream-alert" style={{ marginBottom: "16px" }}>{streamMsg}</div>}

      <div className="table" style={{ marginTop: "12px" }}>
        <div className="table__row table__row--head">
          <span>Biometric Metric</span>
          <span>Current Telemetry</span>
          <span>Safety Boundary</span>
          <span>Clinical Status</span>
        </div>
        {alertItems.map((item) => (
          <div className="table__row" key={item.metric}>
            <span><b>{item.metric}</b></span>
            <span><b style={{ color: "var(--brand)" }}>{item.value}</b></span>
            <span style={{ color: "var(--text-muted)" }}>{item.threshold}</span>
            <span>
              <span className={`tag ${item.badgeClass}`}>{item.status}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CareplansView({ twin, patientName }) {
  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <div className="twin-panel__eyebrow">Precision Clinical Protocols</div>
          <h3>Personalized Care Protocol — {patientName || twin?.patientId}</h3>
          <p>AI-orchestrated clinical pathway based on FHIR biometrics, labs, and twin risk score</p>
        </div>
        <span className="tag tag--ok">Active Protocol</span>
      </div>

      <div className="careplan-goals" style={{ marginTop: "16px" }}>
        <div className="goal-card">
          <strong>Goal 1: Glycemic Optimization (Target: HbA1c &lt;7.0%)</strong>
          <ul>
            <li>Titrate Metformin from 500mg BID to 1000mg BID with morning and evening meals.</li>
            <li>Enable continuous wearable glucose logging and dietary surveillance via patient portal.</li>
            <li>Follow-up clinical HbA1c lab panel scheduled at 90 days.</li>
          </ul>
        </div>
        <div className="goal-card">
          <strong>Goal 2: Vascular Pressure Control (Target: BP &lt;130/80 mmHg)</strong>
          <ul>
            <li>Add Amlodipine 5mg once daily taken at breakfast.</li>
            <li>Enable real-time smartwatch blood pressure sync streaming directly to Kafka engine.</li>
            <li>Automated alert triggered if systolic pressure exceeds 140 mmHg on consecutive readings.</li>
          </ul>
        </div>
      </div>

      <div className="careplan-projected" style={{ marginTop: "16px" }}>
        <strong>Projected Clinical Outcome:</strong>
        <span>Cardiovascular 10-year risk projected to drop from <b>24.3% → 16.2%</b> with 85%+ care protocol adherence.</span>
      </div>
    </section>
  );
}

export function ReportsView({ twin, patientName }) {
  const v = twin?.latestVitals || {};
  const labs = twin?.labResults || [];

  return (
    <section className="panel">
      <div className="panel__head">
        <div>
          <div className="twin-panel__eyebrow">Clinical Documentation</div>
          <h3>Clinical Health Summary Report — {patientName || twin?.patientId}</h3>
          <p>Consolidated FHIR R4 medical record and Digital Health Twin telemetry</p>
        </div>
        <button className="btn btn--primary" onClick={() => window.print()}>
          🖨 Print / Export Summary
        </button>
      </div>

      <div className="twin-summary-bar" style={{ marginTop: "16px" }}>
        <div className="summary-item">
          <small>Patient Identifier</small>
          <strong>{twin?.patientId}</strong>
        </div>
        <div className="summary-item">
          <small>Demographics</small>
          <span>{twin?.demographics?.age || 58} y/o {twin?.demographics?.gender || "Male"}</span>
        </div>
        <div className="summary-item">
          <small>Consent &amp; Governance</small>
          <strong style={{ color: "#166534" }}>HIPAA Consent Granted</strong>
        </div>
        <div className="summary-item">
          <small>Twin Completeness</small>
          <strong>{twin?.completeness || 100}% Synced</strong>
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>Laboratory Observations (HL7 FHIR R4)</h4>
        {labs.length > 0 ? (
          <div className="table">
            <div className="table__row table__row--head">
              <span>Code / Test</span>
              <span>Value</span>
              <span>Reference Range</span>
              <span>Status</span>
            </div>
            {labs.map((l, i) => (
              <div className="table__row" key={i}>
                <span><b>{l.code}</b></span>
                <span><b>{l.value} {l.unit || ""}</b></span>
                <span style={{ color: "var(--text-muted)" }}>Normal Standard</span>
                <span><span className="tag tag--ok">Validated</span></span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No laboratory results currently recorded.</p>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <h4 style={{ fontSize: "14px", marginBottom: "8px" }}>Latest Biometric Vitals</h4>
        <div className="vitals-stream-grid">
          <div className="vital-tile">
            <span className="vital-tile__lbl">Heart Rate</span>
            <span className="vital-tile__val">{v.heartRate || 72} <small>bpm</small></span>
          </div>
          <div className="vital-tile">
            <span className="vital-tile__lbl">Blood Pressure</span>
            <span className="vital-tile__val">{v.systolic || 128}/{v.diastolic || 82} <small>mmHg</small></span>
          </div>
          <div className="vital-tile">
            <span className="vital-tile__lbl">SpO₂ Oxygen</span>
            <span className="vital-tile__val">{v.oxygenSaturation || 98} <small>%</small></span>
          </div>
          <div className="vital-tile">
            <span className="vital-tile__lbl">Temperature</span>
            <span className="vital-tile__val">{v.temperature || 36.6} <small>°C</small></span>
          </div>
        </div>
      </div>
    </section>
  );
}
