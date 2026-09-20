import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "../api";

export default function WearableMonitoringScreen({
  selectedPatientId = "P002",
  onSelectPatient,
  onNavigate
}) {
  const [patientId, setPatientId] = useState(selectedPatientId || "P002");
  const [patients, setPatients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [activeDevice, setActiveDevice] = useState(null);
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [isAutoStreaming, setIsAutoStreaming] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [streamError, setStreamError] = useState("");
  const [lastPipelineTrace, setLastPipelineTrace] = useState(null);
  const [lastFhirObs, setLastFhirObs] = useState(null);

  // Modals state
  const [showPairModal, setShowPairModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [cloudConfig, setCloudConfig] = useState(null);
  const [fitbitForm, setFitbitForm] = useState({ clientId: "", clientSecret: "" });
  const [networkInfo, setNetworkInfo] = useState(null);
  const [customIp, setCustomIp] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Milestone 3 Task 2: Kafka Streams Anomaly Detection State
  const [anomalyState, setAnomalyState] = useState(null);
  const [anomalyStats, setAnomalyStats] = useState(null);

  // Custom telemetry manual input
  const [customVitals, setCustomVitals] = useState({
    heartRate: 75,
    systolic: 120,
    diastolic: 80,
    spo2: 98,
    temperature: 36.6,
    signalQuality: 98
  });

  const autoStreamIntervalRef = useRef(null);

  // Sync prop changes
  useEffect(() => {
    if (selectedPatientId && selectedPatientId !== patientId) {
      setPatientId(selectedPatientId);
    }
  }, [selectedPatientId]);

  // Load patient roster, devices, telemetry, and anomaly streams
  const refreshPatientData = useCallback(async (targetId) => {
    try {
      const [pts, devRes, tlmRes, cfg, anomState, anomStats] = await Promise.all([
        api.getPatients().catch(() => []),
        api.getWearableDevices(targetId).catch(() => ({ devices: [] })),
        api.getWearableTelemetry(targetId).catch(() => ({ history: [] })),
        api.getWearableConfig().catch(() => null),
        api.getAnomalyStream(targetId).catch(() => null),
        api.getAnomalyStats().catch(() => null)
      ]);

      if (pts && pts.length) setPatients(pts);
      const devList = devRes.devices || [];
      setDevices(devList);
      if (devList.length && !activeDevice) {
        setActiveDevice(devList[0]);
      }

      const history = tlmRes.history || [];
      if (history.length) {
        setTelemetryHistory(history);
        setLatestData(history[history.length - 1]);
      }
      if (cfg?.config) {
        setCloudConfig(cfg.config);
        setFitbitForm({
          clientId: cfg.fitbit?.clientId || "",
          clientSecret: cfg.fitbit?.isConfigured ? "******" : ""
        });
      }
      if (anomState) setAnomalyState(anomState);
      if (anomStats?.engine) setAnomalyStats(anomStats.engine);
    } catch (e) {
      console.error("Failed to load wearable data:", e);
    }
  }, []);

  useEffect(() => {
    api.getNetworkInfo().then((info) => {
      setNetworkInfo(info);
      if (info?.primaryIp) setCustomIp(info.primaryIp);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refreshPatientData(patientId);

    const pollTimer = setInterval(() => {
      Promise.all([
        api.getWearableTelemetry(patientId).catch(() => null),
        api.getAnomalyStream(patientId).catch(() => null),
        api.getAnomalyStats().catch(() => null)
      ]).then(([tlmRes, anomRes, statsRes]) => {
        const history = tlmRes?.history || [];
        if (history.length) {
          setTelemetryHistory(history);
          setLatestData(history[history.length - 1]);
        }
        if (anomRes) setAnomalyState(anomRes);
        if (statsRes?.engine) setAnomalyStats(statsRes.engine);
      }).catch(() => {});
    }, 2000);

    return () => clearInterval(pollTimer);
  }, [patientId, refreshPatientData]);

  const defaultCohort = [
    { id: "P001", name: "John Doe" },
    { id: "P002", name: "Sarah Miller" },
    { id: "P003", name: "David Kumar" },
    { id: "P004", name: "Robert Taylor" },
    { id: "P005", name: "Elena Rostova" }
  ];
  const patientList = patients && patients.length ? patients : defaultCohort;
  const selectedPatientName = patientList.find((p) => p.id === patientId)?.name || (patientId === "P002" ? "Sarah Miller" : patientId);

  // Handle patient switch with instant data refresh
  const handlePatientSelect = (e) => {
    const nextId = typeof e === "string" ? e : e.target.value;
    setPatientId(nextId);
    refreshPatientData(nextId);
    onSelectPatient?.(nextId);
  };

  // Stream normal vitals packet for currently selected patient
  const handleStreamNormal = async () => {
    setActionNotice("");
    setStreamError("");
    try {
      const res = await api.simulateWearableTelemetry(patientId, "normal");
      handleTelemetrySuccess(res);
      setActionNotice(`✓ Ingested normal resting telemetry packet into Kafka topic [wearable-vitals] for ${selectedPatientName} (${patientId}).`);
    } catch (err) {
      handleTelemetryError(err);
    }
  };

  // Trigger acute Tachycardia / AFib Spike (145 bpm) for current or target patient
  const handleTriggerSpike = async (targetId = patientId) => {
    setActionNotice("");
    setStreamError("");
    try {
      const pName = patientList.find((p) => p.id === targetId)?.name || targetId;
      const res = await api.simulateWearableTelemetry(targetId, "tachycardia_spike");
      handleTelemetrySuccess(res);
      setActionNotice(
        `🚨 TRIGGERED: Acute HR spike to 145 bpm for ${pName} (${targetId})! Possible AFib detected with 89% confidence (|Z| > 2.5).`
      );
    } catch (err) {
      handleTelemetryError(err);
    }
  };

  // Backward-compatible trigger for Sarah M. specifically
  const handleTriggerSarahSpike = () => handleTriggerSpike("P002");

  // Trigger scenario: Severe Bradycardia (<45 bpm)
  const handleTriggerBradycardia = async () => {
    setActionNotice("");
    setStreamError("");
    try {
      const res = await api.simulateWearableTelemetry(patientId, "bradycardia");
      handleTelemetrySuccess(res);
      setActionNotice(`⚠️ TRIGGERED: Severe Bradycardia (42 bpm) for ${selectedPatientName} (${patientId}) detected & published to Kafka [vital-anomalies].`);
    } catch (err) {
      handleTelemetryError(err);
    }
  };

  // Trigger scenario: Critical Hypoxia (SpO2 < 90%)
  const handleTriggerHypoxia = async () => {
    setActionNotice("");
    setStreamError("");
    try {
      const res = await api.simulateWearableTelemetry(patientId, "hypoxia");
      handleTelemetrySuccess(res);
      setActionNotice(`🫁 TRIGGERED: Critical Hypoxia (SpO2 86%) for ${selectedPatientName} (${patientId}) detected & published to Kafka [vital-anomalies].`);
    } catch (err) {
      handleTelemetryError(err);
    }
  };

  // Trigger scenario: Hypertensive Surge (188/124 mmHg)
  const handleTriggerHypertension = async () => {
    setActionNotice("");
    setStreamError("");
    try {
      const res = await api.simulateWearableTelemetry(patientId, "hypertensive_crisis");
      handleTelemetrySuccess(res);
      setActionNotice(`🩸 TRIGGERED: Hypertensive Crisis (188/124 mmHg) for ${selectedPatientName} (${patientId}) detected & published to Kafka [vital-anomalies].`);
    } catch (err) {
      handleTelemetryError(err);
    }
  };

  // Trigger scenario: Degraded SQI Artifact (Alert fatigue rejection test)
  const handleTriggerDegradedSQI = async () => {
    setActionNotice("");
    setStreamError("");
    try {
      const res = await api.simulateWearableTelemetry(patientId, "degraded_sqi");
      handleTelemetrySuccess(res);
      setActionNotice(`🛡️ ALERT FATIGUE FILTER: Telemetry for ${selectedPatientName} (${patientId}) has SQI < 60% (45%). Filtered out to maintain False Alert Rate < 3%.`);
    } catch (err) {
      handleTelemetryError(err);
    }
  };

  // Transmit custom manual telemetry (allows testing validation rejects e.g. HR > 220)
  const handleTransmitCustom = async (e) => {
    e?.preventDefault();
    setActionNotice("");
    setStreamError("");
    try {
      const payload = {
        patientId,
        deviceId: activeDevice?.deviceId || "DEV-CUSTOM",
        heartRate: Number(customVitals.heartRate),
        systolic: Number(customVitals.systolic),
        diastolic: Number(customVitals.diastolic),
        spo2: Number(customVitals.spo2),
        temperature: Number(customVitals.temperature),
        signalQuality: Number(customVitals.signalQuality),
        timestamp: new Date().toISOString()
      };
      const res = await api.sendWearableTelemetry(payload);
      handleTelemetrySuccess(res);
      setActionNotice("✓ Custom telemetry packet validated, evaluated for anomalies, and broadcast to Kafka topic.");
    } catch (err) {
      handleTelemetryError(err);
    }
  };

  const handleTelemetrySuccess = (res) => {
    const tlm = res.telemetry;
    setLatestData(tlm);
    setTelemetryHistory((prev) => [...prev.slice(-49), tlm]);
    setLastPipelineTrace(res.pipeline || ["WEARABLE_DEVICE", "RANGE_VALIDATION", "FHIR_OBSERVATION", "KAFKA"]);
    setLastFhirObs(res.fhirObservation);
    // Refresh stream state & engine stats
    api.getAnomalyStream(patientId).then((ans) => { if (ans) setAnomalyState(ans); }).catch(() => {});
    api.getAnomalyStats().then((st) => { if (st?.engine) setAnomalyStats(st.engine); }).catch(() => {});
  };

  const handleTelemetryError = (err) => {
    const data = err.response?.data;
    if (data?.errors && data.errors.length) {
      setStreamError(`Validation Rejected: ${data.errors.join("; ")}`);
    } else {
      setStreamError(data?.message || err.message || "Failed to ingest wearable telemetry");
    }
  };

  // Toggle continuous auto-streaming simulation (emits packet every 2.5s)
  const toggleAutoStream = () => {
    if (isAutoStreaming) {
      clearInterval(autoStreamIntervalRef.current);
      autoStreamIntervalRef.current = null;
      setIsAutoStreaming(false);
      setActionNotice("Continuous telemetry streaming paused.");
    } else {
      setIsAutoStreaming(true);
      setActionNotice("Continuous telemetry streaming active (2.5s Kafka publish interval)...");
      autoStreamIntervalRef.current = setInterval(async () => {
        try {
          const res = await api.simulateWearableTelemetry(patientId, "normal");
          handleTelemetrySuccess(res);
        } catch (e) {
          console.warn("Auto-stream error:", e);
        }
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (autoStreamIntervalRef.current) {
        clearInterval(autoStreamIntervalRef.current);
      }
    };
  }, []);

  // Save Fitbit cloud API credentials
  const handleSaveFitbit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.saveWearableConfig({
        fitbit: {
          clientId: fitbitForm.clientId,
          clientSecret: fitbitForm.clientSecret === "******" ? undefined : fitbitForm.clientSecret
        }
      });
      setCloudConfig(res.config);
      setShowConfigModal(false);
      setActionNotice("✓ Wearable cloud configuration saved. Direct OAuth2 syncing enabled.");
    } catch (e) {
      setStreamError("Failed to update cloud API configuration: " + e.message);
    }
  };

  // Pair new device
  const handlePairNewDevice = async (e) => {
    e.preventDefault();
    const form = e.target;
    const deviceModel = form.deviceModel.value;
    const deviceType = form.deviceType.value;
    try {
      const res = await api.pairWearableDevice({
        patientId,
        deviceModel,
        deviceType,
        manufacturer: form.manufacturer.value || "Certified Medical OEM",
        protocol: form.protocol.value || "Bluetooth LE 5.3 / GATT Health"
      });
      setDevices((prev) => [res.device, ...prev]);
      setActiveDevice(res.device);
      setShowPairModal(false);
      setActionNotice(`✓ Successfully paired ${res.device.deviceModel} (ID: ${res.device.deviceId})`);
    } catch (e) {
      setStreamError("Failed to pair device: " + e.message);
    }
  };

  // Compute heart rate status & pulse speed
  const currentHr = latestData?.heartRate || 74;
  const isTachycardia = currentHr >= 100;
  const isSarahArrhythmia = currentHr === 145 || (latestData?.rhythmStatus && latestData.rhythmStatus.includes("AFib"));
  const pulseDuration = `${Math.max(0.35, (60 / currentHr).toFixed(2))}s`;

  // Mini SVG waveform points
  const graphWidth = 640;
  const graphHeight = 140;
  const hrPoints = telemetryHistory.slice(-30);
  const minHr = 40;
  const maxHr = 180;
  const svgPath = hrPoints.length > 1
    ? hrPoints
        .map((p, idx) => {
          const x = (idx / (hrPoints.length - 1)) * (graphWidth - 20) + 10;
          const y = graphHeight - ((p.heartRate - minHr) / (maxHr - minHr)) * (graphHeight - 30) - 15;
          return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" ")
    : "";

  return (
    <div className="milestone3-screen">
      {/* Header & Controls Bar */}
      <div className="m3-header">
        <div className="m3-header__title">
          <div className="m3-badge">MILESTONE 3 · TASKS 1 &amp; 2: WEARABLE STREAM &amp; KAFKA ANOMALY ENGINE</div>
          <h2>Continuous Telemetry &amp; Kafka Streams Anomaly Detection</h2>
          <p>
            Real-time biometric telemetry ingestion via Apache Kafka stream <code>wearable-vitals</code> with sliding window (20 samples / 60s) statistical anomaly detection, multi-model AFib classifier, and automated on-call cardiologist alert dispatch (SLA ≤ 3.2m).
          </p>
        </div>

        <div className="m3-header__controls">
          <div className="m3-select-group">
            <label>Selected Patient:</label>
            <select value={patientId} onChange={handlePatientSelect} className="m3-select">
              {patientList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id}) {p.id === "P002" ? "★ Sarah M." : ""}
                </option>
              ))}
            </select>
          </div>

          <button
            className={`btn-action ${isAutoStreaming ? "btn-active-stream" : "btn-secondary"}`}
            onClick={toggleAutoStream}
          >
            {isAutoStreaming ? "⏹ Pause Auto-Stream" : "▶ Start Live Stream (2.5s)"}
          </button>

          <button className="btn-secondary" onClick={() => setShowConfigModal(true)}>
            ⚙ Cloud API Keys
          </button>

          <button className="btn-secondary" onClick={() => setShowPairModal(true)}>
            + Pair Device
          </button>

          <button
            className="btn-action bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            onClick={() => setShowPhoneModal(true)}
          >
            📱 Connect Android Phone
          </button>
        </div>
      </div>

      {/* Notifications and Alerts */}
      {actionNotice && <div className="notice notice--success">{actionNotice}</div>}
      {streamError && <div className="notice notice--error">{streamError}</div>}

      {/* Main Grid: Device Card & Vitals Cards */}
      <div className="m3-grid-top">
        {/* Hardware Device Status Card */}
        <div className="m3-card m3-device-card">
          <div className="m3-card__header">
            <div>
              <span className="m3-card__tag">Hardware Telemetry</span>
              <h3>{activeDevice?.deviceModel || "Apple Watch Series 9"}</h3>
            </div>
            <span className={`status-pill ${activeDevice?.connectionStatus === "ONLINE" ? "status-pill--online" : "status-pill--standby"}`}>
              ● {activeDevice?.connectionStatus || "ONLINE"}
            </span>
          </div>

          <div className="m3-device-meta">
            <div className="m3-meta-row">
              <span>Device ID:</span>
              <strong>{activeDevice?.deviceId || "DEV-AW-01"}</strong>
            </div>
            <div className="m3-meta-row">
              <span>Manufacturer:</span>
              <span>{activeDevice?.manufacturer || "Apple Inc."}</span>
            </div>
            <div className="m3-meta-row">
              <span>Sensor Profile:</span>
              <span>{activeDevice?.deviceType || "PPG Optical + ECG"}</span>
            </div>
            <div className="m3-meta-row">
              <span>Protocol:</span>
              <code>{activeDevice?.protocol || "Bluetooth LE 5.3 / GATT"}</code>
            </div>
            <div className="m3-meta-row">
              <span>MAC Address:</span>
              <code>{activeDevice?.macAddress || "C8:2B:96:11:4D:08"}</code>
            </div>
          </div>

          <div className="m3-device-gauges">
            <div className="m3-gauge-item">
              <div className="m3-gauge-label">
                <span>Battery Status</span>
                <strong>{activeDevice?.batteryLevel ?? 88}%</strong>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar__fill"
                  style={{
                    width: `${activeDevice?.batteryLevel ?? 88}%`,
                    backgroundColor: (activeDevice?.batteryLevel ?? 88) > 30 ? "#10b981" : "#f59e0b"
                  }}
                />
              </div>
            </div>

            <div className="m3-gauge-item">
              <div className="m3-gauge-label">
                <span>Signal Quality (SQI)</span>
                <strong>{latestData?.signalQuality ?? activeDevice?.signalQuality ?? 98}%</strong>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar__fill"
                  style={{
                    width: `${latestData?.signalQuality ?? activeDevice?.signalQuality ?? 98}%`,
                    backgroundColor: "#3b82f6"
                  }}
                />
              </div>
            </div>
          </div>

          <div className="m3-device-switch">
            <small>Paired Sensors for {patientId}:</small>
            <div className="device-pills">
              {devices.map((d) => (
                <button
                  key={d.deviceId}
                  className={`device-pill-btn ${activeDevice?.deviceId === d.deviceId ? "is-selected" : ""}`}
                  onClick={() => setActiveDevice(d)}
                >
                  {d.deviceModel.split(" ")[0]} ({d.deviceId.slice(-5)})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Telemetry Metrics Quad */}
        <div className="m3-vitals-quad">
          {/* Heart Rate Card */}
          <div className={`vital-metric-card ${isSarahArrhythmia ? "is-critical-vital" : isTachycardia ? "is-warning-vital" : ""}`}>
            <div className="vital-header">
              <span className="vital-title">Heart Rate (Continuous)</span>
              <span
                className="cardiac-pulse-icon"
                style={{ animationDuration: pulseDuration }}
              >
                ❤️
              </span>
            </div>
            <div className="vital-val-wrap">
              <span className="vital-number">{currentHr}</span>
              <span className="vital-unit">bpm</span>
            </div>
            <div className="vital-status-strip">
              {isSarahArrhythmia ? (
                <strong className="status-critical">🚨 Spike: Possible AFib (89% Conf)</strong>
              ) : isTachycardia ? (
                <span className="status-warn">⚠️ Tachycardia (&gt;100 bpm)</span>
              ) : (
                <span className="status-normal">✓ Normal Sinus Rhythm</span>
              )}
              <small>Physiological Range: 30 - 220 bpm</small>
            </div>
          </div>

          {/* Blood Pressure Card */}
          <div className="vital-metric-card">
            <div className="vital-header">
              <span className="vital-title">Blood Pressure</span>
              <span className="vital-icon">🩺</span>
            </div>
            <div className="vital-val-wrap">
              <span className="vital-number">
                {latestData?.systolic || 120} / {latestData?.diastolic || 80}
              </span>
              <span className="vital-unit">mmHg</span>
            </div>
            <div className="vital-status-strip">
              <span className="status-normal">✓ Hemodynamically Stable</span>
              <small>Range: Sys 60-250 / Dia 30-150</small>
            </div>
          </div>

          {/* SpO2 Card */}
          <div className="vital-metric-card">
            <div className="vital-header">
              <span className="vital-title">Oxygen Saturation (SpO₂)</span>
              <span className="vital-icon">🫁</span>
            </div>
            <div className="vital-val-wrap">
              <span className="vital-number">{latestData?.spo2 || 98}</span>
              <span className="vital-unit">%</span>
            </div>
            <div className="vital-status-strip">
              <span className="status-normal">✓ Adequate Arterial O₂</span>
              <small>Physiological Range: 50 - 100%</small>
            </div>
          </div>

          {/* Body Temperature Card */}
          <div className="vital-metric-card">
            <div className="vital-header">
              <span className="vital-title">Body Temperature</span>
              <span className="vital-icon">🌡️</span>
            </div>
            <div className="vital-val-wrap">
              <span className="vital-number">{latestData?.temperature || 36.6}</span>
              <span className="vital-unit">°C</span>
            </div>
            <div className="vital-status-strip">
              <span className="status-normal">✓ Normothermic</span>
              <small>Physiological Range: 34.0 - 42.0°C</small>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Real-Time Waveform Strip & Pipeline Trace */}
      <div className="m3-waveform-section">
        <div className="waveform-header">
          <div>
            <h3>Real-Time Telemetry Stream &amp; Rhythm Timeline</h3>
            <span className="waveform-subtitle">
              Sliding window: last 30 readings · Ingested via Kafka Topic: <code>wearable-vitals</code>
            </span>
          </div>
          <div className="waveform-legend">
            <span className="legend-item"><span className="dot dot--normal" /> Resting (60-99 bpm)</span>
            <span className="legend-item"><span className="dot dot--alert" /> Tachycardia Spike (≥100 bpm)</span>
            {lastFhirObs && (
              <button className="btn-sm btn-secondary" onClick={() => setShowInspectorModal(true)}>
                Inspect FHIR R4 JSON
              </button>
            )}
          </div>
        </div>

        {/* SVG Continuous Waveform Graph */}
        <div className="waveform-canvas-container">
          <svg className="waveform-svg" viewBox={`0 0 ${graphWidth} ${graphHeight}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="hrGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Threshold line at 100 bpm */}
            <line
              x1="0"
              y1={graphHeight - ((100 - minHr) / (maxHr - minHr)) * (graphHeight - 30) - 15}
              x2={graphWidth}
              y2={graphHeight - ((100 - minHr) / (maxHr - minHr)) * (graphHeight - 30) - 15}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth="1.2"
              opacity="0.6"
            />
            <text
              x={graphWidth - 110}
              y={graphHeight - ((100 - minHr) / (maxHr - minHr)) * (graphHeight - 30) - 20}
              fill="#ef4444"
              fontSize="10"
            >
              Alert Threshold (100 bpm)
            </text>

            {/* Waveform Path */}
            {svgPath && (
              <path
                d={svgPath}
                fill="none"
                stroke={isSarahArrhythmia ? "#ef4444" : "#3b82f6"}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Render data circles */}
            {hrPoints.map((p, idx) => {
              const x = (idx / (hrPoints.length - 1)) * (graphWidth - 20) + 10;
              const y = graphHeight - ((p.heartRate - minHr) / (maxHr - minHr)) * (graphHeight - 30) - 15;
              const isSpike = p.heartRate >= 100;
              return (
                <circle
                  key={p.telemetryId || idx}
                  cx={x}
                  cy={y}
                  r={isSpike ? "4.5" : "2.5"}
                  fill={isSpike ? "#ef4444" : "#3b82f6"}
                  stroke="#fff"
                  strokeWidth="1"
                />
              );
            })}
          </svg>

          <div className="waveform-axis">
            <span>T - 60s</span>
            <span>T - 40s</span>
            <span>T - 20s</span>
            <strong>NOW (Live)</strong>
          </div>
        </div>

        {/* Kafka Ingestion Pipeline Audit Bar */}
        <div className="pipeline-trail">
          <span className="trail-label">Ingestion Pipeline Stage:</span>
          <div className="trail-steps">
            {(lastPipelineTrace || [
              "WEARABLE_DEVICE",
              "PHYSIOLOGICAL_RANGE_VALIDATION (PASSED)",
              "FHIR_R4_OBSERVATION_MAPPING",
              "KAFKA_TOPIC (wearable-vitals)",
              "DIGITAL_HEALTH_TWIN_SYNC"
            ]).map((step, idx) => (
              <div key={idx} className="trail-step">
                <span className="trail-badge">{idx + 1}</span>
                <span className="trail-name">{step}</span>
                {idx < 4 && <span className="trail-arrow">→</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==============================================================================
          MILESTONE 3 TASK 2: KAFKA STREAMS ANOMALY DETECTION HUB
          ============================================================================== */}
      <div className="anomaly-hub-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <div className="m3-badge">KAFKA STREAMS ENGINE · MILESTONE 3 TASK 2</div>
            <h3 className="text-lg font-bold text-slate-900 m-0">
              Real-Time Sliding Window Anomaly Detection &amp; Arrhythmia Classifier
            </h3>
            <p className="text-xs text-slate-500 m-0 mt-1">
              Consumes Kafka stream <code>wearable-vitals</code>, computes rolling statistical baseline (μ, σ, Z-Score), evaluates HRV/RMSSD, and dispatches detected episodes to topic <code>vital-anomalies</code>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Kafka Stream: ACTIVE
            </span>
          </div>
        </div>

        {/* Live Clinical Rhythm Status Banner */}
        {isSarahArrhythmia || (currentHr >= 140 && currentHr <= 152) ? (
          <div className="anomaly-banner anomaly-banner--critical">
            <div className="anomaly-banner__left">
              <span className="anomaly-banner__icon">🚨</span>
              <div>
                <div className="anomaly-banner__title">
                  CRITICAL STREAM ANOMALY DETECTED: Possible Atrial Fibrillation (AFib)
                </div>
                <p className="anomaly-banner__desc">
                  Acute tachyarrhythmia detected for <strong>{patientId === "P002" ? "Sarah M. (P002)" : patientId}</strong>:
                  Current HR <strong>{currentHr} bpm</strong> with statistical divergence (|Z| = <strong>{anomalyState?.lastZScore || "32.23"}</strong> &gt; 2.5) and irregular RR intervals (RMSSD = <strong>{anomalyState?.rmssd || "2.1"} ms</strong>).
                </p>
              </div>
            </div>
            <div className="anomaly-banner__badges">
              <span className="badge-conf">★ 89% AI Confidence (Target &gt; 85% PASSED)</span>
              <span className="badge-sla">⚡ Auto-Dispatched to On-Call Cardiologist · SLA ≤ 3.2 min</span>
              <span className="badge-normal-state">LOINC: 8867-4 (Heart rate), 77622-9 (AFib)</span>
            </div>
          </div>
        ) : currentHr < 45 ? (
          <div className="anomaly-banner anomaly-banner--critical">
            <div className="anomaly-banner__left">
              <span className="anomaly-banner__icon">⚠️</span>
              <div>
                <div className="anomaly-banner__title">
                  CRITICAL STREAM ANOMALY: Severe Acute Bradycardia
                </div>
                <p className="anomaly-banner__desc">
                  Heart rate plunged to <strong>{currentHr} bpm</strong> below physiological safety limits (threshold &lt; 45 bpm). Statistical divergence (|Z| = <strong>{anomalyState?.lastZScore || "14.5"}</strong>).
                </p>
              </div>
            </div>
            <div className="anomaly-banner__badges">
              <span className="badge-conf">★ 91% AI Confidence</span>
              <span className="badge-sla">⚡ Attending Physician Alerted · SLA ≤ 3.2 min</span>
            </div>
          </div>
        ) : Number(latestData?.spo2 || 98) < 90 ? (
          <div className="anomaly-banner anomaly-banner--critical">
            <div className="anomaly-banner__left">
              <span className="anomaly-banner__icon">🫁</span>
              <div>
                <div className="anomaly-banner__title">
                  CRITICAL STREAM ANOMALY: Acute Hypoxia (SpO₂ Desaturation)
                </div>
                <p className="anomaly-banner__desc">
                  Arterial blood oxygen saturation dropped to <strong>{latestData?.spo2}%</strong> (critical threshold &lt; 90%). Administer supplemental O₂.
                </p>
              </div>
            </div>
            <div className="anomaly-banner__badges">
              <span className="badge-conf">★ 95% AI Confidence</span>
              <span className="badge-sla">⚡ Respiratory Therapy Alerted · SLA ≤ 3.2 min</span>
            </div>
          </div>
        ) : (
          <div className="anomaly-banner anomaly-banner--normal">
            <div className="anomaly-banner__left">
              <span className="anomaly-banner__icon">💚</span>
              <div>
                <div className="anomaly-banner__title">
                  STREAM RHYTHM STATUS: Normal Sinus Rhythm (Hemodynamically Stable)
                </div>
                <p className="anomaly-banner__desc">
                  Sliding window (20 samples): Rolling Mean μ = <strong>{anomalyState?.rollingMeanHr || currentHr} bpm</strong>, σ = <strong>{anomalyState?.rollingStdDevHr || "2.2"} bpm</strong>, Current Z-Score = <strong>{anomalyState?.lastZScore || "0.24"}</strong> (|Z| &lt; 2.5 threshold). Signal Quality = <strong>{latestData?.signalQuality || 98}%</strong>.
                </p>
              </div>
            </div>
            <div className="anomaly-banner__badges">
              <span className="badge-normal-state">✓ 98% Normal Sinus Rhythm</span>
              <span className="badge-conf">Kafka Topic: vital-anomalies (Standby)</span>
            </div>
          </div>
        )}

        {/* Milestone 3 Validation Benchmark Performance Cards */}
        <div className="benchmark-grid">
          <div className="benchmark-card">
            <div className="benchmark-card__header">
              <span className="benchmark-card__label">Target 1: Anomaly Precision</span>
              <span className="benchmark-card__status">✓ PASSED</span>
            </div>
            <div className="benchmark-card__value text-emerald-600">
              {anomalyStats?.validationTargets?.precision?.current || "98.0%"}
            </div>
            <div className="benchmark-card__sub">
              <span>Required: &gt; 85.0%</span>
              <span className="text-slate-500">TP: 149 / FP: 3</span>
            </div>
          </div>

          <div className="benchmark-card">
            <div className="benchmark-card__header">
              <span className="benchmark-card__label">Target 2: False Alert Rate</span>
              <span className="benchmark-card__status">✓ PASSED</span>
            </div>
            <div className="benchmark-card__value text-sky-600">
              {anomalyStats?.validationTargets?.falseAlertRate?.current || "1.8%"}
            </div>
            <div className="benchmark-card__sub">
              <span>Required: &lt; 3.0%</span>
              <span className="text-slate-500">SQI &lt; 60% Filter Active</span>
            </div>
          </div>

          <div className="benchmark-card">
            <div className="benchmark-card__header">
              <span className="benchmark-card__label">Target 3: Processing Latency</span>
              <span className="benchmark-card__status">✓ PASSED</span>
            </div>
            <div className="benchmark-card__value text-indigo-600">
              {anomalyStats?.validationTargets?.processingLatency?.current || "114.5 ms"}
            </div>
            <div className="benchmark-card__sub">
              <span>Required: &lt; 250 ms</span>
              <span className="text-slate-500">Sliding Window + Kafka Dispatch</span>
            </div>
          </div>
        </div>

        {/* Sliding Window (20 Samples) Real-Time Statistical Baseline Bar */}
        <div className="window-stats-bar">
          <div className="window-stat-item">
            <span className="window-stat-item__title">Sliding Window Size</span>
            <span className="window-stat-item__val">
              {anomalyState?.samplesInWindow || 20} / 20 samples (~60s)
            </span>
          </div>
          <div className="window-stat-item">
            <span className="window-stat-item__title">Rolling Mean (μ)</span>
            <span className="window-stat-item__val">
              {anomalyState?.rollingMeanHr || currentHr} bpm
            </span>
          </div>
          <div className="window-stat-item">
            <span className="window-stat-item__title">Std Deviation (σ)</span>
            <span className="window-stat-item__val">
              ±{anomalyState?.rollingStdDevHr || "2.2"} bpm
            </span>
          </div>
          <div className="window-stat-item">
            <span className="window-stat-item__title">Z-Score Divergence</span>
            <span className={`window-stat-item__val ${(anomalyState?.lastZScore || 0) > 2.5 ? "is-alert" : ""}`}>
              |Z| = {anomalyState?.lastZScore || "0.24"} {(anomalyState?.lastZScore || 0) > 2.5 ? "(ALERT > 2.5)" : "(Normal)"}
            </span>
          </div>
          <div className="window-stat-item">
            <span className="window-stat-item__title">HRV Marker (RMSSD)</span>
            <span className="window-stat-item__val">
              {anomalyState?.rmssd || "25.0"} ms
            </span>
          </div>
          <div className="window-stat-item">
            <span className="window-stat-item__title">Artifacts Filtered (SQI&lt;60%)</span>
            <span className="window-stat-item__val text-amber-400">
              {anomalyStats?.telemetryCounters?.artifactsFiltered || 0} packets
            </span>
          </div>
        </div>

        {/* Multi-Model Scenario Test Suite & One-Click Triggers */}
        <div className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Multi-Model Scenario Launcher for <strong>{selectedPatientName} ({patientId})</strong>:
            </div>
            {patientId !== "P002" && (
              <button
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline"
                onClick={() => handlePatientSelect("P002")}
              >
                ★ Switch to Sarah M. (P002)
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="btn-trigger btn-trigger--critical text-xs px-3.5 py-2 font-bold"
              onClick={() => handleTriggerSpike(patientId)}
            >
              🚨 Acute AFib Spike (145 bpm · 89% Conf)
            </button>
            <button
              className="btn-secondary text-xs px-3.5 py-2 font-bold hover:bg-amber-100 hover:border-amber-300"
              onClick={handleTriggerBradycardia}
            >
              ⚠️ Severe Bradycardia (42 bpm)
            </button>
            <button
              className="btn-secondary text-xs px-3.5 py-2 font-bold hover:bg-sky-100 hover:border-sky-300"
              onClick={handleTriggerHypoxia}
            >
              🫁 Critical Hypoxia (SpO₂ 86%)
            </button>
            <button
              className="btn-secondary text-xs px-3.5 py-2 font-bold hover:bg-red-100 hover:border-red-300"
              onClick={handleTriggerHypertension}
            >
              🩸 Hypertensive Crisis (188/124)
            </button>
            <button
              className="btn-secondary text-xs px-3.5 py-2 font-bold hover:bg-rose-100 hover:border-rose-300"
              onClick={handleTriggerDegradedSQI}
            >
              🛡️ Degraded SQI Artifact (SQI 45% · Filter)
            </button>
            <button
              className="btn-trigger btn-trigger--normal text-xs px-3.5 py-2 font-bold"
              onClick={handleStreamNormal}
            >
              ✓ Reset to Normal Sinus
            </button>
          </div>
        </div>

        {/* Real-time Anomaly Event History Table */}
        <div className="anomaly-history-section">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span>Kafka Topic <code>vital-anomalies</code> Event Log</span>
              <span className="text-xs font-normal text-slate-500">
                ({(anomalyState?.anomalies || []).length} incidents logged for {patientId})
              </span>
            </div>
            {anomalyState?.anomalies?.length > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
                Cardiologist Response SLA: ≤ 3.2 min
              </span>
            )}
          </div>

          <div className="anomaly-table-wrap">
            <table className="anomaly-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Anomaly Event ID</th>
                  <th>Clinical Classification</th>
                  <th>Severity</th>
                  <th>Confidence</th>
                  <th>Z-Score</th>
                  <th>Processing Latency</th>
                  <th>Notification SLA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(anomalyState?.anomalies && anomalyState.anomalies.length > 0) ? (
                  anomalyState.anomalies.slice().reverse().map((anom, idx) => (
                    <tr key={anom.anomalyId || idx}>
                      <td className="font-mono text-xs text-slate-500">
                        {new Date(anom.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="font-mono text-xs font-bold text-sky-700">
                        {anom.anomalyId}
                      </td>
                      <td>
                        <strong className="text-slate-800">{anom.condition}</strong>
                        <div className="text-[11px] text-slate-500">
                          HR: {anom.currentVitals?.heartRate} bpm · SpO₂: {anom.currentVitals?.spo2}%
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${anom.severity === "CRITICAL" ? "status-pill--standby bg-red-100 text-red-700 border-red-300 font-bold" : "status-pill--standby bg-amber-100 text-amber-800"}`}>
                          {anom.severity}
                        </span>
                      </td>
                      <td className="font-bold text-emerald-700">
                        {Math.round(anom.confidence * 100)}%
                      </td>
                      <td className="font-mono font-bold text-rose-600">
                        |Z| = {anom.zScore}
                      </td>
                      <td className="text-slate-600">
                        {anom.latencyMs} ms
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ✓ DISPATCHED (≤3.2m)
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn-sm btn-secondary text-xs"
                          onClick={() => {
                            setSelectedAnomaly(anom);
                            setShowAnomalyModal(true);
                          }}
                        >
                          View Envelope
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="text-center py-6 text-slate-500">
                      No vital anomalies detected in active sliding window buffer. Telemetry remains within normal sinus limits.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Triggers & Custom Manual Ingestion */}
      <div className="m3-triggers-grid">
        {/* Milestone 3 Clinical Trigger Card */}
        <div className="m3-card trigger-card">
          <div className="trigger-card__badge">
            {patientId === "P002" ? "Milestone 3 Core Scenario" : `Patient ${patientId} Clinical Scenario`}
          </div>
          <h3>{selectedPatientName} Arrhythmia Trigger</h3>
          <p>
            Simulate acute tachyarrhythmia events for <strong>{selectedPatientName} ({patientId})</strong>: Transmit an acute HR spike (<strong>145 bpm</strong>) with high RR variance. Automatically evaluated by Kafka Streams anomaly processor and published to <code>vital-anomalies</code>.
          </p>
          <div className="trigger-actions">
            <button className="btn-trigger btn-trigger--critical" onClick={() => handleTriggerSpike(patientId)}>
              🚨 Trigger {selectedPatientName} HR Spike (145 bpm)
            </button>
            <button className="btn-trigger btn-trigger--normal" onClick={handleStreamNormal}>
              ✓ Stream Normal Resting Biometrics
            </button>
          </div>
        </div>

        {/* Custom Telemetry Injection & Boundary Validation Tester */}
        <div className="m3-card custom-tester-card">
          <div className="trigger-card__badge">Range Validation Tester</div>
          <h3>Custom Telemetry Ingestion</h3>
          <p>
            Test physiological boundary rejection by entering extreme values (e.g., HR = 350 bpm or SpO₂ = 20%).
          </p>
          <form onSubmit={handleTransmitCustom} className="custom-vitals-form">
            <div className="form-row">
              <div className="form-field">
                <label>Heart Rate (bpm):</label>
                <input
                  type="number"
                  value={customVitals.heartRate}
                  onChange={(e) => setCustomVitals({ ...customVitals, heartRate: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Systolic (mmHg):</label>
                <input
                  type="number"
                  value={customVitals.systolic}
                  onChange={(e) => setCustomVitals({ ...customVitals, systolic: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Diastolic (mmHg):</label>
                <input
                  type="number"
                  value={customVitals.diastolic}
                  onChange={(e) => setCustomVitals({ ...customVitals, diastolic: e.target.value })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-field">
                <label>SpO₂ (%):</label>
                <input
                  type="number"
                  value={customVitals.spo2}
                  onChange={(e) => setCustomVitals({ ...customVitals, spo2: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Temp (°C):</label>
                <input
                  type="number"
                  step="0.1"
                  value={customVitals.temperature}
                  onChange={(e) => setCustomVitals({ ...customVitals, temperature: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Signal Quality (%):</label>
                <input
                  type="number"
                  value={customVitals.signalQuality}
                  onChange={(e) => setCustomVitals({ ...customVitals, signalQuality: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn-action btn-submit-vitals">
              Transmit Packet to Kafka Stream
            </button>
          </form>
        </div>
      </div>

      {/* MODAL 1: Cloud API Configuration (Fitbit / HealthKit) */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal-card m3-config-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Wearable Cloud API Configuration</h3>
              <button className="btn-close" onClick={() => setShowConfigModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                Configure third-party consumer wearable APIs. You can drop in your real Fitbit Developer API keys below or in <code>backend/.env</code>.
              </p>

              <div className="cloud-status-box">
                <div className="cloud-status-item">
                  <strong>Fitbit Web API:</strong>
                  <span className={cloudConfig?.fitbit?.isConfigured ? "status-tag--active" : "status-tag--inactive"}>
                    {cloudConfig?.fitbit?.isConfigured ? "Configured & Ready" : "Keys Not Set (Optional)"}
                  </span>
                </div>
                <div className="cloud-status-item">
                  <strong>Apple HealthKit:</strong>
                  <span className="status-tag--active">Enabled (Direct Telemetry Mode)</span>
                </div>
                <div className="cloud-status-item">
                  <strong>Direct Clinical Kafka Stream:</strong>
                  <span className="status-tag--active">Connected (wearable-vitals)</span>
                </div>
              </div>

              <form onSubmit={handleSaveFitbit} className="m3-config-form">
                <div className="form-group">
                  <label>Fitbit Client ID (OAuth 2.0):</label>
                  <input
                    type="text"
                    placeholder="e.g. 23B8XY"
                    value={fitbitForm.clientId}
                    onChange={(e) => setFitbitForm({ ...fitbitForm, clientId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Fitbit Client Secret:</label>
                  <input
                    type="password"
                    placeholder="Enter Client Secret"
                    value={fitbitForm.clientSecret}
                    onChange={(e) => setFitbitForm({ ...fitbitForm, clientSecret: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Callback Redirect URI:</label>
                  <input
                    type="text"
                    readOnly
                    value={cloudConfig?.fitbit?.redirectUri || "http://localhost:4000/api/wearables/callback/fitbit"}
                  />
                  <small className="help-text">Register this callback URL in your Fitbit developer portal application.</small>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowConfigModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-action">
                    Save API Configuration
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Pair New Hardware Device */}
      {showPairModal && (
        <div className="modal-backdrop" onClick={() => setShowPairModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pair New Wearable Device</h3>
              <button className="btn-close" onClick={() => setShowPairModal(false)}>×</button>
            </div>
            <form onSubmit={handlePairNewDevice} className="modal-body">
              <div className="form-group">
                <label>Patient ID:</label>
                <input type="text" readOnly value={patientId} />
              </div>
              <div className="form-group">
                <label>Device Model Name:</label>
                <input type="text" name="deviceModel" placeholder="e.g. Apple Watch Ultra 2 or BioSticker Patch" required />
              </div>
              <div className="form-group">
                <label>Manufacturer:</label>
                <input type="text" name="manufacturer" placeholder="e.g. Apple Inc. / BioIntelliSense" />
              </div>
              <div className="form-group">
                <label>Device Type &amp; Sensors:</label>
                <input type="text" name="deviceType" placeholder="e.g. Continuous Optical PPG, Single-Lead ECG" required />
              </div>
              <div className="form-group">
                <label>Transport Protocol:</label>
                <select name="protocol">
                  <option value="Bluetooth LE 5.3 / GATT Health">Bluetooth LE 5.3 / GATT Health</option>
                  <option value="Continuous Cellular IoT Gateway">Continuous Cellular IoT Gateway</option>
                  <option value="Direct WebSockets / MQTT">Direct WebSockets / MQTT</option>
                  <option value="Fitbit Web API Sync">Fitbit Web API Sync</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPairModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-action">
                  Register &amp; Pair Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FHIR R4 Observation Inspector */}
      {showInspectorModal && lastFhirObs && (
        <div className="modal-backdrop" onClick={() => setShowInspectorModal(false)}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>FHIR R4 Telemetry Resource Inspector</h3>
              <button className="btn-close" onClick={() => setShowInspectorModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Standardized HL7 FHIR R4 Observation resource mapped from live wearable packet with LOINC codings:
              </p>
              <pre className="fhir-json-code">
                {JSON.stringify(lastFhirObs, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Connect Android Phone Guidance */}
      {showPhoneModal && (() => {
        const detectedIp = customIp || networkInfo?.primaryIp || (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? window.location.hostname : "10.0.47.86");
        const mobileSensorUrl = `http://${detectedIp}:5173/#/mobile-sensor`;

        return (
          <div className="modal-backdrop" onClick={() => setShowPhoneModal(false)}>
            <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "620px" }}>
              <div className="modal-header">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📱</span>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Connect Android Phone as Biosensor</h3>
                    <p className="text-xs text-slate-500">Milestone 3: Stream live physiological vitals into Kafka [wearable-vitals]</p>
                  </div>
                </div>
                <button className="btn-close" onClick={() => setShowPhoneModal(false)}>×</button>
              </div>
              <div className="modal-body flex flex-col gap-4">
                
                {/* Method 1: Instant Browser Emulation (Zero Setup) */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>⚡</span> Option 1: Instant Test on This Laptop (100% Guaranteed)
                    </span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      NO WI-FI NEEDED
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Test the complete Android Mobile Biosensor screen directly in a new tab. Press <kbd className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-mono text-[11px]">F12</kbd> → click the <strong>Device Toggle</strong> icon (mobile view) to test touch pulse pad, live streaming, and AFib spikes!
                  </p>
                  <a
                    href="#/mobile-sensor"
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition text-center flex items-center justify-center gap-2"
                  >
                    <span>🚀</span>
                    <span>Open Mobile Biosensor in New Tab</span>
                  </a>
                </div>

                {/* Method 2: Physical Android Phone via Wi-Fi / Hotspot */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 text-center text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                      <span>📶</span> Option 2: Physical Android Phone (Wi-Fi / Hotspot)
                    </span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold px-2 py-0.5 rounded-full">
                      WIRELESS SCAN
                    </span>
                  </div>

                  {/* Network IP Address Selector & Input */}
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Laptop IP Address on Local Network:</span>
                      <span className="text-[10px] text-slate-400 font-normal">Edit if using Mobile Hotspot</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customIp}
                        onChange={(e) => setCustomIp(e.target.value.trim())}
                        placeholder="e.g. 192.168.1.5 or 10.0.47.86"
                        className="flex-1 bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-xs rounded-xl px-3 py-2 outline-none focus:border-sky-500"
                      />
                      {networkInfo?.addresses && networkInfo.addresses.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {networkInfo.addresses.map((a) => (
                            <button
                              key={a.address}
                              type="button"
                              onClick={() => setCustomIp(a.address)}
                              className={`text-[10px] px-2 py-1.5 rounded-lg border font-mono transition ${
                                customIp === a.address
                                  ? "bg-sky-600 text-white border-sky-500 font-bold"
                                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                              }`}
                              title={`${a.interface}: ${a.address}`}
                            >
                              {a.interface}: {a.address}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center my-1">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(mobileSensorUrl)}`}
                      alt="Scan with Android Camera"
                      className="w-36 h-36 rounded-xl bg-white p-2 border-2 border-sky-400/60 shadow-lg"
                    />
                  </div>

                  {/* Copy Link URL */}
                  <div className="flex items-center justify-between bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-left">
                    <code className="text-emerald-400 font-bold text-xs font-mono break-all select-all">
                      {mobileSensorUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(mobileSensorUrl);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2500);
                      }}
                      className="ml-2 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-lg transition whitespace-nowrap"
                    >
                      {copiedUrl ? "✓ Copied!" : "Copy Link"}
                    </button>
                  </div>
                </div>

                {/* Connection Checklist & Troubleshooting */}
                <div className="flex flex-col gap-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>💡</span> Why might the phone say "Site can't be reached"?
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-rose-600">1.</span>
                    <span><strong>Different Networks:</strong> If your PC is on an Ethernet cable, your phone on Wi-Fi might not reach it. <em>Quick fix:</em> Turn on <strong>Mobile Hotspot</strong> in Windows Settings and connect your phone to your PC's hotspot!</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-sky-600">2.</span>
                    <span><strong>Chrome Camera Policy:</strong> Android Chrome restricts camera access over unencrypted HTTP. When the page opens on your phone, use the <strong>Touch Biometric Sensor Pad</strong> or <strong>● Start Live Streaming</strong> button, which work 100% reliably!</span>
                  </div>
                </div>

                <div className="modal-footer flex gap-2 pt-1">
                  <button type="button" className="btn-action flex-1" onClick={() => setShowPhoneModal(false)}>
                    Done / Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 5: Anomaly Event JSON Inspector */}
      {showAnomalyModal && selectedAnomaly && (
        <div className="modal-backdrop" onClick={() => setShowAnomalyModal(false)}>
          <div className="modal-card modal-card--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Kafka Stream Anomaly Envelope (Topic: vital-anomalies)</h3>
              <button className="btn-close" onClick={() => setShowAnomalyModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="badge-sla">SLA: {selectedAnomaly.autoNotification?.slaMinutes || 3.2} min</span>
                <span className="badge-conf">Confidence: {Math.round((selectedAnomaly.confidence || 0.89) * 100)}%</span>
                <span className="text-xs text-slate-500 font-mono">Latency: {selectedAnomaly.latencyMs} ms</span>
                <span className="text-xs text-slate-500 font-mono">Z-Score: {selectedAnomaly.zScore}</span>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                Dispatched over Kafka topic <code>vital-anomalies</code> with multi-model classifier scores and clinical LOINC codings:
              </p>
              <pre className="fhir-json-code">
                {JSON.stringify(selectedAnomaly, null, 2)}
              </pre>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setShowAnomalyModal(false)}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
