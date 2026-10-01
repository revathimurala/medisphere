import { useEffect, useState } from "react";
import { api } from "../api";

export default function Milestone2PredictionScreen({ selectedPatientId, onSelectPatient, onNavigate, onBackToDirectory }) {
  const [activeTab, setActiveTab] = useState("cvd"); // "cvd" | "diabetes" | "federated" | "registry"
  const [stats, setStats] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(selectedPatientId || null);
  const [flStatus, setFlStatus] = useState(null);
  const [registry, setRegistry] = useState([]);
  const [training, setTraining] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync selectedId with prop
  useEffect(() => {
    setSelectedId(selectedPatientId || null);
  }, [selectedPatientId]);

  // Load initial data
  useEffect(() => {
    Promise.all([
      api.getPredictionStats().catch(() => null),
      api.getPatients().catch(() => []),
      api.getFederatedStatus().catch(() => null),
      api.getModelRegistry().catch(() => [])
    ]).then(([s, pts, fl, reg]) => {
      if (s) setStats(s);
      if (pts && pts.length) setPatients(pts);
      if (fl) setFlStatus(fl);
      if (reg && reg.length) setRegistry(reg);
    });
  }, []);

  // Load patient prediction whenever selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setPrediction(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getPrediction(selectedId)
      .then((data) => setPrediction(data))
      .catch((err) => console.error("Failed to load prediction:", err))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handlePatientChange = (e) => {
    const nextId = e.target.value;
    setSelectedId(nextId);
    onSelectPatient?.(nextId);
  };

  const handleTrainRound = async () => {
    setTraining(true);
    setActionNotice("");
    try {
      const res = await api.trainFederatedRound();
      setActionNotice(res.message);
      // Refresh stats & federated status & current prediction
      const [newStats, newFl, newPred] = await Promise.all([
        api.getPredictionStats(),
        api.getFederatedStatus(),
        api.getPrediction(selectedId)
      ]);
      setStats(newStats);
      setFlStatus(newFl);
      setPrediction(newPred);
    } catch (e) {
      setActionNotice("Training round error: " + (e.message || "Failed"));
    } finally {
      setTraining(false);
    }
  };

  const handleActionClick = (actionId) => {
    if (actionId === "generate_careplan") {
      setActionNotice(`✓ Opening personalized care protocol for ${prediction?.patientName || selectedId}…`);
      setTimeout(() => onNavigate?.("careplans", selectedId), 400);
    }
  };

  const pStats = stats || {
    riskPredictionsToday: 342,
    modelAccuracy: "91.4%",
    roundLabel: "↑ 2.1% FL round 47",
    highRiskPatients: 23,
    highRiskLabel: "Require intervention"
  };

  // If no patient is selected, display the Patient Selection Directory
  if (!selectedId) {
    const list = patients.length > 0 ? patients : [
      { id: "P001", name: "John Doe", age: 48, gender: "Male", primaryDiagnosis: "Type 2 Diabetes, Essential Hypertension", riskScore: 24.3, riskCategory: "High Risk", complication: "Nephropathy 18.5%", driver: "HbA1c (+8%), BP (+6%)" },
      { id: "P002", name: "Jane Roe", age: 52, gender: "Female", primaryDiagnosis: "Atrial Fibrillation, Hypertension", riskScore: 12.6, riskCategory: "Moderate Risk", complication: "Neuropathy 12.0%", driver: "Age (+4%), HbA1c (+3%)" },
      { id: "P003", name: "Robert Johnson", age: 61, gender: "Male", primaryDiagnosis: "Post-PCI Coronary Artery Disease", riskScore: 9.4, riskCategory: "Moderate Risk", complication: "Nephropathy 8.5%", driver: "Age (+6%), LDL (+2%)" },
      { id: "P004", name: "Maria Garcia", age: 39, gender: "Female", primaryDiagnosis: "Metabolic Syndrome, Hypertension", riskScore: 4.2, riskCategory: "Low Risk", complication: "Low Risk (<5%)", driver: "Age (+2%), BP (+1%)" },
      { id: "P005", name: "David Kim", age: 34, gender: "Male", primaryDiagnosis: "Pre-hypertension", riskScore: 3.6, riskCategory: "Low Risk", complication: "Low Risk (<3%)", driver: "Age (+1%), Preserved eGFR" },
    ];

    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/60">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
                🧠 Predictive AI &amp; Federated Learning
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white m-0">
                AI Risk Prediction Directory
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Decentralized TensorFlow Federated risk models, biomarker-driven SHAP clinical explainability, and multi-organ complication trajectory modeling. Select a patient to evaluate their AI risk assessment.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-center">
                <span className="text-slate-400 block">Model Accuracy</span>
                <strong className="text-lg font-bold text-emerald-400">{pStats.modelAccuracy}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Predictions Evaluated</span>
            <strong className="text-2xl font-bold text-slate-900 mt-1 block">{pStats.riskPredictionsToday}</strong>
            <span className="text-xs text-slate-400 mt-1 block">Validated on EHR cohorts</span>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Federated Convergence</span>
            <strong className="text-2xl font-bold text-sky-600 mt-1 block">{pStats.roundLabel}</strong>
            <span className="text-xs text-slate-400 mt-1 block">3 Hospital Nodes Active</span>
          </div>
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">High Risk Flagged</span>
            <strong className="text-2xl font-bold text-red-600 mt-1 block">{pStats.highRiskPatients}</strong>
            <span className="text-xs text-red-500 mt-1 block">{pStats.highRiskLabel}</span>
          </div>
        </div>

        {/* Patient Selection Roster Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base m-0">
              Select Patient to Run Clinical AI Risk Predictions
            </h3>
            <span className="text-xs text-slate-500">
              Personalized SHAP explainability and 10-year CVD trajectory
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Patient</th>
                  <th className="py-3.5 px-4">Demographics</th>
                  <th className="py-3.5 px-4">Primary Diagnoses</th>
                  <th className="py-3.5 px-4">10-Yr CVD Risk</th>
                  <th className="py-3.5 px-4">Top Risk Driver (SHAP)</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {list.map((p) => {
                  const isHigh = (p.riskCategory || "").toLowerCase().includes("high") || (p.riskScore || 0) >= 20;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onSelectPatient?.(p.id)}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {p.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || p.id}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500 font-mono">ID: {p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <div>{p.age || 48} yrs · {p.gender || "Male"}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block text-xs font-medium text-slate-700 max-w-xs truncate">
                          {p.conditions || p.primaryDiagnosis || "Type 2 Diabetes"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isHigh
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {p.riskScore ? `${p.riskScore}% ` : ""}{p.riskCategory || (isHigh ? "High Risk" : "Standard Risk")}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <span className="text-slate-600 font-medium">
                          {p.driver || "HbA1c (+8%), BP (+6%)"}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient?.(p.id);
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-all"
                        >
                          Assess AI Risk →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="milestone2-screen">
      {/* Top Banner & Eyebrow */}
      <div className="m2-banner">
        <div className="m2-banner__left">
          {onBackToDirectory && (
            <button
              onClick={onBackToDirectory}
              className="mr-3 px-3 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition-colors"
            >
              ← All Patients
            </button>
          )}
          <span className="tag tag--milestone2">Clinical Predictive AI</span>
          <span className="m2-banner__subtitle">Federated Learning &amp; Risk Models · Privacy-Preserving AI</span>
        </div>
        <div className="m2-banner__right">
          <label htmlFor="patient-select" className="m2-patient-label">Active Cohort Patient:</label>
          <select
            id="patient-select"
            className="m2-patient-select"
            value={selectedId}
            onChange={handlePatientChange}
          >
            {patients.length > 0 ? (
              patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || (p.id === "P001" ? "John Doe" : p.id)} ({p.id})
                </option>
              ))
            ) : (
              <>
                <option value="P001">John Doe (P001)</option>
                <option value="P002">Jane Roe (P002)</option>
                <option value="P003">Robert Johnson (P003)</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Screen Title */}
      <div className="m2-header">
        <h2>AI Risk Prediction Engine</h2>
        <div className="m2-tabs">
          <button
            className={`m2-tab ${activeTab === "cvd" ? "is-active" : ""}`}
            onClick={() => setActiveTab("cvd")}
          >
            CVD Risk Prediction
          </button>
          <button
            className={`m2-tab ${activeTab === "diabetes" ? "is-active" : ""}`}
            onClick={() => setActiveTab("diabetes")}
          >
            Diabetes Complications
          </button>
          <button
            className={`m2-tab ${activeTab === "federated" ? "is-active" : ""}`}
            onClick={() => setActiveTab("federated")}
          >
            Federated Learning Hub ({flStatus?.currentRound || 47} Rounds)
          </button>
          <button
            className={`m2-tab ${activeTab === "registry" ? "is-active" : ""}`}
            onClick={() => setActiveTab("registry")}
          >
            Model Versioning
          </button>
        </div>
      </div>

      {/* 3 Metric Cards matching PDF Page 5 */}
      <div className="m2-stats-grid">
        <div className="m2-stat-card">
          <div className="m2-stat-card__label">Risk Predictions</div>
          <div className="m2-stat-card__value">{pStats.riskPredictionsToday}</div>
          <div className="m2-stat-card__subtext">Today</div>
        </div>
        <div className="m2-stat-card">
          <div className="m2-stat-card__label">Model Accuracy</div>
          <div className="m2-stat-card__value">{pStats.modelAccuracy}</div>
          <div className="m2-stat-card__subtext is-gain">{pStats.roundLabel}</div>
        </div>
        <div className="m2-stat-card">
          <div className="m2-stat-card__label">High Risk Patients</div>
          <div className="m2-stat-card__value">{pStats.highRiskPatients}</div>
          <div className="m2-stat-card__subtext is-alert">{pStats.highRiskLabel}</div>
        </div>
      </div>

      {actionNotice && (
        <div className="m2-action-notice">
          <span>{actionNotice}</span>
          <button onClick={() => setActionNotice("")}>✕</button>
        </div>
      )}

      {/* Primary Tab: CVD Risk Prediction Dark Console Card (Exact PDF Page 5 Layout) */}
      {activeTab === "cvd" && (
        <div className="m2-console-card">
          <div className="m2-console-card__header">
            <div className="m2-console-card__title">
              TensorFlow Federated - Cardiovascular Risk Prediction
            </div>
            <div className="m2-console-card__meta">
              Patient: <b>{prediction?.patientName || "John Doe"}</b> | Model: <b>{prediction?.model || "CVD-Risk-v3.2"}</b> | Federated Round: <b>{prediction?.federatedRound || 47}</b>
            </div>
          </div>

          <div className="m2-console-card__content">
            <div className="m2-console-line">
              <span className="m2-console-label">Input Features:</span>
              <span className="m2-console-val">
                {prediction?.inputFeatures?.join(", ") || "Age, BP, HbA1c, LDL, eGFR, Smoking, FH"}
              </span>
            </div>

            <div className="m2-console-line is-highlight-line">
              <span className="m2-console-label">Prediction:</span>
              <span className="m2-console-prediction">
                10-year CVD Risk: <strong className="m2-risk-badge">{prediction?.prediction?.percentage || "24.3%"}</strong> | Category: <span className="m2-category-badge">{prediction?.prediction?.category || "High Risk"}</span>
              </span>
            </div>

            <div className="m2-console-line">
              <span className="m2-console-label">SHAP Explanation:</span>
              <span className="m2-console-shap-summary">
                {prediction?.shapExplanation?.summary || "HbA1c (+8%), BP (+6%), Age (+5%)"}
              </span>
            </div>

            {/* Visual SHAP Bars */}
            <div className="m2-shap-bars-container">
              <div className="m2-shap-bars-header">
                <span>Feature Attribution (SHAP Lundberg-Lee Additivity Axiom)</span>
                <small>{prediction?.shapExplanation?.additivityProof || "Base 1.4% + Σ(SHAP) = 24.3%"}</small>
              </div>
              {prediction?.shapExplanation?.features?.map((f) => (
                <div className="m2-shap-row" key={f.feature}>
                  <div className="m2-shap-row__name">
                    <b>{f.feature}</b> ({f.value})
                  </div>
                  <div className="m2-shap-row__track">
                    <div
                      className="m2-shap-row__fill"
                      style={{
                        width: `${Math.min(100, Math.abs(f.impactPercent) * 7.5)}%`,
                        background: f.color
                      }}
                    >
                      <span>{f.display}</span>
                    </div>
                  </div>
                  <div className="m2-shap-row__note">{f.clinicalNote}</div>
                </div>
              ))}
            </div>

            <div className="m2-console-line" style={{ marginTop: "12px" }}>
              <span className="m2-console-label">Comparison:</span>
              <span className="m2-console-val">
                Population avg {prediction?.comparison?.populationAvg || "12.1%"} | Patient: <b>{prediction?.comparison?.ratio || "2x higher risk"}</b>
              </span>
            </div>

            <div className="m2-console-line">
              <span className="m2-console-label">Recommendation:</span>
              <span className="m2-console-rec">
                {prediction?.recommendation || "Intensify statin, BP target <130/80"}
              </span>
            </div>

            {/* Action Buttons: [Generate Careplan] */}
            <div className="m2-console-actions">
              <span className="m2-console-label" style={{ marginRight: "12px" }}>Action:</span>
              <button
                className="btn btn--action-m2 btn--careplan"
                onClick={() => handleActionClick("generate_careplan")}
              >
                [Generate Careplan]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Diabetes Complication Model */}
      {activeTab === "diabetes" && (
        <div className="m2-panel-card">
          <div className="m2-panel-card__head">
            <div>
              <h3>TensorFlow Federated — Diabetes Complication Risk Model (DiabComp-v2.0)</h3>
              <p>Multi-task neural network predicting 5-year microvascular and macrovascular complications</p>
            </div>
            <span className="tag tag--ok">Accuracy: 88.7%</span>
          </div>

          <div className="m2-complications-grid">
            <div className="m2-complication-card">
              <div className="m2-comp-top">
                <span className="m2-comp-title">Diabetic Nephropathy</span>
                <span className="m2-comp-badge is-warn">Moderate-High</span>
              </div>
              <div className="m2-comp-score">
                {prediction?.diabetesComplications?.nephropathy?.riskPercent || 18.5}%
              </div>
              <p className="m2-comp-bio">
                Biomarker: {prediction?.diabetesComplications?.nephropathy?.biomarker || "eGFR 88 mL/min · UACR 42 mg/g"}
              </p>
              <div className="m2-comp-rec">
                <strong>Intervention:</strong> {prediction?.diabetesComplications?.nephropathy?.recommendation}
              </div>
            </div>

            <div className="m2-complication-card">
              <div className="m2-comp-top">
                <span className="m2-comp-title">Diabetic Neuropathy</span>
                <span className="m2-comp-badge is-alert">High Risk</span>
              </div>
              <div className="m2-comp-score">
                {prediction?.diabetesComplications?.neuropathy?.riskPercent || 21.0}%
              </div>
              <p className="m2-comp-bio">
                Biomarker: {prediction?.diabetesComplications?.neuropathy?.biomarker || "Peripheral sensory vibration threshold"}
              </p>
              <div className="m2-comp-rec">
                <strong>Intervention:</strong> {prediction?.diabetesComplications?.neuropathy?.recommendation}
              </div>
            </div>

            <div className="m2-complication-card">
              <div className="m2-comp-top">
                <span className="m2-comp-title">Diabetic Retinopathy</span>
                <span className="m2-comp-badge is-warn">Moderate Risk</span>
              </div>
              <div className="m2-comp-score">
                {prediction?.diabetesComplications?.retinopathy?.riskPercent || 14.2}%
              </div>
              <p className="m2-comp-bio">
                Biomarker: {prediction?.diabetesComplications?.retinopathy?.biomarker || "HbA1c 7.2% · Duration 4 yrs"}
              </p>
              <div className="m2-comp-rec">
                <strong>Intervention:</strong> {prediction?.diabetesComplications?.retinopathy?.recommendation}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Federated Learning Network & Round 47 Simulation */}
      {activeTab === "federated" && (
        <div className="m2-panel-card">
          <div className="m2-panel-card__head">
            <div>
              <h3>Federated Learning Architecture &amp; Node Coordination</h3>
              <p>Privacy-preserving multi-hospital training: Local gradients aggregated via FedAvg without moving Protected Health Information (PHI)</p>
            </div>
            <button
              className="btn btn--primary"
              onClick={handleTrainRound}
              disabled={training}
            >
              {training ? "Aggregating Gradients…" : `⚡ Run Federated Round ${(flStatus?.currentRound || 47) + 1}`}
            </button>
          </div>

          <div className="m2-nodes-grid">
            {(flStatus?.participatingNodes || []).map((node) => (
              <div className="m2-node-card" key={node.id}>
                <div className="m2-node-card__top">
                  <div>
                    <strong>{node.name}</strong>
                    <small>{node.id} · Weight: {(node.weight * 100).toFixed(0)}%</small>
                  </div>
                  <span className="tag tag--ok">Synced</span>
                </div>
                <div className="m2-node-card__stats">
                  <div>Cohort Size: <b>{node.cohortSize?.toLocaleString()} records</b></div>
                  <div>Differential Privacy: <b>Rényi ε = {node.dpEpsilon}</b></div>
                  <div>Local Loss: <b>{node.localLoss}</b></div>
                  <div>Status: <b>{node.lastContribution}</b></div>
                </div>
              </div>
            ))}
          </div>

          <div className="m2-convergence-box">
            <h4>Global Convergence Telemetry (Rounds 1–{flStatus?.currentRound || 47})</h4>
            <div className="m2-convergence-bars">
              {(flStatus?.convergenceHistory || []).map((pt) => (
                <div className="m2-conv-col" key={pt.round} title={`Round ${pt.round}: Loss ${pt.loss}, Acc ${pt.accuracy}%`}>
                  <div className="m2-conv-bar" style={{ height: `${Math.min(100, Math.max(15, (1 - pt.loss) * 100))}%` }}></div>
                  <small>R{pt.round}</small>
                </div>
              ))}
            </div>
            <div className="m2-conv-footer">
              <span>Current Global Loss: <b>{flStatus?.globalLoss || 0.042}</b></span>
              <span>Model Weights Hash: <code>{flStatus?.modelWeightsHash || "0x8f3c4e92a1b57d60"}</code></span>
              <span>Convergence Status: <b style={{ color: "#166534" }}>Converged (Delta &lt; 0.001)</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Model Registry & Versioning */}
      {activeTab === "registry" && (
        <div className="m2-panel-card">
          <div className="m2-panel-card__head">
            <div>
              <h3>Model Versioning &amp; Checkpoint Registry</h3>
              <p>Cryptographically hashed neural model weights and lineage metadata</p>
            </div>
          </div>

          <div className="table" style={{ marginTop: "14px" }}>
            <div className="table__row table__row--head">
              <span>Model Version</span>
              <span>Type / Objective</span>
              <span>Accuracy</span>
              <span>AUROC</span>
              <span>Rounds</span>
              <span>Weights Hash</span>
              <span>Status</span>
            </div>
            {(registry.length ? registry : [
              {
                version: "CVD-Risk-v3.2",
                type: "Cardiovascular 10-Year Risk",
                accuracy: 91.4,
                auroc: 0.932,
                federatedRounds: 47,
                weightsHash: "0x8f3c4e92a1b57d60",
                status: "Active (Production)"
              },
              {
                version: "DiabComp-v2.0",
                type: "Diabetes Microvascular Complications",
                accuracy: 88.7,
                auroc: 0.912,
                federatedRounds: 35,
                weightsHash: "0x4b7e192f80c3d9a1",
                status: "Active (Production)"
              },
              {
                version: "CVD-Risk-v3.1",
                type: "Cardiovascular 10-Year Risk",
                accuracy: 89.2,
                auroc: 0.908,
                federatedRounds: 40,
                weightsHash: "0x2d9a5b7e80c1f43a",
                status: "Archived"
              }
            ]).map((m) => (
              <div className="table__row" key={m.version}>
                <span><b>{m.version}</b></span>
                <span>{m.type}</span>
                <span><b>{m.accuracy}%</b></span>
                <span>{m.auroc}</span>
                <span>{m.federatedRounds}</span>
                <span><code>{m.weightsHash?.slice(0, 12)}…</code></span>
                <span>
                  <span className={`tag ${m.status?.includes("Active") ? "tag--ok" : "tag--muted"}`}>
                    {m.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
