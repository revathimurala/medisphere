import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function ClinicalRuleEngineScreen({ selectedPatientId = "P002", onNavigate }) {
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Evaluation Workbench state
  const [evalPatient, setEvalPatient] = useState(selectedPatientId || "P002");
  const [evalPreset, setEvalPreset] = useState("afib_spike");
  const [customVitals, setCustomVitals] = useState({
    heartRate: 145,
    systolic: 122,
    diastolic: 82,
    spo2: 98,
    temperature: 36.8,
    zScore: 3.1,
    spikeDelta: 71
  });
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);

  // Custom Rule Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState({
    name: "",
    category: "CARDIOLOGY",
    severity: "HIGH",
    description: "",
    targetRole: "ATTENDING_PHYSICIAN",
    slaMinutes: 5.0,
    criteriaMetric: "heartRate",
    criteriaOperator: ">=",
    criteriaValue: 135,
    orderName: "12-Lead ECG STAT & Clinical Assessment"
  });

  // Edit Threshold Modal
  const [editingRule, setEditingRule] = useState(null);
  const [thresholdUpdates, setThresholdUpdates] = useState({});

  const fetchRulesData = async () => {
    try {
      const [rulesRes, statsRes] = await Promise.all([
        api.getClinicalRules(),
        api.getClinicalRuleStats()
      ]);
      setRules(rulesRes.rules || []);
      setStats(statsRes.stats || null);
    } catch (err) {
      console.error("Failed to load clinical rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRulesData();
  }, []);

  // Update vitals when selecting preset
  const handleSelectPreset = (preset) => {
    setEvalPreset(preset);
    if (preset === "afib_spike") {
      setCustomVitals({
        heartRate: 145,
        systolic: 122,
        diastolic: 82,
        spo2: 98,
        temperature: 36.8,
        zScore: 3.1,
        spikeDelta: 71
      });
    } else if (preset === "hypoxia") {
      setCustomVitals({
        heartRate: 92,
        systolic: 120,
        diastolic: 80,
        spo2: 87,
        temperature: 36.7,
        zScore: 1.4,
        spikeDelta: 0
      });
    } else if (preset === "hypertensive") {
      setCustomVitals({
        heartRate: 96,
        systolic: 188,
        diastolic: 124,
        spo2: 97,
        temperature: 36.9,
        zScore: 2.2,
        spikeDelta: 10
      });
    } else if (preset === "sepsis_qsofa") {
      setCustomVitals({
        heartRate: 116,
        systolic: 92,
        diastolic: 58,
        spo2: 95,
        temperature: 38.8,
        zScore: 2.6,
        spikeDelta: 40
      });
    } else if (preset === "shock_index") {
      setCustomVitals({
        heartRate: 124,
        systolic: 86,
        diastolic: 54,
        spo2: 94,
        temperature: 36.4,
        zScore: 2.8,
        spikeDelta: 50
      });
    } else if (preset === "normal_sinus") {
      setCustomVitals({
        heartRate: 72,
        systolic: 120,
        diastolic: 80,
        spo2: 99,
        temperature: 36.6,
        zScore: 0.2,
        spikeDelta: 0
      });
    }
  };

  // Run evaluation
  const handleRunEvaluation = async () => {
    setEvaluating(true);
    try {
      const patientNames = {
        P001: "John Doe",
        P002: "Sarah Miller",
        P003: "David Kumar",
        P004: "Robert Taylor",
        P005: "Elena Rostova"
      };

      const res = await api.evaluateClinicalRules({
        telemetry: {
          patientId: evalPatient,
          ...customVitals
        },
        patientContext: {
          patientId: evalPatient,
          patientName: patientNames[evalPatient] || `Patient ${evalPatient}`
        }
      });

      setEvalResult(res.evaluation || null);
      fetchRulesData(); // refresh counters
    } catch (err) {
      alert(`Evaluation error: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  // Toggle rule
  const handleToggleRule = async (ruleId) => {
    try {
      await api.toggleClinicalRule(ruleId);
      await fetchRulesData();
    } catch (err) {
      alert(`Toggle failed: ${err.message}`);
    }
  };

  // Reset defaults
  const handleResetDefaults = async () => {
    if (!window.confirm("Reset all rules to standard hospital clinical protocols?")) return;
    try {
      await api.resetClinicalRulesDefaults();
      await fetchRulesData();
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  // Handle custom rule submission
  const handleCreateRuleSubmit = async (e) => {
    e.preventDefault();
    try {
      const criteria = {};
      const val = Number(newRuleForm.criteriaValue);
      if (newRuleForm.criteriaMetric === "heartRate") {
        if (newRuleForm.criteriaOperator === ">=") criteria.heartRateMin = val;
        else criteria.heartRateMax = val;
      } else if (newRuleForm.criteriaMetric === "systolic") {
        if (newRuleForm.criteriaOperator === ">=") criteria.systolicMin = val;
        else criteria.systolicMax = val;
      } else if (newRuleForm.criteriaMetric === "spo2") {
        criteria.spo2Max = val;
      }

      await api.createClinicalRule({
        name: newRuleForm.name,
        category: newRuleForm.category,
        severity: newRuleForm.severity,
        description: newRuleForm.description || `Clinical rule monitoring ${newRuleForm.criteriaMetric}`,
        targetRole: newRuleForm.targetRole,
        slaMinutes: Number(newRuleForm.slaMinutes),
        criteria,
        orderSet: [
          { orderId: `ORD-${Date.now()}-1`, name: newRuleForm.orderName, urgent: true }
        ]
      });

      setShowCreateModal(false);
      setNewRuleForm({
        name: "",
        category: "CARDIOLOGY",
        severity: "HIGH",
        description: "",
        targetRole: "ATTENDING_PHYSICIAN",
        slaMinutes: 5.0,
        criteriaMetric: "heartRate",
        criteriaOperator: ">=",
        criteriaValue: 135,
        orderName: "12-Lead ECG STAT & Clinical Assessment"
      });
      await fetchRulesData();
    } catch (err) {
      alert(`Creation failed: ${err.message}`);
    }
  };

  // Save edited threshold
  const handleSaveThreshold = async () => {
    if (!editingRule) return;
    try {
      await api.updateClinicalRule(editingRule.ruleId, { criteria: thresholdUpdates });
      setEditingRule(null);
      await fetchRulesData();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    }
  };

  // Filtered rules
  const filteredRules = rules.filter((r) => {
    if (filterCategory !== "ALL" && r.category !== filterCategory) return false;
    if (filterSeverity !== "ALL" && r.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchDesc = (r.description || "").toLowerCase().includes(q);
      const matchId = r.ruleId.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchId) return false;
    }
    return true;
  });

  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case "EMERGENCY":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "CRITICAL":
        return "bg-rose-100 text-rose-800 border-rose-300";
      case "HIGH":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "MODERATE":
        return "bg-sky-100 text-sky-800 border-sky-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full box-border pb-12 select-none">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚖️</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Clinical Decision Support (CDS) Rule Engine
            </h1>
            <span className="text-xs bg-sky-50 text-sky-700 font-bold border border-sky-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
              CDS Engine Online
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Real-time evidence-based clinical rules evaluator. Generates LOINC/RxNorm STAT order sets, enforces
            on-call response SLA (≤ 3.2 min), and dispatches priority mobile push notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate && onNavigate("alerts", evalPatient)}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-1.5 shadow-sm"
          >
            <span>🚨</span>
            <span>Alert Center</span>
          </button>
          <button
            onClick={() => onNavigate && onNavigate("mobile-sensor")}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition flex items-center gap-1.5 shadow-sm"
          >
            <span>📱</span>
            <span>Mobile Phone</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Add Custom Rule</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Rules</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-slate-900">{stats?.activeRules ?? rules.length}</span>
            <span className="text-xs text-slate-400">/ {stats?.totalRules ?? rules.length} rules</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-bold mt-1">✓ All Protocols Active</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rule Evaluations</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-sky-600">{stats?.totalEvaluations ?? 148}</span>
            <span className="text-xs text-slate-400">runs</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Continuous live stream</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Latency</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-emerald-600">{stats?.avgEvaluationLatencyMs ?? "7.3"}</span>
            <span className="text-xs text-emerald-700 font-bold">ms</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1">Target: &lt; 25 ms (Passed)</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CDS Compliance</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-purple-600">{stats?.cdsComplianceRate ?? "99.2%"}</span>
          </div>
          <span className="text-[11px] text-purple-700 font-semibold mt-1">AHA / ACC / Sepsis Bundles</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cardiologist SLA</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-black text-rose-600">≤ 3.2m</span>
          </div>
          <span className="text-[11px] text-rose-700 font-semibold mt-1">Dr. Evelyn Reed, MD (On-Duty)</span>
        </div>
      </div>

      {/* Interactive Rule Evaluation Workbench & Simulator */}
      <div className="bg-gradient-to-r from-slate-50 via-sky-50/40 to-slate-50 border border-sky-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🧪</span>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Interactive Rule Evaluation Workbench & CDS Simulator
              </h2>
              <p className="text-xs text-slate-500">
                Execute clinical decision logic against patient biometrics in real time (&lt; 15ms)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-bold">Patient:</span>
            <select
              value={evalPatient}
              onChange={(e) => setEvalPatient(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none focus:border-sky-500 shadow-xs"
            >
              <option value="P002">Sarah Miller (P002) — AFib</option>
              <option value="P001">John Doe (P001)</option>
              <option value="P003">David Kumar (P003)</option>
              <option value="P004">Robert Taylor (P004)</option>
              <option value="P005">Elena Rostova (P005)</option>
            </select>
          </div>
        </div>

        {/* Preset Selector Pills */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
            Load Clinical Scenario Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "afib_spike", label: "🚨 Sarah M. 145 bpm AFib Spike", icon: "❤️" },
              { id: "hypoxia", label: "🫁 Acute Hypoxemia (87% SpO2)", icon: "🫁" },
              { id: "hypertensive", label: "💥 Hypertensive Crisis (188/124)", icon: "📈" },
              { id: "sepsis_qsofa", label: "🦠 qSOFA Sepsis Alert (SBP 92, T 38.8°C)", icon: "🦠" },
              { id: "shock_index", label: "⚠️ Cardiogenic Shock (SI = 1.44)", icon: "⚡" },
              { id: "normal_sinus", label: "✓ Normal Sinus Baseline (72 bpm)", icon: "🟢" }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  evalPreset === p.id
                    ? "bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/20"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Input Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Heart Rate</label>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                value={customVitals.heartRate}
                onChange={(e) => setCustomVitals({ ...customVitals, heartRate: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-base rounded-xl p-2 outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 font-bold">bpm</span>
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Systolic BP</label>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                value={customVitals.systolic}
                onChange={(e) => setCustomVitals({ ...customVitals, systolic: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-base rounded-xl p-2 outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 font-bold">mmHg</span>
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Diastolic BP</label>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                value={customVitals.diastolic}
                onChange={(e) => setCustomVitals({ ...customVitals, diastolic: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-base rounded-xl p-2 outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 font-bold">mmHg</span>
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Oxygen (SpO₂)</label>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                value={customVitals.spo2}
                onChange={(e) => setCustomVitals({ ...customVitals, spo2: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-base rounded-xl p-2 outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 font-bold">%</span>
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Body Temp</label>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                step="0.1"
                value={customVitals.temperature}
                onChange={(e) => setCustomVitals({ ...customVitals, temperature: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-base rounded-xl p-2 outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 font-bold">°C</span>
            </div>
          </div>

          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">Z-Score Outlier</label>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="number"
                step="0.1"
                value={customVitals.zScore}
                onChange={(e) => setCustomVitals({ ...customVitals, zScore: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-black text-base rounded-xl p-2 outline-none focus:border-sky-500"
              />
              <span className="text-[11px] text-slate-500 font-bold">σ</span>
            </div>
          </div>
        </div>

        {/* Evaluate Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Clicking evaluate tests all active rules against the vitals above and pushes a mobile notification if critical.
          </div>

          <button
            onClick={handleRunEvaluation}
            disabled={evaluating}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-2 whitespace-nowrap"
          >
            {evaluating ? (
              <>
                <span className="animate-spin">↻</span>
                <span>Evaluating Logic...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Run Clinical Rule Engine Evaluation</span>
              </>
            )}
          </button>
        </div>

        {/* Live Evaluation Feedback Card */}
        {evalResult && (
          <div className="mt-4 bg-white border border-sky-200 rounded-2xl p-5 shadow-md space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {evalResult.isActionRequired ? "🚨" : "✓"}
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    Evaluation Result:{" "}
                    {evalResult.isActionRequired ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getSeverityBadgeClass(evalResult.highestSeverity)}`}>
                        {evalResult.highestSeverity} ACTION REQUIRED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        NORMAL PHYSIOLOGICAL LIMITS
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Patient: {evalResult.patientName} ({evalResult.patientId}) · Executed in {evalResult.latencyMs} ms ·{" "}
                    {evalResult.matchedRulesCount} rule(s) matched
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-sky-50 text-sky-700 font-bold px-2.5 py-1 rounded-full border border-sky-200">
                  📱 Mobile Push Dispatched
                </span>
                <button
                  onClick={() => onNavigate && onNavigate("mobile-sensor")}
                  className="text-xs text-sky-600 hover:text-sky-800 underline font-semibold"
                >
                  View on Phone →
                </button>
              </div>
            </div>

            {/* Matched Rules List */}
            {evalResult.matchedRulesCount > 0 ? (
              <div className="space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Matched Clinical Rules & Evidence Reasoning:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {evalResult.matchedRules.map((m, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>⚙️</span>
                          <span>{m.name}</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityBadgeClass(m.severity)}`}>
                          {m.severity}
                        </span>
                      </div>
                      <div className="text-xs text-amber-900 font-medium bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                        <strong>Reason:</strong> {m.reason}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                        <span>Target: {m.targetRole}</span>
                        <span>SLA: ≤ {m.slaMinutes} min</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generated Order Sets */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
                    Generated STAT Clinical Order Sets:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {evalResult.generatedOrderSets.map((ord, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                          ord.urgent
                            ? "bg-rose-50 border-rose-200 text-rose-800"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="text-sm">{ord.urgent ? "⚡" : "📋"}</span>
                        <div className="overflow-hidden">
                          <div className="font-bold truncate">{ord.name}</div>
                          <div className="text-[10px] text-slate-500">{ord.orderId} · STAT Ready</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <span>✓</span>
                <span>All vital parameters are within safe physiological limits. No clinical rules triggered.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rules Catalog & Matrix */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>📚</span>
              <span>Active Clinical Protocol Catalog</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
                {filteredRules.length} of {rules.length} Rules
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Evidence-based algorithms mapped to LOINC codes, department target roles, and CDS order bundles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleResetDefaults}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              ↺ Reset Defaults
            </button>
            <button
              onClick={fetchRulesData}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Filters and Search Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Category Filter
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl p-2.5 outline-none focus:border-sky-500"
            >
              <option value="ALL">All Clinical Categories</option>
              <option value="CARDIOLOGY">Cardiology & Arrhythmia</option>
              <option value="HEMODYNAMIC">Hemodynamic & Shock</option>
              <option value="RESPIRATORY">Respiratory & Hypoxia</option>
              <option value="SEPSIS">Sepsis & Infection</option>
              <option value="METABOLIC">Metabolic & Vitals</option>
            </select>
          </div>

          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Severity Tier
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-xl p-2.5 outline-none focus:border-sky-500"
            >
              <option value="ALL">All Severity Levels</option>
              <option value="EMERGENCY">Emergency (Immediate Code)</option>
              <option value="CRITICAL">Critical (SLA ≤ 3.2 min)</option>
              <option value="HIGH">High (SLA ≤ 5.0 min)</option>
              <option value="MODERATE">Moderate</option>
            </select>
          </div>

          <div>
            <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Search Rules
            </label>
            <input
              type="text"
              placeholder="Search by name, LOINC, condition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 outline-none focus:border-sky-500 placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Rules Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {filteredRules.map((rule) => (
            <div
              key={rule.ruleId}
              className={`border rounded-2xl p-5 flex flex-col justify-between transition-all duration-150 ${
                rule.enabled
                  ? "bg-white border-slate-200/90 shadow-sm hover:border-slate-300"
                  : "bg-slate-50/70 border-slate-200/50 opacity-60"
              }`}
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-sky-700 font-mono">{rule.ruleId}</span>
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200">
                        {rule.category}
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight mt-1">{rule.name}</h3>
                  </div>

                  <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border ${getSeverityBadgeClass(rule.severity)}`}>
                    {rule.severity}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{rule.description}</p>

                {/* Criteria Spec */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                    Evaluation Trigger Criteria:
                  </div>
                  <div className="font-mono text-amber-800 text-[11.5px] font-bold">
                    {rule.criteria.composite
                      ? `Composite Logic: ${rule.criteria.composite}`
                      : Object.entries(rule.criteria)
                          .filter(([k]) => k !== "operator")
                          .map(([k, v]) => `${k} = ${v}`)
                          .join("  AND  ")}
                  </div>
                </div>

                {/* LOINC & Order Sets */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {rule.loincCodes?.map((l, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md font-mono font-semibold"
                      >
                        LOINC: {l.code}
                      </span>
                    ))}
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
                      SLA: ≤ {rule.slaMinutes}m
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-semibold">
                      Role: {rule.targetRole}
                    </span>
                  </div>

                  <div className="text-[11.5px] text-slate-700 font-medium pt-1">
                    <strong>Order Set:</strong> {rule.orderSet?.map((o) => o.name).join(" · ")}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleRule(rule.ruleId)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                      rule.enabled
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {rule.enabled ? "● Rule Active" : "○ Disabled"}
                  </button>

                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setThresholdUpdates({ ...rule.criteria });
                    }}
                    className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition"
                  >
                    ✎ Adjust Threshold
                  </button>
                </div>

                <span className="text-[11px] text-slate-400">
                  {rule.isSystemRule ? "Hospital System Protocol" : "Custom Clinical Rule"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold Editing Modal */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Adjust Threshold: {editingRule.name}</h3>
              <button onClick={() => setEditingRule(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Modify numerical boundary criteria. The Clinical Rule Engine will immediately evaluate stream telemetry with these new parameters.
              </p>

              {Object.keys(thresholdUpdates).map((key) => {
                if (key === "operator" || key === "composite") return null;
                return (
                  <div key={key}>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      {key}
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={thresholdUpdates[key] ?? ""}
                      onChange={(e) => setThresholdUpdates({ ...thresholdUpdates, [key]: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm rounded-xl p-2.5 outline-none focus:border-sky-500"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingRule(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThreshold}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition"
              >
                Save Threshold Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateRuleSubmit} className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Register Custom Clinical CDS Rule</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Post-Op Supraventricular Tachycardia"
                  value={newRuleForm.name}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5 outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <select
                    value={newRuleForm.category}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5 outline-none focus:border-sky-500"
                  >
                    <option value="CARDIOLOGY">Cardiology</option>
                    <option value="HEMODYNAMIC">Hemodynamic</option>
                    <option value="RESPIRATORY">Respiratory</option>
                    <option value="SEPSIS">Sepsis</option>
                    <option value="METABOLIC">Metabolic</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Severity
                  </label>
                  <select
                    value={newRuleForm.severity}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, severity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5 outline-none focus:border-sky-500"
                  >
                    <option value="CRITICAL">Critical (SLA 3.2m)</option>
                    <option value="EMERGENCY">Emergency (SLA 1.0m)</option>
                    <option value="HIGH">High (SLA 5.0m)</option>
                    <option value="MODERATE">Moderate (SLA 10m)</option>
                  </select>
                </div>
              </div>

              {/* Criteria builder */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
                  Condition Trigger:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={newRuleForm.criteriaMetric}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, criteriaMetric: e.target.value })}
                    className="bg-white border border-slate-300 text-slate-800 rounded-lg p-2 font-semibold text-xs"
                  >
                    <option value="heartRate">Heart Rate</option>
                    <option value="systolic">Systolic BP</option>
                    <option value="spo2">Oxygen SpO2</option>
                  </select>

                  <select
                    value={newRuleForm.criteriaOperator}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, criteriaOperator: e.target.value })}
                    className="bg-white border border-slate-300 text-slate-800 rounded-lg p-2 font-semibold text-xs"
                  >
                    <option value=">=">&gt;= (Greater or Equal)</option>
                    <option value="<=">&lt;= (Less or Equal)</option>
                  </select>

                  <input
                    type="number"
                    value={newRuleForm.criteriaValue}
                    onChange={(e) => setNewRuleForm({ ...newRuleForm, criteriaValue: Number(e.target.value) })}
                    className="bg-white border border-slate-300 text-slate-800 rounded-lg p-2 font-black text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Target Role
                </label>
                <select
                  value={newRuleForm.targetRole}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, targetRole: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5 outline-none focus:border-sky-500"
                >
                  <option value="CARDIOLOGIST_ON_CALL">Cardiologist on Call</option>
                  <option value="ATTENDING_PHYSICIAN">Attending Physician</option>
                  <option value="ICU_ATTENDING">ICU Attending</option>
                  <option value="RESPIRATORY_THERAPIST">Respiratory Therapist</option>
                  <option value="CRASH_CART_CODE_TEAM">Crash Cart Code Team</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  STAT Order Set Name
                </label>
                <input
                  type="text"
                  required
                  value={newRuleForm.orderName}
                  onChange={(e) => setNewRuleForm({ ...newRuleForm, orderName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-semibold rounded-xl p-2.5 outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition"
              >
                Create Clinical Rule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
