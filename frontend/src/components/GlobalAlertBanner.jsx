import React, { useState, useEffect, useRef } from "react";
import { api } from "../api";

/**
 * GlobalAlertBanner - High-Priority Clinical Emergency Alert Banner
 * 
 * Displays across all views when active cardiac anomalies or critical incidents
 * are detected on the Kafka vital stream. Features live response countdown to
 * ensure SLA <= 3.2 minutes, dual-tone Web Audio cardiac chime, and 1-click
 * clinician acknowledgement.
 */
export default function GlobalAlertBanner({ onNavigate, selectedPatientId }) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [timeNow, setTimeNow] = useState(Date.now());
  const [acknowledgingId, setAcknowledgingId] = useState(null);

  const audioCtxRef = useRef(null);
  const chimeIntervalRef = useRef(null);

  // Poll for active alerts every 3 seconds
  useEffect(() => {
    let mounted = true;

    const fetchActive = async () => {
      try {
        const [alertRes, statsRes] = await Promise.all([
          api.getActiveAlerts(),
          api.getAlertStats()
        ]);
        if (mounted) {
          setActiveAlerts(alertRes.alerts || []);
          setStats(statsRes.stats || null);
        }
      } catch (err) {
        // silent fail on network drop
      }
    };

    fetchActive();
    const interval = setInterval(fetchActive, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Update second counter for live countdown timer
  useEffect(() => {
    const timer = setInterval(() => setTimeNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Synthetic Dual-Tone Web Audio Cardiac Alert
  const playCardiacChime = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Tone 1: High alert (880 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Tone 2: Mid pulse (659 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659, now + 0.12);
      gain2.gain.setValueAtTime(0.12, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.3);
    } catch (e) {
      console.warn("Web Audio chime blocked:", e);
    }
  };

  // Sound chime periodic trigger when critical alerts active
  useEffect(() => {
    if (audioEnabled && activeAlerts.length > 0 && !minimized) {
      playCardiacChime();
      chimeIntervalRef.current = setInterval(playCardiacChime, 4500);
    } else {
      if (chimeIntervalRef.current) {
        clearInterval(chimeIntervalRef.current);
      }
    }
    return () => {
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    };
  }, [audioEnabled, activeAlerts.length, minimized]);

  const handleAcknowledge = async (e, alertId) => {
    e.stopPropagation();
    setAcknowledgingId(alertId);
    try {
      await api.acknowledgeAlert(alertId, "Dr. Evelyn Reed, MD");
      const alertRes = await api.getActiveAlerts();
      setActiveAlerts(alertRes.alerts || []);
    } catch (err) {
      alert(`Error acknowledging alert: ${err.message}`);
    } finally {
      setAcknowledgingId(null);
    }
  };

  if (!activeAlerts || activeAlerts.length === 0) {
    return null;
  }

  // Topmost urgent alert
  const topAlert = activeAlerts[0];
  const isEmergency = topAlert.severity === "EMERGENCY" || topAlert.status === "ESCALATED";
  const deadlineMs = new Date(topAlert.deadlineTimestamp).getTime();
  const remainingSec = Math.round((deadlineMs - timeNow) / 1000);
  const isBreached = remainingSec < 0;

  const formatCountdown = (sec) => {
    const abs = Math.abs(sec);
    const m = Math.floor(abs / 60).toString().padStart(2, "0");
    const s = (abs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      className={`w-full text-white transition-all duration-300 select-none shadow-2xl relative z-50 border-b ${
        isEmergency
          ? "bg-gradient-to-r from-red-700 via-rose-800 to-red-900 border-red-500/80"
          : "bg-gradient-to-r from-amber-700 via-red-800 to-rose-900 border-amber-500/60"
      }`}
    >
      {/* Minimized Pill Bar */}
      {minimized ? (
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
            <span className="font-bold tracking-wide">
              {activeAlerts.length} ACTIVE CLINICAL ALERT{activeAlerts.length > 1 ? "S" : ""}:
            </span>
            <span className="font-semibold text-rose-200">
              {topAlert.patientName} ({topAlert.patientId}) - {topAlert.condition}
            </span>
            <span className={`px-2 py-0.5 rounded font-mono font-bold ${
              isBreached ? "bg-red-950 text-red-200 border border-red-500" : "bg-black/30 text-amber-200"
            }`}>
              {isBreached ? `BREACHED +${formatCountdown(remainingSec)}` : `SLA: ${formatCountdown(remainingSec)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate && onNavigate("alerts", topAlert.patientId)}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold px-2.5 py-1 rounded text-xs transition"
            >
              Open Alert Center &rarr;
            </button>
            <button
              onClick={() => setMinimized(false)}
              className="text-white/80 hover:text-white px-2 py-1 text-xs"
            >
              Expand ▾
            </button>
          </div>
        </div>
      ) : (
        /* Full Banner Display */
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Left: Indicator & Patient Details */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white shadow"></span>
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black tracking-wider uppercase ${
                    isEmergency ? "bg-black/40 text-red-200 border border-red-400" : "bg-black/30 text-amber-200 border border-amber-400/60"
                  }`}>
                    {topAlert.severity} PRIORITY
                  </span>
                  <span className="font-bold text-sm text-white">
                    {topAlert.patientName} <span className="text-white/70">({topAlert.patientId})</span>
                  </span>
                  <span className="text-xs bg-white/15 px-2 py-0.5 rounded font-mono">
                    HR: {topAlert.currentVitals?.heartRate || "--"} BPM
                  </span>
                  {topAlert.zScore && (
                    <span className="text-xs bg-white/15 px-2 py-0.5 rounded font-mono text-amber-200">
                      |Z|: {topAlert.zScore}σ
                    </span>
                  )}
                  {topAlert.confidence && (
                    <span className="text-xs bg-white/15 px-2 py-0.5 rounded font-mono text-emerald-200">
                      Conf: {Math.round(topAlert.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-rose-100 mt-1 flex items-center gap-2 flex-wrap">
                  <span>🚨 {topAlert.condition}</span>
                  <span className="text-white/60">•</span>
                  <span>On-Call: <strong className="text-white">{topAlert.physicianName}</strong> ({topAlert.department})</span>
                </div>
              </div>
            </div>

            {/* Right: SLA Countdown & Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap justify-end">
              {/* Live SLA Countdown Timer */}
              <div className={`px-3 py-1.5 rounded-lg border text-center font-mono ${
                isBreached
                  ? "bg-red-950/80 border-red-400 text-red-200 animate-pulse"
                  : topAlert.status === "ACKNOWLEDGED"
                  ? "bg-emerald-950/80 border-emerald-400 text-emerald-200"
                  : "bg-black/40 border-white/20 text-white"
              }`}>
                <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  {topAlert.status === "ACKNOWLEDGED" ? "SLA Paused" : "Response SLA (<=3.2m)"}
                </div>
                <div className="text-sm font-black tracking-tight">
                  {topAlert.status === "ACKNOWLEDGED" ? (
                    <span>ACKNOWLEDGED</span>
                  ) : isBreached ? (
                    <span>BREACHED +{formatCountdown(remainingSec)}</span>
                  ) : (
                    <span>{formatCountdown(remainingSec)} REMAINING</span>
                  )}
                </div>
              </div>

              {/* Audio Chime Toggle */}
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                title={audioEnabled ? "Mute cardiac chime" : "Enable dual-tone cardiac audio chime"}
                className={`p-2 rounded-lg text-sm border transition ${
                  audioEnabled
                    ? "bg-amber-400 text-black border-amber-300 font-bold shadow-lg shadow-amber-400/40"
                    : "bg-black/30 border-white/20 text-white hover:bg-black/50"
                }`}
              >
                {audioEnabled ? "🔔 Chime ON" : "🔕 Chime OFF"}
              </button>

              {/* 1-Click Acknowledge */}
              {topAlert.status !== "ACKNOWLEDGED" && topAlert.status !== "RESOLVED" && (
                <button
                  onClick={(e) => handleAcknowledge(e, topAlert.alertId)}
                  disabled={acknowledgingId === topAlert.alertId}
                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-3 py-2 rounded-lg text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {acknowledgingId === topAlert.alertId ? (
                    <span>Claiming...</span>
                  ) : (
                    <>
                      <span>✓</span>
                      <span>Acknowledge SLA</span>
                    </>
                  )}
                </button>
              )}

              {/* Clinical Order Sets / Detail View */}
              <button
                onClick={() => onNavigate && onNavigate("alerts", topAlert.patientId)}
                className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-3 py-2 rounded-lg text-xs shadow-lg transition flex items-center gap-1.5"
              >
                <span>CDS Order Sets</span>
                <span>&rarr;</span>
              </button>

              {/* Minimize */}
              <button
                onClick={() => setMinimized(true)}
                title="Minimize banner"
                className="text-white/70 hover:text-white px-2 py-1 text-xs"
              >
                ▲
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
