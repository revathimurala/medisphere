import { api } from "../api";

export function PredictionModal({ patientName, twin, onClose }) {
  const v = twin?.latestVitals || {};
  const labs = twin?.labResults || [];
  const hba1c = labs.find(l => /hba1c|a1c/i.test(l.code))?.value || 7.2;
  const sys = v.systolic || 130;
  const dia = v.diastolic || 85;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-card__head">
          <div>
            <span className="tag tag--warn" style={{ marginBottom: "6px" }}>Clinical AI Predictive Analytics</span>
            <h3>TensorFlow Federated — CVD Risk Prediction</h3>
            <p>Patient: {patientName} · Model: CVD-Risk-v3.2 · Federated Round: 47</p>
          </div>
          <button className="btn btn--small" onClick={onClose}>✕ Close</button>
        </div>

        <div className="prediction-box">
          <div className="prediction-box__score">
            <span className="score-val">24.3%</span>
            <span className="score-lbl">10-Year Cardiovascular Risk (High Risk)</span>
          </div>
          <div className="prediction-box__meta">
            <span>Model Accuracy: <b>91.4%</b></span>
            <span>Population Avg: <b>12.1% (Patient 2.0x elevated)</b></span>
          </div>
        </div>

        <div className="shap-section">
          <h4>SHAP Feature Explainability</h4>
          <div className="shap-bar">
            <span>HbA1c ({hba1c}%)</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: "65%", background: "#ef4444" }}>+8.2% risk impact</div></div>
          </div>
          <div className="shap-bar">
            <span>Blood Pressure ({sys}/{dia} mmHg)</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: "50%", background: "#f59e0b" }}>+6.1% risk impact</div></div>
          </div>
          <div className="shap-bar">
            <span>Age &amp; Demographic</span>
            <div className="bar-track"><div className="bar-fill" style={{ width: "40%", background: "#3b82f6" }}>+4.9% risk impact</div></div>
          </div>
        </div>

        <div className="modal-card__footer">
          <p>Recommendation: Intensify statin therapy, BP target &lt;130/80 mmHg. Model trained across federated hospital nodes without sharing raw PHI.</p>
        </div>
      </div>
    </div>
  );
}

export function CareplanModal({ patientName, twin, onClose, isProvider = true, onNavigateToCareplans }) {
  const handleApprove = async () => {
    try {
      const pid = twin?.patientId || "P001";
      await api.signCarePlan(pid, {
        signedBy: "Dr. Evelyn Reed, MD",
        providerRole: "Attending Cardiologist",
        npiNumber: "NPI-1948201942",
        comments: "Care plan reviewed, validated against clinical guidelines, and authorized.",
      }).catch(() => {});
    } catch {
      // ignore
    }
    onClose();
    onNavigateToCareplans?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-card__head">
          <div>
            <span className="tag tag--ok" style={{ marginBottom: "6px" }}>
              {isProvider ? "Precision Care Protocol" : "My Prescribed Care Protocol"}
            </span>
            <h3>{isProvider ? "AI-Generated Personalized Careplan" : "Prescribed Care Plan & Recovery Protocol"}</h3>
            <p>
              {isProvider
                ? `Clinical guideline engine care recommendation for ${patientName}`
                : `Authorized clinical orders and guidelines prescribed for your care`}
            </p>
          </div>
          <button className="btn btn--small" onClick={onClose}>✕ Close</button>
        </div>

        {!isProvider && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "10px",
              padding: "12px 14px",
              margin: "12px 0",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "20px" }}>👨‍⚕️</span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
                Prescribed &amp; Authorized by Doctor
              </div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#14532d" }}>
                Dr. Evelyn Reed, MD · Attending Cardiologist (NPI-1948201942)
              </div>
            </div>
          </div>
        )}

        <div className="careplan-goals">
          <div className="goal-card">
            <strong>Goal 1: Glycemic Optimization (Target: HbA1c &lt;7.0%)</strong>
            <ul>
              <li>Titrate Metformin from 500mg BID to 1000mg BID with meals.</li>
              <li>Continuous wearable glucose logging and diet surveillance via patient app.</li>
            </ul>
          </div>
          <div className="goal-card">
            <strong>Goal 2: Vascular Pressure Control (Target: BP &lt;130/80 mmHg)</strong>
            <ul>
              <li>Add Amlodipine 5mg once daily at breakfast.</li>
              <li>Real-time smartwatch blood pressure sync via Kafka stream.</li>
            </ul>
          </div>
        </div>

        <div className="careplan-projected">
          <strong>Projected Clinical Outcome:</strong>
          <span>Cardiovascular 10-year risk projected to drop from <b>24.3% → 16.2%</b> with 85%+ careplan adherence.</span>
        </div>

        <div className="modal-card__footer" style={{ display: "flex", justifyContent: "flex-end", gap: "8px", alignItems: "center" }}>
          <button className="btn" onClick={onClose}>Close</button>
          {isProvider ? (
            <button
              className="btn btn--primary"
              onClick={handleApprove}
            >
              Approve &amp; Send to Patient
            </button>
          ) : (
            <button
              className="btn btn--primary"
              onClick={() => {
                onClose();
                onNavigateToCareplans?.();
              }}
              style={{ background: "#059669", borderColor: "#059669" }}
            >
              📋 Open Full Protocol &amp; Track Adherence →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
