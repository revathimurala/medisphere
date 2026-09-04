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
            <span className="tag tag--warn" style={{ marginBottom: "6px" }}>Milestone 2 AI Model Preview</span>
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

export function CareplanModal({ patientName, twin, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-card__head">
          <div>
            <span className="tag tag--ok" style={{ marginBottom: "6px" }}>Milestone 4 Precision Careplan</span>
            <h3>AI-Generated Personalized Careplan</h3>
            <p>Clinical guideline engine care recommendation for {patientName}</p>
          </div>
          <button className="btn btn--small" onClick={onClose}>✕ Close</button>
        </div>

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

        <div className="modal-card__footer" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button className="btn btn--primary" onClick={onClose}>Approve &amp; Send to Patient</button>
        </div>
      </div>
    </div>
  );
}
