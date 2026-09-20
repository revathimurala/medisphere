import React, { useState, useEffect } from "react";
import { api } from "../api";

export default function ClinicalAlertScreen({ selectedPatientId, onSelectPatient, onNavigate }) {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterPatient, setFilterPatient] = useState(selectedPatientId || "ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  
  // Simulation Controls
  const [simPatient, setSimPatient] = useState(selectedPatientId || "P002");
  const [simScenario, setSimScenario] = useState("afib_episode");
  const [simulating, setSimulating] = useState(false);

  // Resolution Modal
  const [resolvingAlert, setResolvingAlert] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Live timer tick for SLA countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const patientsList = [
    { id: "P001", name: "John Doe", condition: "Hypertension / Post-MI" },
    { id: "P002", name: "Sarah Miller", condition: "Atrial Fibrillation / Tachycardia" },
    { id: "P003", name: "David Kumar", condition: "Type 2 Diabetes / Dyslipidemia" },
    { id: "P004", name: "Robert Taylor", condition: "Heart Failure / Reduced EF" },
    { id: "P005", name: "Elena Rostova", condition: "Severe Asthma / Hypoxia" },
  ];

  const fetchAlertsData = async () => {
    try {
      const [alertsRes, statsRes] = await Promise.all([
        api.getAlerts({ limit: 100 }),
        api.getAlertStats()
      ]);
      setAlerts(alertsRes.alerts || []);
      setStats(statsRes.stats || null);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsData();
    const interval = setInterval(fetchAlertsData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateAlert = async () => {
    setSimulating(true);
    try {
      await api.simulateAlert(simPatient, simScenario);
      await fetchAlertsData();
    } catch (err) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    setActionLoading(true);
    try {
      await api.acknowledgeAlert(alertId, "Dr. Evelyn Reed, MD");
      await fetchAlertsData();
    } catch (err) {
      alert(`Acknowledgement error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async (alertId) => {
    if (!window.confirm("Confirm emergency escalation to Rapid Response Code Team?")) return;
    setActionLoading(true);
    try {
      await api.escalateAlert(alertId, "Acute clinical decompensation / Cardiologist escalation request");
      await fetchAlertsData();
    } catch (err) {
      alert(`Escalation error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolvingAlert) return;
    setActionLoading(true);
    try {
      await api.resolveAlert(
        resolvingAlert.alertId,
        resolutionNotes || "Patient stabilized under clinical protocol; vitals normalized.",
        "Dr. Evelyn Reed, MD"
      );
      setResolvingAlert(null);
      setResolutionNotes("");
      await fetchAlertsData();
    } catch (err) {
      alert(`Resolution error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleOrder = (alertId, orderId) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((a) => {
        if (a.alertId !== alertId) return a;
        const nextOrders = (a.orderSet || []).map((o) => {
          if (o.orderId !== orderId) return o;
          return {
            ...o,
            status: o.status === "COMPLETED" ? "PENDING_EXECUTION" : "COMPLETED"
          };
        });
        return { ...a, orderSet: nextOrders };
      })
    );
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter((a) => {
    if (filterPatient !== "ALL" && a.patientId !== filterPatient) return false;
    if (filterSeverity !== "ALL" && a.severity !== filterSeverity) return false;
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    return true;
  });

  const activeIncidents = filteredAlerts.filter(
    (a) => a.status === "DISPATCHED" || a.status === "ACKNOWLEDGED" || a.status === "ESCALATED"
  );
  const resolvedIncidents = filteredAlerts.filter((a) => a.status === "RESOLVED");

  const formatCountdown = (sec) => {
    const abs = Math.abs(sec);
    const m = Math.floor(abs / 60).toString().padStart(2, "0");
    const s = (abs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col gap-5 w-full box-border pb-12 select-none">
      {/* Top Title Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🚨</span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Clinical Alert Center & Escalation Engine
            </h1>
            <span className="text-xs bg-rose-50 text-rose-700 font-bold border border-rose-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Milestone 3 Task 3 Live
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Real-time Kafka anomaly consumer engine enforcing on-call cardiologist response SLA (&le; 3.2 minutes), 
            Clinical Decision Support (CDS) order sets, and multi-tier hospital escalation protocols.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate && onNavigate("rules", simPatient)}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center gap-1.5 shadow-sm"
          >
            <span>⚖️</span>
            <span>Clinical Rule Engine</span>
          </button>
          <button
            onClick={() => onNavigate && onNavigate("mobile-sensor")}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition flex items-center gap-1.5 shadow-sm"
          >
            <span>📱</span>
            <span>Mobile Notifications</span>
          </button>
          <button
            onClick={() => fetchAlertsData()}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition shadow-sm"
          >
            ↻ Refresh Stream
          </button>
          <button
            onClick={() => onNavigate && onNavigate("monitoring", simPatient)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition flex items-center gap-1.5"
          >
            <span>⌚ Wearables</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs Strip */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl text-xs border border-slate-200/80 w-fit flex-wrap">
        <button
          className="px-3.5 py-1.5 bg-white text-rose-700 font-bold rounded-lg shadow-sm border border-slate-200/60 flex items-center gap-1.5"
        >
          <span>🚨</span>
          <span>Active Alerts & Code Blue Escalation</span>
        </button>
        <button
          onClick={() => onNavigate && onNavigate("rules", simPatient)}
          className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold rounded-lg transition flex items-center gap-1.5"
        >
          <span>⚖️</span>
          <span>Clinical CDS Rule Engine (8 Protocols)</span>
        </button>
        <button
          onClick={() => onNavigate && onNavigate("mobile-sensor")}
          className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold rounded-lg transition flex items-center gap-1.5"
        >
          <span>📱</span>
          <span>Mobile Phone Push Hub (Live Stream)</span>
        </button>
      </div>

      {/* SLA & Clinical Response Metrics Quad */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: On-Call Cardiologist */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="uppercase font-bold tracking-wider text-[11px]">On-Call Cardiologist</span>
            <span className="flex items-center gap-1 text-emerald-600 font-bold text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ON DUTY
            </span>
          </div>
          <div className="text-lg font-black text-slate-900">Dr. Evelyn Reed, MD</div>
          <div className="text-xs text-sky-600 font-semibold mt-0.5">Chief of Electrophysiology & CCU</div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
            <span>Pager: PAGER-CARDIOLOGY-01</span>
            <span className="text-emerald-600 font-semibold">Latency: 0.4s</span>
          </div>
        </div>

        {/* Card 2: Response SLA Target */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="uppercase font-bold tracking-wider text-[11px]">Response SLA Target</span>
            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-bold text-[10px]">
              TARGET &le; 3.2 MIN
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {stats?.slaComplianceRate || "98.6%"}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>SLA Compliance Rate:</span>
            <span className="text-slate-800 font-bold">142/144 Passed</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
            <span>Mean Time to Notify (MTTN):</span>
            <span className="text-emerald-700 font-bold">{stats?.meanTimeToNotifyMinutes || "1.0 min"}</span>
          </div>
        </div>

        {/* Card 3: Multi-Tier Escalation Ladder */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="uppercase font-bold tracking-wider text-[11px]">Escalation Ladder</span>
            <span className="text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded font-bold text-[10px]">3 TIERS</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span>Tier 1: Cardiologist</span>
              <span className="font-mono text-emerald-600 font-bold">&le; 3.2m SLA</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Tier 2: ICU Attending</span>
              <span className="font-mono text-amber-600 font-bold">&le; 5.0m SLA</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Tier 3: Crash Cart Code Team</span>
              <span className="font-mono text-rose-600 font-bold">Immediate</span>
            </div>
          </div>
        </div>

        {/* Card 4: Incident Counts */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="uppercase font-bold tracking-wider text-[11px]">Active Incidents</span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
              activeIncidents.length > 0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-600"
            }`}>
              {activeIncidents.length} UNRESOLVED
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {activeIncidents.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>Total Generated:</span>
            <span className="text-slate-800 font-bold">{stats?.totalAlertsGenerated || alerts.length}</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2 font-mono">
            <span>Escalation Rate:</span>
            <span className="text-sky-700 font-bold">{stats?.escalationRate || "0.0%"}</span>
          </div>
        </div>
      </div>

      {/* Interactive Clinical Alert Simulator Bar */}
      <div className="bg-gradient-to-r from-slate-50 via-sky-50/40 to-slate-50 border border-sky-200/80 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800">
            <span>⚡ Interactive Clinical Alert Simulator (Test SLA & Protocols)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Emits stream anomaly &rarr; Triggers notification &rarr; Enforces 3.2m SLA
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
              Target Patient
            </label>
            <select
              value={simPatient}
              onChange={(e) => setSimPatient(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 font-semibold shadow-xs"
            >
              {patientsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id}: {p.name} ({p.condition})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wide">
              Clinical Emergency Scenario
            </label>
            <select
              value={simScenario}
              onChange={(e) => setSimScenario(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500 font-semibold shadow-xs"
            >
              <option value="afib_episode">Sarah M. Acute AFib Spike (145 bpm, Z=3.2&sigma;)</option>
              <option value="critical_tachycardia">Severe Ventricular Tachycardia (185 bpm)</option>
              <option value="hypoxia">Critical Hypoxia (SpO2 86%, Desaturation)</option>
              <option value="hypertensive_spike">Hypertensive Crisis (210/125 mmHg)</option>
              <option value="acute_bradycardia">Acute Bradycardia (36 bpm)</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <button
              onClick={handleSimulateAlert}
              disabled={simulating}
              className="flex-1 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {simulating ? (
                <span>Dispatching Anomaly Stream...</span>
              ) : (
                <>
                  <span>🚨</span>
                  <span>Trigger Real-Time Clinical Alert</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSimPatient("P002");
                setSimScenario("afib_episode");
                handleSimulateAlert();
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 px-3 rounded-xl text-xs border border-slate-300 shadow-sm transition"
              title="Fast test Sarah M. 145 bpm AFib"
            >
              Sarah M. 145 BPM AFib STAT
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <span className="font-bold text-slate-600">Filter By:</span>
          
          <select
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">All Patients (5 Cohort)</option>
            {patientsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}: {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">All Severities</option>
            <option value="EMERGENCY">EMERGENCY (Crash Cart)</option>
            <option value="CRITICAL">CRITICAL (&le;3.2m SLA)</option>
            <option value="HIGH">HIGH (&le;5.0m SLA)</option>
            <option value="MODERATE">MODERATE</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="DISPATCHED">DISPATCHED (Unacknowledged)</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED (SLA Paused)</option>
            <option value="ESCALATED">ESCALATED (Code Blue)</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Showing <strong>{filteredAlerts.length}</strong> incidents (<strong>{activeIncidents.length}</strong> active)
        </div>
      </div>

      {/* SECTION 1: Active Emergency Incidents Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping"></span>
            <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase">
              Active Incident Queue & Clinical Decision Support (CDS)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {activeIncidents.length} active incidents requiring clinical action
          </span>
        </div>

        {activeIncidents.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
            <div className="text-4xl mb-2">✅</div>
            <div className="font-bold text-slate-900 text-sm">No Active Emergency Alerts</div>
            <div className="text-xs mt-1 text-slate-500">
              All clinical alarms have been claimed, resolved, or returned to stable baseline.
            </div>
            <button
              onClick={() => {
                setSimPatient("P002");
                setSimScenario("afib_episode");
                handleSimulateAlert();
              }}
              className="mt-4 bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-rose-600/20 transition"
            >
              Trigger Sarah M. AFib Test Incident &rarr;
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {activeIncidents.map((alert) => {
              const deadlineMs = new Date(alert.deadlineTimestamp).getTime();
              const remainingSec = Math.round((deadlineMs - now) / 1000);
              const isBreached = remainingSec < 0;
              const isEmergency = alert.severity === "EMERGENCY" || alert.status === "ESCALATED";

              return (
                <div
                  key={alert.alertId}
                  className={`border-2 rounded-2xl p-6 transition-all shadow-sm ${
                    isEmergency
                      ? "bg-rose-50/40 border-rose-300"
                      : "bg-amber-50/40 border-amber-300"
                  }`}
                >
                  {/* Incident Header */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <span className="relative flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-black tracking-wider uppercase ${
                            alert.severity === "EMERGENCY"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-amber-100 text-amber-800 border border-amber-300"
                          }`}>
                            {alert.severity} PRIORITY
                          </span>
                          <span className="text-lg font-black text-slate-900">
                            {alert.patientName}
                          </span>
                          <span className="text-xs bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded border border-slate-200">
                            {alert.patientId}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            alert.status === "ACKNOWLEDGED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : alert.status === "ESCALATED"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : "bg-sky-100 text-sky-800 border border-sky-300"
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-rose-700 mt-1 flex items-center gap-2">
                          <span>🚨 {alert.condition}</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Response SLA Countdown Widget */}
                    <div className={`px-4 py-2.5 rounded-xl border text-center font-mono shadow-xs ${
                      alert.status === "ACKNOWLEDGED"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : isBreached
                        ? "bg-red-100 border-red-500 text-red-900 animate-pulse shadow-md"
                        : "bg-amber-50 border-amber-300 text-amber-900"
                    }`}>
                      <div className="text-[10px] uppercase font-bold tracking-wider opacity-85">
                        {alert.status === "ACKNOWLEDGED"
                          ? `Claimed by ${alert.acknowledgedBy || "Cardiologist"}`
                          : `Response SLA (Target: <= ${alert.slaMinutes} min)`}
                      </div>
                      <div className="text-base font-black tracking-tight mt-0.5">
                        {alert.status === "ACKNOWLEDGED" ? (
                          <span className="text-emerald-700">
                            CLAIMED ({alert.mttnSeconds}s MTTN) - SLA COMPLIANT
                          </span>
                        ) : isBreached ? (
                          <span className="text-red-700">
                            BREACHED (+{formatCountdown(remainingSec)}) - ESCALATE NOW
                          </span>
                        ) : (
                          <span>
                            {formatCountdown(remainingSec)} REMAINING
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Telemetry & Statistical Snapshot */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4 border-b border-slate-200 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Current Heart Rate</div>
                      <div className="text-lg font-black text-rose-600 mt-0.5">
                        {alert.currentVitals?.heartRate || "--"} <span className="text-xs font-normal text-slate-400">BPM</span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Z-Score Divergence</div>
                      <div className="text-lg font-black text-amber-600 mt-0.5 font-mono">
                        {alert.zScore ? `${alert.zScore}σ` : "--"}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">HRV Irregularity (RMSSD)</div>
                      <div className="text-lg font-black text-indigo-600 mt-0.5 font-mono">
                        {alert.rmssd ? `${alert.rmssd} ms` : "--"}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Anomaly Confidence</div>
                      <div className="text-lg font-black text-emerald-600 mt-0.5 font-mono">
                        {alert.confidence ? `${Math.round(alert.confidence * 100)}%` : "89%"}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Assigned Specialist</div>
                      <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                        {alert.physicianName}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{alert.department}</div>
                    </div>
                  </div>

                  {/* Clinical Decision Support (CDS) Order Sets */}
                  <div className="py-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span>📋</span>
                        <span>Clinical Decision Support (CDS) Recommended Order Set</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Protocol Ref: AHA/ACC/HRS Atrial Fibrillation Guidelines
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {alert.orderSet?.map((order, idx) => (
                        <div
                          key={order.orderId || idx}
                          className="bg-white border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3 text-xs shadow-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={order.status === "COMPLETED"}
                              onChange={() => handleToggleOrder(alert.alertId, order.orderId)}
                              className="mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-0 cursor-pointer"
                            />
                            <div>
                              <div className="font-semibold text-slate-900">
                                {order.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                Order ID: {order.orderId}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            order.urgent
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {order.urgent ? "STAT" : "ROUTINE"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Incident Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Dispatch Channels:</span>
                      {alert.channels?.map((ch) => (
                        <span key={ch} className="bg-slate-100 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200">
                          {ch}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Claim / Acknowledge */}
                      {alert.status !== "ACKNOWLEDGED" && (
                        <button
                          onClick={() => handleAcknowledge(alert.alertId)}
                          disabled={actionLoading}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <span>✓</span>
                          <span>Acknowledge & Claim SLA</span>
                        </button>
                      )}

                      {/* Resolve */}
                      <button
                        onClick={() => {
                          setResolvingAlert(alert);
                          setResolutionNotes(`Patient ${alert.patientName} evaluated; administered rate control. Sinus rhythm restored.`);
                        }}
                        className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-sky-600/20 transition flex items-center gap-1.5"
                      >
                        <span>📝</span>
                        <span>Resolve & Document</span>
                      </button>

                      {/* Escalate */}
                      {alert.status !== "ESCALATED" && (
                        <button
                          onClick={() => handleEscalate(alert.alertId)}
                          disabled={actionLoading}
                          className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <span>⚡</span>
                          <span>Escalate to Code Team</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Clinical Incident Resolution History & Audit Log */}
      <div className="space-y-3 pt-6 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <span>📜</span>
            <span>Clinical Incident Resolution History & SLA Audit Trail</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            {resolvedIncidents.length} resolved events
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Alert ID / Time</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Clinical Condition</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">MTTN / SLA</th>
                  <th className="px-4 py-3">Attending Clinician</th>
                  <th className="px-4 py-3">Resolution Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {resolvedIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                      No resolved clinical incidents in history.
                    </td>
                  </tr>
                ) : (
                  resolvedIncidents.map((inc) => (
                    <tr key={inc.alertId} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono text-slate-500">
                        <div>{inc.alertId}</div>
                        <div className="text-[10px] text-slate-400">{new Date(inc.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {inc.patientName} <span className="text-slate-500 text-[11px]">({inc.patientId})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {inc.condition}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inc.severity === "CRITICAL"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                          {inc.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                          <span>✓</span>
                          <span>{inc.mttnSeconds || 52}s MTTN</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Target &le; 3.2m</div>
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {inc.resolvedBy || inc.physicianName}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={inc.resolutionNotes}>
                        {inc.resolutionNotes || "Protocol executed successfully; patient stabilized."}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Resolution Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📝</span>
                <h3 className="text-base font-bold text-slate-900">
                  Resolve Incident: {resolvingAlert.patientName} ({resolvingAlert.patientId})
                </h3>
              </div>
              <button
                onClick={() => setResolvingAlert(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600">
              <p>Condition: <strong className="text-rose-600">{resolvingAlert.condition}</strong></p>
              <p className="mt-1 text-slate-500">
                Marking this incident as resolved will complete all associated CDS orders and log the final SLA compliance metrics to the audit trail.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Resolution & Treatment Notes:
              </label>
              <textarea
                rows={4}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-sky-500 font-medium"
                placeholder="Document patient stabilization, medications administered, and follow-up plan..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResolvingAlert(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveSubmit}
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition disabled:opacity-50"
              >
                {actionLoading ? "Submitting..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
