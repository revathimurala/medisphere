import { useState } from "react";

export default function BodyModel({ twin }) {
  const [selectedOrgan, setSelectedOrgan] = useState("heart");

  const v = twin?.latestVitals || {};
  const labs = twin?.labResults || [];
  const conditions = (twin?.conditions || []).map(c => c.code?.text || "").filter(Boolean);

  // Helper to extract lab value
  const getLab = (namePattern) => {
    const found = labs.find(l => new RegExp(namePattern, "i").test(l.code));
    return found ? found.value : null;
  };

  const hr = Number(v.heartRate) || 75;
  const systolic = Number(v.systolic) || 120;
  const diastolic = Number(v.diastolic) || 80;
  const spo2 = Number(v.spo2) || 98;
  const hba1c = Number(getLab("HbA1c") || getLab("A1c") || 5.6);
  const egfr = Number(getLab("eGFR") || 85);
  const ldl = Number(getLab("LDL") || 105);

  // Determine Organ Status & Heatmap Color
  // Heart Status
  let heartStatus = "optimal";
  let heartColor = "#10b981"; // green
  if (hr > 100 || hr < 50 || conditions.some(c => /arrhythmia|cardiac|afib/i.test(c))) {
    heartStatus = "high-risk";
    heartColor = "#ef4444";
  } else if (hr > 85 || hr < 60) {
    heartStatus = "monitoring";
    heartColor = "#f59e0b";
  }

  // Vascular / Vessels Status
  let vascularStatus = "optimal";
  let vascularColor = "#10b981";
  if (systolic >= 140 || diastolic >= 90 || conditions.some(c => /hypertension/i.test(c))) {
    vascularStatus = "high-risk";
    vascularColor = "#ef4444";
  } else if (systolic >= 125 || diastolic >= 85) {
    vascularStatus = "monitoring";
    vascularColor = "#f59e0b";
  }

  // Lungs Status
  let lungStatus = "optimal";
  let lungColor = "#10b981";
  if (spo2 < 93 || conditions.some(c => /asthma|copd/i.test(c))) {
    lungStatus = "monitoring";
    lungColor = "#f59e0b";
  } else if (spo2 < 90) {
    lungStatus = "high-risk";
    lungColor = "#ef4444";
  }

  // Pancreas / Endocrine Status
  let pancreasStatus = "optimal";
  let pancreasColor = "#10b981";
  if (hba1c >= 6.5 || conditions.some(c => /diabetes/i.test(c))) {
    pancreasStatus = "high-risk";
    pancreasColor = "#ef4444";
  } else if (hba1c >= 5.7) {
    pancreasStatus = "monitoring";
    pancreasColor = "#f59e0b";
  }

  // Kidney / Renal Status
  let kidneyStatus = "optimal";
  let kidneyColor = "#10b981";
  if (egfr < 60 || conditions.some(c => /kidney|renal/i.test(c))) {
    kidneyStatus = "high-risk";
    kidneyColor = "#ef4444";
  } else if (egfr < 80) {
    kidneyStatus = "monitoring";
    kidneyColor = "#f59e0b";
  }

  const organData = {
    heart: {
      name: "Cardiovascular (Heart)",
      metric: `${hr} bpm`,
      status: heartStatus,
      color: heartColor,
      details: `Resting Heart Rate: ${hr} bpm (Reference: 60–100 bpm). Real-time Kafka wearable telemetry feed.`,
      clinicalRisk: heartStatus === "high-risk" ? "Elevated cardiovascular workload" : "Normal sinus rhythm maintained."
    },
    vessels: {
      name: "Vascular System (Arteries/BP)",
      metric: `${systolic}/${diastolic} mmHg`,
      status: vascularStatus,
      color: vascularColor,
      details: `Arterial Pressure: ${systolic}/${diastolic} mmHg. Target guideline: <130/80 mmHg.`,
      clinicalRisk: vascularStatus === "high-risk" ? "Hypertension Stage 1/2 detected." : "Normotensive arterial pressure."
    },
    lungs: {
      name: "Respiratory System (Lungs)",
      metric: `${spo2}% SpO₂`,
      status: lungStatus,
      color: lungColor,
      details: `Pulse Oximetry: ${spo2}% oxygen saturation (Reference: 95–100%).`,
      clinicalRisk: lungStatus === "monitoring" ? "Asthma / respiratory monitoring active." : "Optimal blood oxygenation."
    },
    pancreas: {
      name: "Metabolic / Endocrine (Pancreas)",
      metric: `HbA1c ${hba1c}%`,
      status: pancreasStatus,
      color: pancreasColor,
      details: `Glycated Hemoglobin: ${hba1c}% (Optimal: <5.7%, Prediabetes: 5.7–6.4%, Diabetes: ≥6.5%).`,
      clinicalRisk: pancreasStatus === "high-risk" ? "Active glycemic management required." : "Euglycemic metabolic baseline."
    },
    kidneys: {
      name: "Renal Function (Kidneys)",
      metric: `eGFR ${egfr} mL/min`,
      status: kidneyStatus,
      color: kidneyColor,
      details: `Estimated Glomerular Filtration: ${egfr} mL/min/1.73m² (Normal: ≥90).`,
      clinicalRisk: kidneyStatus === "high-risk" ? "Stage 2/3 nephropathy surveillance." : "Normal renal clearance rate."
    }
  };

  const active = organData[selectedOrgan] || organData.heart;

  return (
    <div className="body-model-container">
      <div className="body-model-header">
        <div>
          <h4>3D Anatomical Digital Twin</h4>
          <span className="body-model-sub">Organ systems with live vital &amp; risk heatmap</span>
        </div>
        <div className="heatmap-legend">
          <span className="legend-dot is-optimal"></span> Optimal
          <span className="legend-dot is-monitoring"></span> Monitoring
          <span className="legend-dot is-high-risk"></span> Attention
        </div>
      </div>

      <div className="body-model-viewport">
        {/* Holographic 3D Anatomical Wireframe SVG */}
        <div className="body-model-visual">
          <svg
            viewBox="0 0 260 480"
            className="body-model-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Radial Gradients for Organ Heatmaps */}
              <radialGradient id="heatHeart" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={heartColor} stopOpacity="0.9" />
                <stop offset="60%" stopColor={heartColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={heartColor} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatLungs" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={lungColor} stopOpacity="0.9" />
                <stop offset="70%" stopColor={lungColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={lungColor} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatPancreas" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={pancreasColor} stopOpacity="0.9" />
                <stop offset="70%" stopColor={pancreasColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={pancreasColor} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatKidneys" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={kidneyColor} stopOpacity="0.9" />
                <stop offset="70%" stopColor={kidneyColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={kidneyColor} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="heatVessels" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={vascularColor} stopOpacity="0.9" />
                <stop offset="70%" stopColor={vascularColor} stopOpacity="0.35" />
                <stop offset="100%" stopColor={vascularColor} stopOpacity="0" />
              </radialGradient>

              {/* Background Grid Pattern */}
              <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(37, 99, 235, 0.08)" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* Grid Backdrop */}
            <rect width="260" height="480" fill="url(#gridPattern)" />

            {/* Depth 3D rings */}
            <ellipse cx="130" cy="460" rx="75" ry="14" fill="none" stroke="rgba(37, 99, 235, 0.25)" strokeWidth="1.5" strokeDasharray="4 4" />
            <ellipse cx="130" cy="460" rx="50" ry="9" fill="none" stroke="rgba(37, 99, 235, 0.4)" strokeWidth="1" />

            {/* Anatomical Human Body Silhouette */}
            <path
              className="silhouette-body"
              d="M130,22 
                 C144,22 154,34 154,50 
                 C154,65 144,74 139,78 
                 C146,82 159,88 172,96 
                 C188,106 200,126 204,158 
                 C207,185 204,230 200,260 
                 C198,272 192,274 186,264 
                 C180,240 178,210 176,190 
                 C174,215 168,260 162,295 
                 C158,320 156,365 154,410 
                 C152,438 150,455 144,455 
                 C138,455 136,432 134,380 
                 L130,320 
                 L126,380 
                 C124,432 122,455 116,455 
                 C110,455 108,438 106,410 
                 C104,365 102,320 98,295 
                 C92,260 86,215 84,190 
                 C82,210 80,240 74,264 
                 C68,274 62,272 60,260 
                 C56,230 53,185 56,158 
                 C60,126 72,106 88,96 
                 C101,88 114,82 121,78 
                 C116,74 106,65 106,50 
                 C106,34 116,22 130,22 Z"
              fill="rgba(240, 246, 255, 0.75)"
              stroke="#cbd5e1"
              strokeWidth="1.8"
            />

            {/* Spine and Centerline */}
            <line x1="130" y1="80" x2="130" y2="300" stroke="rgba(37, 99, 235, 0.25)" strokeWidth="1.5" strokeDasharray="3 3" />

            {/* --- ORGAN HEATMAP LAYERS --- */}

            {/* 1. Lungs Heatmap (Bilateral) */}
            <circle cx="114" cy="142" r="26" fill="url(#heatLungs)" />
            <circle cx="146" cy="142" r="26" fill="url(#heatLungs)" />

            {/* 2. Heart Heatmap (Pulsating) */}
            <circle
              className="pulse-heart"
              cx="134"
              cy="154"
              r="24"
              fill="url(#heatHeart)"
            />

            {/* 3. Vascular / Circulatory Branches */}
            <path
              d="M130,120 L130,210 M130,170 Q145,180 156,230 M130,170 Q115,180 104,230 M130,280 L145,390 M130,280 L115,390"
              fill="none"
              stroke={vascularColor}
              strokeWidth="1.6"
              strokeOpacity="0.75"
            />

            {/* 4. Pancreas / Liver Heatmap */}
            <ellipse cx="126" cy="192" rx="22" ry="12" fill="url(#heatPancreas)" />

            {/* 5. Kidneys Heatmap */}
            <circle cx="116" cy="216" r="16" fill="url(#heatKidneys)" />
            <circle cx="144" cy="216" r="16" fill="url(#heatKidneys)" />

            {/* --- INTERACTIVE ORGAN HOTSPOT BUTTONS --- */}

            {/* Heart Hotspot */}
            <g
              className={`organ-hotspot ${selectedOrgan === "heart" ? "is-active" : ""}`}
              onClick={() => setSelectedOrgan("heart")}
            >
              <circle cx="134" cy="154" r="12" fill="#fff" stroke={heartColor} strokeWidth="3" />
              <text x="134" y="157.5" fontSize="9" fontWeight="bold" fill={heartColor} textAnchor="middle">HR</text>
            </g>

            {/* Lungs Hotspot */}
            <g
              className={`organ-hotspot ${selectedOrgan === "lungs" ? "is-active" : ""}`}
              onClick={() => setSelectedOrgan("lungs")}
            >
              <circle cx="110" cy="136" r="10" fill="#fff" stroke={lungColor} strokeWidth="2.5" />
              <text x="110" y="139.5" fontSize="8" fontWeight="bold" fill={lungColor} textAnchor="middle">O₂</text>
            </g>

            {/* Vascular / BP Hotspot */}
            <g
              className={`organ-hotspot ${selectedOrgan === "vessels" ? "is-active" : ""}`}
              onClick={() => setSelectedOrgan("vessels")}
            >
              <circle cx="158" cy="178" r="10" fill="#fff" stroke={vascularColor} strokeWidth="2.5" />
              <text x="158" y="181.5" fontSize="7.5" fontWeight="bold" fill={vascularColor} textAnchor="middle">BP</text>
            </g>

            {/* Pancreas / Metabolic Hotspot */}
            <g
              className={`organ-hotspot ${selectedOrgan === "pancreas" ? "is-active" : ""}`}
              onClick={() => setSelectedOrgan("pancreas")}
            >
              <circle cx="126" cy="192" r="10" fill="#fff" stroke={pancreasColor} strokeWidth="2.5" />
              <text x="126" y="195.5" fontSize="7" fontWeight="bold" fill={pancreasColor} textAnchor="middle">A1c</text>
            </g>

            {/* Kidneys Hotspot */}
            <g
              className={`organ-hotspot ${selectedOrgan === "kidneys" ? "is-active" : ""}`}
              onClick={() => setSelectedOrgan("kidneys")}
            >
              <circle cx="146" cy="216" r="10" fill="#fff" stroke={kidneyColor} strokeWidth="2.5" />
              <text x="146" y="219.5" fontSize="7" fontWeight="bold" fill={kidneyColor} textAnchor="middle">GFR</text>
            </g>
          </svg>
        </div>

        {/* Dynamic Organ System Details Inspector */}
        <div className="organ-inspector">
          <div className="organ-inspector__badge" style={{ borderColor: active.color, color: active.color }}>
            ● {active.name}
          </div>
          <div className="organ-inspector__metric" style={{ color: active.color }}>
            {active.metric}
          </div>
          <div className="organ-inspector__status">
            Risk Status: <b>{active.status.toUpperCase()}</b>
          </div>
          <p className="organ-inspector__detail">{active.details}</p>
          <div className="organ-inspector__risk">
            <strong>Clinical Implication:</strong>
            <p>{active.clinicalRisk}</p>
          </div>

          <div className="organ-inspector__nav">
            <button
              className={`organ-tab ${selectedOrgan === "heart" ? "is-selected" : ""}`}
              onClick={() => setSelectedOrgan("heart")}
            >
              Heart (HR)
            </button>
            <button
              className={`organ-tab ${selectedOrgan === "vessels" ? "is-selected" : ""}`}
              onClick={() => setSelectedOrgan("vessels")}
            >
              Vessels (BP)
            </button>
            <button
              className={`organ-tab ${selectedOrgan === "lungs" ? "is-selected" : ""}`}
              onClick={() => setSelectedOrgan("lungs")}
            >
              Lungs (SpO₂)
            </button>
            <button
              className={`organ-tab ${selectedOrgan === "pancreas" ? "is-selected" : ""}`}
              onClick={() => setSelectedOrgan("pancreas")}
            >
              Pancreas (A1c)
            </button>
            <button
              className={`organ-tab ${selectedOrgan === "kidneys" ? "is-selected" : ""}`}
              onClick={() => setSelectedOrgan("kidneys")}
            >
              Kidneys (eGFR)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
