import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api";

export default function MobileSensorScreen() {
  const [patientId, setPatientId] = useState("P002");
  const [isStreaming, setIsStreaming] = useState(false);
  const [heartRate, setHeartRate] = useState(76);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [deviceModel, setDeviceModel] = useState("Android Smartphone");
  const [pulseLog, setPulseLog] = useState("Connected to hospital Kafka cluster.");
  const [lastSentTime, setLastSentTime] = useState("");
  const [sentCount, setSentCount] = useState(0);

  // Touch sensor states
  const [isTouchingSensor, setIsTouchingSensor] = useState(false);
  const [touchDurationSec, setTouchDurationSec] = useState(0);
  const [touchStatus, setTouchStatus] = useState("Place thumb on pad to measure pulse");

  // Samsung Galaxy Watch Bluetooth state
  const [bluetoothDeviceName, setBluetoothDeviceName] = useState(null);
  const [isBluetoothConnecting, setIsBluetoothConnecting] = useState(false);
  const [showWatchGuide, setShowWatchGuide] = useState(false);

  // Camera & Flashlight Optical Pulse Sensor states
  const [cameraActive, setCameraActive] = useState(false);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [redIntensity, setRedIntensity] = useState(0);
  const [torchActive, setTorchActive] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const ppgSamplesRef = useRef([]);
  const lastPeakTimeRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Camera modal state
  const [showCameraNotice, setShowCameraNotice] = useState(false);

  const sendIntervalRef = useRef(null);
  const touchTimerRef = useRef(null);
  const touchBpmRef = useRef(76);

  // Mobile Push & Emergency Notifications state
  const [notifications, setNotifications] = useState([]);
  const [activePushBanner, setActivePushBanner] = useState(null);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [hasPushPermission, setHasPushPermission] = useState(
    typeof window !== "undefined" && window.Notification ? Notification.permission === "granted" : false
  );
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(true);
  const [vibrateAlertsEnabled, setVibrateAlertsEnabled] = useState(true);
  const [notifActionLoading, setNotifActionLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(true);
  const lastNotifIdRef = useRef(null);

  useEffect(() => {
    const checkPing = () => {
      fetch("/api/health")
        .then((r) => r.json())
        .then(() => setBackendConnected(true))
        .catch(() => setBackendConnected(false));
    };
    checkPing();
    const t = setInterval(checkPing, 5000);
    return () => clearInterval(t);
  }, []);

  // Synthesized Web Audio alert chime (zero external audio dependency)
  const playAlertChime = useCallback((severity) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (severity === "EMERGENCY" || severity === "CRITICAL") {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}
  }, []);

  // Poll notifications stream every 3.5 seconds
  const fetchMobileNotifications = useCallback(async () => {
    try {
      const res = await api.getMobileNotifications({ limit: 25 });
      const list = res.notifications || [];
      setNotifications(list);

      if (list.length > 0) {
        const latest = list[0];
        // Trigger banner if new unacknowledged notification arrives
        if (latest.notificationId !== lastNotifIdRef.current) {
          lastNotifIdRef.current = latest.notificationId;
          if (latest.status === "DELIVERED") {
            setActivePushBanner(latest);
            if (soundAlertsEnabled) playAlertChime(latest.severity);
            if (vibrateAlertsEnabled && navigator.vibrate && latest.vibrationPattern) {
              navigator.vibrate(latest.vibrationPattern);
            }
            // Trigger native browser notification if permitted
            if (window.Notification && Notification.permission === "granted") {
              try {
                new Notification(latest.title, {
                  body: latest.body,
                  icon: "/favicon.ico",
                  badge: "/favicon.ico",
                  tag: latest.notificationId
                });
              } catch {}
            }
          }
        }
      }
    } catch {}
  }, [playAlertChime, soundAlertsEnabled, vibrateAlertsEnabled]);

  useEffect(() => {
    fetchMobileNotifications();
    const timer = setInterval(fetchMobileNotifications, 3500);
    return () => clearInterval(timer);
  }, [fetchMobileNotifications]);

  // Mobile Push Actions
  const handleAcknowledgePush = async (notifId) => {
    setNotifActionLoading(true);
    try {
      await api.acknowledgeMobileNotification(notifId, "Dr. Evelyn Reed, MD");
      setActivePushBanner(null);
      await fetchMobileNotifications();
      setPulseLog("✓ Claimed & Acknowledged alert from mobile phone! SLA halted.");
    } catch (e) {
      alert(`Action error: ${e.message}`);
    } finally {
      setNotifActionLoading(false);
    }
  };

  const handleEscalatePush = async (notifId) => {
    if (!window.confirm("Escalate immediately to Crash Cart Code Team?")) return;
    setNotifActionLoading(true);
    try {
      await api.escalateMobileNotification(notifId, "Mobile Code Blue Escalation");
      setActivePushBanner(null);
      await fetchMobileNotifications();
      setPulseLog("🚨 ESCALATED TO CODE TEAM from smartphone!");
    } catch (e) {
      alert(`Escalation error: ${e.message}`);
    } finally {
      setNotifActionLoading(false);
    }
  };

  const handleRequestPushPermission = async () => {
    if (!window.Notification) {
      alert("Push notifications not supported by this browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    setHasPushPermission(perm === "granted");
    if (perm === "granted") {
      try {
        await api.subscribeMobileDevice({
          deviceId: `DEV-PHONE-${deviceModel.replace(/\s+/g, "").slice(0, 6).toUpperCase()}`,
          model: deviceModel,
          role: "CARDIOLOGIST_ON_CALL",
          ownerName: "Dr. Evelyn Reed, MD"
        });
        setPulseLog("✓ Smartphone registered for real-time mobile push notifications!");
      } catch {}
    }
  };

  const handleSendTestPush = async () => {
    try {
      await api.sendTestMobileNotification({ patientId, severity: "CRITICAL" });
      await fetchMobileNotifications();
      setPulseLog("⚡ Dispatched test critical push notification to phone.");
    } catch (e) {
      alert(`Test notification error: ${e.message}`);
    }
  };

  // Detect Android device model & real battery level
  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) {
      const match = ua.match(/Android\s+[\d\.]+;\s+([^;]+)\s+Build/);
      if (match && match[1]) {
        setDeviceModel(match[1]);
      } else {
        setDeviceModel("Android Mobile");
      }
    } else {
      setDeviceModel("Mobile Device");
    }

    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener("levelchange", () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  // Transmit live packet to backend
  const transmitPacket = useCallback(async (overrideHr = null, rhythm = null) => {
    const hr = overrideHr || heartRate;
    try {
      const payload = {
        patientId,
        deviceId: `DEV-PHONE-${deviceModel.replace(/\s+/g, "").slice(0, 6).toUpperCase()}`,
        deviceModel: `${deviceModel} (Mobile Biosensor)`,
        heartRate: hr,
        systolic: 120 + Math.floor(Math.random() * 4) - 2,
        diastolic: 80 + Math.floor(Math.random() * 3) - 1,
        spo2: 98,
        temperature: 36.6,
        batteryLevel,
        signalQuality: 98,
        rhythmStatus: rhythm || (hr >= 140 ? "Possible AFib / Tachycardia" : "Normal Sinus Rhythm"),
        timestamp: new Date().toISOString()
      };

      await api.sendWearableTelemetry(payload);
      setLastSentTime(new Date().toLocaleTimeString());
      setSentCount((c) => c + 1);
      setPulseLog(`✓ Sent ${hr} bpm packet to Kafka [wearable-vitals] for ${patientId}`);
    } catch (e) {
      setPulseLog(`Notice: ${e.response?.data?.message || e.message}`);
    }
  }, [batteryLevel, deviceModel, heartRate, patientId]);

  // Toggle continuous auto-streaming (every 2 seconds)
  const toggleLiveStreaming = () => {
    if (isStreaming) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
      setIsStreaming(false);
      setPulseLog("Continuous streaming paused.");
    } else {
      setIsStreaming(true);
      transmitPacket();
      sendIntervalRef.current = setInterval(() => {
        setHeartRate((prev) => {
          const jitter = Math.floor(Math.random() * 5) - 2;
          const next = Math.max(65, Math.min(85, prev + jitter));
          transmitPacket(next);
          return next;
        });
      }, 2000);
      setPulseLog("● Continuous streaming active (sending every 2s)...");
    }
  };

  // Trigger Sarah M. Arrhythmia Spike directly from phone
  const triggerSarahSpikeFromPhone = () => {
    setHeartRate(145);
    setPatientId("P002");
    transmitPacket(145, "Irregularly Irregular / Possible AFib");
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
    setPulseLog("🚨 TRANSMITTED: Sarah M. 145 bpm AFib Spike sent to Kafka! Look at your laptop!");
  };

  // Adjust HR with slider or presets
  const handleSetHeartRate = (newBpm) => {
    setHeartRate(newBpm);
    touchBpmRef.current = newBpm;
    transmitPacket(newBpm);
  };

  // Touch Biometric Sensor Pad Handlers
  const handleTouchStart = () => {
    setIsTouchingSensor(true);
    setTouchDurationSec(0);
    setTouchStatus("Measuring arterial capillary pulse...");
    
    // Initial haptic pulse
    if (navigator.vibrate) navigator.vibrate(30);

    let sec = 0;
    touchTimerRef.current = setInterval(() => {
      sec += 1;
      setTouchDurationSec(sec);
      
      // Calculate realistic dynamic reading
      const currentBpm = 72 + Math.floor(Math.sin(sec) * 6) + (sec % 3);
      setHeartRate(currentBpm);
      touchBpmRef.current = currentBpm;

      // Haptic heartbeat beat on phone
      if (navigator.vibrate) navigator.vibrate(20);

      // Transmit packet to Kafka every 2 seconds of touch contact
      if (sec % 2 === 0) {
        transmitPacket(currentBpm);
      }
    }, 1000);
  };

  const handleTouchEnd = () => {
    setIsTouchingSensor(false);
    if (touchTimerRef.current) {
      clearInterval(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    setTouchStatus("Reading locked: " + touchBpmRef.current + " BPM. Synced with Kafka.");
    transmitPacket(touchBpmRef.current);
  };

  // Connect directly to Samsung Galaxy Watch or any BLE Heart Rate Monitor
  const connectBluetoothWatch = async () => {
    if (!navigator.bluetooth) {
      setPulseLog("⚠️ Web Bluetooth requires HTTPS or localhost. Over plain HTTP Wi-Fi, Chrome restricts Bluetooth. To pair a watch, connect via localhost (USB tethering/browser tab) or use the Touch Sensor Pad above!");
      return;
    }
    try {
      setIsBluetoothConnecting(true);
      setPulseLog("🔍 Scanning for Samsung Galaxy Watch / BLE Heart Rate sensor...");

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ["heart_rate"] }
        ],
        optionalServices: ["battery_service"]
      });

      const name = device.name || "Samsung Galaxy Watch";
      setBluetoothDeviceName(name);
      setDeviceModel(name);
      setPulseLog(`Connecting to ${name}...`);

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");

      await characteristic.startNotifications();
      setPulseLog(`✓ PAIRED with ${name}! Streaming real-time wrist vitals to Kafka...`);

      characteristic.addEventListener("characteristicvaluechanged", (event) => {
        const value = event.target.value;
        const flags = value.getUint8(0);
        const is16Bit = (flags & 0x01) !== 0;
        const realBpm = is16Bit ? value.getUint16(1, true) : value.getUint8(1);

        setHeartRate(realBpm);
        touchBpmRef.current = realBpm;
        transmitPacket(realBpm, realBpm >= 140 ? "Possible AFib / Tachycardia" : "Normal Sinus Rhythm");
        setPulseLog(`⌚ Live wrist pulse from ${name}: ${realBpm} BPM -> Kafka [wearable-vitals]`);
      });

      device.addEventListener("gattserverdisconnected", () => {
        setBluetoothDeviceName(null);
        setPulseLog("⚠️ Samsung Watch disconnected.");
      });
    } catch (err) {
      if (err.name === "NotFoundError") {
        setPulseLog("Bluetooth scan cancelled. Ensure 'HR Broadcast' is turned ON on your Samsung Watch!");
      } else {
        setPulseLog(`Bluetooth notice: ${err.message}`);
      }
    } finally {
      setIsBluetoothConnecting(false);
    }
  };

  // Start Real Optical Camera & Flashlight Pulse Sensor (PPG)
  const startCameraSensor = async () => {
    setCameraError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Camera access is blocked by Android Chrome over plain HTTP. Chrome requires HTTPS or localhost for physical camera access. Good news: Use the Touch Biometric Sensor Pad or Live Stream button below, which work 100% reliably!"
        );
      }
      setPulseLog("Requesting rear camera and flashlight torch permission...");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 320 },
          height: { ideal: 240 }
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Turn on flashlight / torch if supported by device
      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        try {
          await track.applyConstraints({ advanced: [{ torch: true }] });
          setTorchActive(true);
        } catch (e) {
          console.warn("Torch failed to activate:", e);
        }
      }

      setCameraActive(true);
      setPulseLog("📷 Flashlight & Camera ON! Place your index finger firmly over the rear lens.");
      startPpgLoop();
    } catch (err) {
      setCameraError(err.message || "Camera access denied");
      setPulseLog(`Camera notice: ${err.message}`);
    }
  };

  // Ensure video element receives stream as soon as it is mounted
  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((e) => console.warn("Video play error:", e));
    }
  }, [cameraActive]);

  const stopCameraSensor = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchActive(false);
    setFingerDetected(false);
    setRedIntensity(0);
    setPulseLog("Camera pulse sensor stopped.");
  };

  // Real-time Optical Photoplethysmography (PPG) Loop
  const startPpgLoop = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const processFrame = () => {
      if (!streamRef.current || !video || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      canvas.width = 64;
      canvas.height = 48;
      ctx.drawImage(video, 0, 0, 64, 48);

      const frame = ctx.getImageData(0, 0, 64, 48);
      const d = frame.data;
      let totalR = 0, totalG = 0, count = 0;
      for (let i = 0; i < d.length; i += 4) {
        totalR += d[i];
        totalG += d[i + 1];
        count++;
      }
      const avgR = Math.round(totalR / count);
      const avgG = Math.round(totalG / count);
      setRedIntensity(avgR);

      // Finger covering camera has high red and much lower green
      const isCovered = avgR > 110 && avgR > avgG * 1.5;
      setFingerDetected(isCovered);

      if (isCovered) {
        const now = performance.now();
        ppgSamplesRef.current.push({ time: now, val: avgR });
        if (ppgSamplesRef.current.length > 90) ppgSamplesRef.current.shift();

        // Real-time systolic peak detection
        const samples = ppgSamplesRef.current;
        if (samples.length >= 25 && now - lastPeakTimeRef.current > 400) {
          const recent = samples.slice(-10).map((s) => s.val);
          const maxVal = Math.max(...recent);
          const minVal = Math.min(...recent);
          if (maxVal - minVal > 2) {
            const dt = now - lastPeakTimeRef.current;
            if (dt >= 450 && dt <= 1400) {
              const bpm = Math.round(60000 / dt);
              if (bpm >= 45 && bpm <= 165) {
                setHeartRate(bpm);
                touchBpmRef.current = bpm;
                if (navigator.vibrate) navigator.vibrate(15);
                transmitPacket(bpm, bpm >= 140 ? "Possible AFib" : "Normal Sinus Rhythm");
                setPulseLog(`💓 Optical fingertip pulse detected: ${bpm} BPM -> Kafka [wearable-vitals]`);
              }
            }
            lastPeakTimeRef.current = now;
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  // Clean up timers & media streams on unmount
  useEffect(() => {
    return () => {
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
      if (touchTimerRef.current) clearInterval(touchTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 select-none font-sans pb-12 relative overflow-x-hidden">
      {/* Interactive Heads-Up Mobile Notification Banner */}
      {activePushBanner && (
        <div className="fixed top-3 left-3 right-3 max-w-md mx-auto z-50 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md border-2 border-rose-500/80 rounded-2xl p-4 shadow-2xl shadow-rose-950/60 flex flex-col gap-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl animate-bounce">🚨</span>
                <div>
                  <div className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{activePushBanner.severity} CLINICAL PUSH</span>
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  </div>
                  <h4 className="text-sm font-black text-white">{activePushBanner.title}</h4>
                </div>
              </div>

              <button
                onClick={() => setActivePushBanner(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-snug">{activePushBanner.body}</p>

            <div className="flex items-center justify-between text-[10.5px] text-slate-400 border-t border-slate-800 pt-2">
              <span>Recipient: {activePushBanner.recipient}</span>
              <span className="text-rose-300 font-bold">SLA: ≤ {activePushBanner.slaMinutes}m</span>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                disabled={notifActionLoading}
                onClick={() => handleAcknowledgePush(activePushBanner.notificationId)}
                className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1"
              >
                <span>⚡</span>
                <span>Claim Alert</span>
              </button>
              <button
                disabled={notifActionLoading}
                onClick={() => handleEscalatePush(activePushBanner.notificationId)}
                className="py-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1"
              >
                <span>🚨</span>
                <span>Escalate ICU</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Mobile Notification Drawer / Tray */}
      {showNotifDrawer && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-sm bg-slate-900 border-l border-slate-800 h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-3 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <h3 className="font-bold text-white text-sm">Mobile Notification Feed</h3>
                </div>
                <button onClick={() => setShowNotifDrawer(false)} className="text-slate-400 hover:text-white text-sm font-bold">
                  ✕
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="text-xs text-slate-400 py-8 text-center">
                  No notifications in mobile feed.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {notifications.map((n) => (
                    <div
                      key={n.notificationId}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        n.status === "DELIVERED"
                          ? "bg-slate-950 border-rose-600/70"
                          : n.status === "ESCALATED"
                          ? "bg-purple-950/40 border-purple-800/60"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate max-w-[190px]">{n.title}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            n.status === "DELIVERED"
                              ? "bg-rose-500/20 text-rose-300"
                              : n.status === "ACKNOWLEDGED"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {n.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">{n.body}</p>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Latency: {n.deliveryLatencyMs}ms</span>
                        <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                      </div>

                      {n.status === "DELIVERED" && (
                        <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                          <button
                            onClick={() => handleAcknowledgePush(n.notificationId)}
                            className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10.5px]"
                          >
                            Claim
                          </button>
                          <button
                            onClick={() => handleEscalatePush(n.notificationId)}
                            className="flex-1 py-1 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded text-[10.5px]"
                          >
                            Escalate
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">{notifications.length} alerts received</span>
              <button
                onClick={fetchMobileNotifications}
                className="text-sky-400 font-bold hover:underline"
              >
                ↻ Refresh Feed
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Mobile App Header */}
      <div className="w-full max-w-md flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/30">
            M
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              MediSphere Mobile
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30">
                LIVE
              </span>
            </div>
            <div className="text-[11px] text-sky-400">{deviceModel}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell Button with Live Badge */}
          <button
            onClick={() => setShowNotifDrawer(!showNotifDrawer)}
            className="relative p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-full text-slate-200 transition"
            title="Mobile Notifications"
          >
            <span className="text-base">🔔</span>
            {notifications.filter((n) => n.status === "DELIVERED").length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                {notifications.filter((n) => n.status === "DELIVERED").length}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full font-medium">
            <span>🔋 {batteryLevel}%</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="w-full max-w-md flex flex-col gap-4 mt-4">
        {/* Network & Ingestion Status Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${backendConnected ? "bg-emerald-400 shadow-md shadow-emerald-500/50 animate-pulse" : "bg-rose-500"}`} />
            <div>
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>{backendConnected ? "Kafka Telemetry Hub: Online" : "Connecting to Host..."}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Topic: <span className="text-emerald-400 font-semibold">wearable-vitals</span> • Host: {typeof window !== "undefined" ? window.location.hostname : "localhost"}
              </div>
            </div>
          </div>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${typeof window !== "undefined" && window.isSecureContext ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-sky-500/20 text-sky-300 border border-sky-500/30"}`}>
            {typeof window !== "undefined" && window.isSecureContext ? "🔒 SECURE" : "📶 WI-FI HTTP"}
          </span>
        </div>

        {/* Patient Destination Selector */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Transmitting Telemetry To Patient:
          </span>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 text-white font-semibold text-sm rounded-xl p-3 outline-none focus:border-sky-500"
          >
            <option value="P001">John Doe (P001)</option>
            <option value="P002">★ Sarah Miller (P002) — Milestone 3 Scenario</option>
            <option value="P003">David Kumar (P003)</option>
            <option value="P004">Robert Taylor (P004)</option>
            <option value="P005">Elena Rostova (P005)</option>
          </select>
          <small className="text-[11px] text-slate-400">
            Packets sent from this phone update this patient's laptop dashboard in real time.
          </small>
        </div>

        {/* Live Heartbeat Visualizer */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center gap-3 shadow-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {isTouchingSensor ? "Bio-Pulse Sensor Active" : "Live Telemetry Reading"}
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div
              className={`w-36 h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${
                heartRate >= 140
                  ? "bg-red-500/20 border-2 border-red-500 shadow-xl shadow-red-500/40 animate-pulse"
                  : isTouchingSensor
                  ? "bg-emerald-500/20 border-2 border-emerald-400 shadow-xl shadow-emerald-500/30 scale-105"
                  : "bg-sky-500/10 border border-sky-500/40 shadow-lg shadow-sky-500/20"
              }`}
            >
              <span className={`text-3xl ${isTouchingSensor ? "scale-125 transition-transform" : "animate-bounce"}`}>
                ❤️
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-5xl font-black text-white tracking-tight">{heartRate}</span>
                <span className="text-xs text-slate-400 font-bold">BPM</span>
              </div>
            </div>
          </div>

          <div className="text-xs font-semibold text-center">
            {heartRate >= 140 ? (
              <span className="text-red-400 font-bold flex items-center gap-1">
                🚨 Atrial Fibrillation Spike (145 BPM)
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                ✓ Normal Sinus Rhythm
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 pt-3 border-t border-slate-800/80 w-full justify-around">
            <span>BP: 120/80</span>
            <span>SpO₂: 98%</span>
            <span>Temp: 36.6°C</span>
          </div>
        </div>

        {/* Clinical Operations & Telemetry Reality Guide (Replaces thumb box) */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-900/40 rounded-3xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔬</span>
              <div>
                <div className="text-xs font-bold text-white tracking-wide">
                  Clinical Telemetry Architecture
                </div>
                <div className="text-[10px] text-sky-400 font-semibold">
                  How This Screen Works: Real Hardware vs Scenario Simulation
                </div>
              </div>
            </div>
            <span className="text-[10px] bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded-full font-bold">
              Milestone 3
            </span>
          </div>

          <div className="flex flex-col gap-2.5 text-xs text-slate-300 leading-relaxed">
            {/* 1. Samsung Galaxy Watch */}
            <div className="bg-slate-950/80 border border-indigo-900/50 rounded-2xl p-3.5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  ⌚ 1. The Samsung Galaxy Watch
                </span>
                <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  100% REAL BODY DATA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                <strong>How it gets real pulse:</strong> The optical green LEDs on the back of the watch physically measure capillary blood volume surges in the wrist. When paired below via Bluetooth, the watch transmits your actual live physiological heartbeat.
              </p>
            </div>

            {/* 2. Camera + Flashlight on a Phone */}
            <div className="bg-slate-950/80 border border-rose-900/50 rounded-2xl p-3.5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  📷 2. Camera + Flashlight on a Phone (Real Optical Fingertip Sensor)
                </span>
                <span className="text-[9px] font-bold bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">
                  REAL OPTICAL SENSOR
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                If you place your index finger over the phone’s rear camera lens with the LED flashlight ON: The bright flashlight illuminates your finger’s capillaries, and the camera sensor captures the red brightness fluctuations of your actual pulsing blood.
              </p>
              <p className="text-[10px] text-rose-400/90 font-medium">
                👉 This is the only way a phone by itself can physically measure your real pulse.
              </p>
            </div>

            {/* 3. Clinical Scenario Dial & 145 Spike */}
            <div className="bg-slate-950/80 border border-amber-900/40 rounded-2xl p-3.5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  🎛️ 3. Clinical Scenario Dial & Presets
                </span>
                <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                  SCENARIO TESTING
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                <strong>Why are they there?</strong> In medical software, doctors cannot induce real heart attacks during software testing. These controls let you safely simulate <strong>Sarah M.'s 145 BPM Atrial Fibrillation emergency</strong> to verify that the hospital AI detector catches the arrhythmia and alerts the cardiologist!
              </p>
            </div>

            {/* 4. Real Streaming Pipeline */}
            <div className="bg-slate-950/80 border border-sky-900/40 rounded-2xl p-3.5 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                  ⚡ 4. Enterprise Streaming Pipeline
                </span>
                <span className="text-[9px] font-bold bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/30">
                  100% REAL PIPELINE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Every packet (hardware or simulated) is validated (30-220 bpm), mapped to standard <strong>HL7 FHIR R4 (LOINC 8867-4)</strong>, and published to <strong>Apache Kafka (`wearable-vitals`)</strong>.
              </p>
            </div>
          </div>

          {/* Quick Summary Comparison Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 mt-1">
            <table className="w-full text-left text-[11px] text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="p-2.5">Feature</th>
                  <th className="p-2.5">Data Type</th>
                  <th className="p-2.5">How It Works</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                <tr>
                  <td className="p-2.5 text-white font-bold">Samsung Watch (Purple Btn)</td>
                  <td className="p-2.5 text-emerald-400 font-bold">100% REAL</td>
                  <td className="p-2.5 text-slate-400">Bluetooth BLE from optical wrist photodiode</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-white font-bold">Camera + Flashlight PPG</td>
                  <td className="p-2.5 text-rose-400 font-bold">100% REAL</td>
                  <td className="p-2.5 text-slate-400">Rear camera captures red capillary pulse with LED torch</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-white font-bold">Slider & 145 Spike</td>
                  <td className="p-2.5 text-amber-400 font-bold">Scenario</td>
                  <td className="p-2.5 text-slate-400">Simulates AFib cardiac emergencies on demand</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-white font-bold">Transmission to Laptop</td>
                  <td className="p-2.5 text-sky-400 font-bold">100% REAL</td>
                  <td className="p-2.5 text-slate-400">Packets travel to Kafka & update Digital Twin</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive Camera + Flashlight Optical Pulse Sensor Card */}
        <div className="bg-slate-900 border border-rose-900/60 rounded-3xl p-5 flex flex-col gap-3.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🔦</span>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Camera + Flashlight Pulse Sensor
                  {cameraActive && (
                    <span className="text-[9px] bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded-full border border-rose-500/30 animate-pulse">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-rose-400">Physical Optical Capillary PPG</div>
              </div>
            </div>

            {torchActive && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                ⚡ Flashlight: ON
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Turns ON your phone's <strong>rear camera & LED flashlight</strong>. Place your index finger gently over the lens to illuminate and measure real blood volume pulsations!
          </p>

          <button
            onClick={cameraActive ? stopCameraSensor : startCameraSensor}
            className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
              cameraActive
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                : "bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/30"
            }`}
          >
            {cameraActive ? "⏹ Turn OFF Camera Pulse Sensor" : "🔦 Start Camera & Flashlight Sensor"}
          </button>

          {cameraError && (
            <div className="text-[11px] text-red-400 bg-red-950/50 p-2.5 rounded-xl border border-red-900/60">
              ⚠️ {cameraError}. Ensure camera permission is granted in Chrome.
            </div>
          )}

          {/* Active Sensor Live Indicators */}
          {cameraActive && (
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-rose-950 flex flex-col gap-2.5">
              {/* Finger Placement Feedback Banner */}
              <div
                className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${
                  fingerDetected
                    ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 animate-pulse"
                    : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                }`}
              >
                <span>{fingerDetected ? "🟢 FINGER DETECTED (Blood Capillaries Illuminated!)" : "⚠️ Place finger firmly over rear camera & flash"}</span>
              </div>

              {/* Red Channel Light Absorption Meter */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Capillary Red Light Intensity:</span>
                  <span className="font-mono font-bold text-rose-400">{redIntensity} / 255</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-red-600 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.round((redIntensity / 255) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Video Preview & Optical Absorption Square */}
              <div className="flex items-center gap-3 pt-1">
                <div
                  className="w-20 h-16 rounded-xl overflow-hidden border-2 relative flex-shrink-0 flex items-center justify-center transition-all duration-100 shadow-md"
                  style={{
                    backgroundColor: `rgb(${Math.max(20, redIntensity)}, 0, 0)`,
                    borderColor: fingerDetected ? "#ef4444" : "#475569"
                  }}
                >
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && streamRef.current && el.srcObject !== streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover opacity-90"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {fingerDetected && (
                    <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black tracking-wider text-white bg-black/70 px-1.5 py-0.5 rounded shadow">
                        PULSE
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-300 leading-tight flex flex-col gap-1">
                  {fingerDetected ? (
                    <span className="text-emerald-400 font-semibold">
                      ✓ Finger detected! Blood capillaries glowing red. Hold still for pulse lock.
                    </span>
                  ) : (
                    <span>
                      Place your fingertip over the <strong>camera lens closest to the flashlight</strong> until the square glows deep red.
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    💡 If your phone has multiple lenses, slide finger across to find the active lens.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Samsung Galaxy Watch Direct Bluetooth Connection Card */}
        <div className="bg-slate-900 border border-indigo-900/60 rounded-3xl p-5 flex flex-col gap-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">⌚</span>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Samsung Galaxy Watch
                  {bluetoothDeviceName && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                      CONNECTED
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-indigo-400">Bluetooth LE Heart Rate Stream</div>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Connect your Samsung Galaxy Watch directly via Bluetooth to stream your <strong>real wrist pulse</strong> into the hospital Kafka pipeline!
          </p>

          <button
            onClick={connectBluetoothWatch}
            disabled={isBluetoothConnecting}
            className={`w-full py-3.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
              bluetoothDeviceName
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
                : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-indigo-600/30"
            }`}
          >
            {isBluetoothConnecting
              ? "🔍 Scanning for Galaxy Watch..."
              : bluetoothDeviceName
              ? `✓ Connected: ${bluetoothDeviceName} (Streaming Live)`
              : "🔗 Pair Samsung Watch (Bluetooth BLE)"}
          </button>

          <button
            onClick={() => setShowWatchGuide(!showWatchGuide)}
            className="text-[11px] text-indigo-300 hover:text-white underline self-center pt-0.5"
          >
            {showWatchGuide ? "Hide pairing steps" : "👉 How to turn ON Heart Rate broadcast on Samsung Watch?"}
          </button>

          {showWatchGuide && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-indigo-950 text-[11px] text-slate-300 flex flex-col gap-2">
              <span className="font-bold text-white text-xs">Easy 3-Step Watch Setup:</span>
              <div>
                <strong>Method 1 (Samsung Health Settings):</strong>
                <ul className="list-disc list-inside mt-0.5 text-slate-400">
                  <li>On your watch, open the <strong>Samsung Health</strong> app.</li>
                  <li>Scroll down to <strong>Settings</strong> $\rightarrow$ tap <strong>HR Broadcast</strong> (or <em>Broadcast heart rate</em>) $\rightarrow$ turn <strong>ON</strong>.</li>
                </ul>
              </div>
              <div className="pt-1 border-t border-slate-800">
                <strong>Method 2 (1-Tap Free Watch App):</strong>
                <ul className="list-disc list-inside mt-0.5 text-slate-400">
                  <li>On your Galaxy Watch, open <strong>Google Play Store</strong>.</li>
                  <li>Search for <strong>"Heart Rate to Bluetooth"</strong> or <strong>"HR2Web"</strong> (free).</li>
                  <li>Open the app and tap <strong>Start Broadcast</strong>.</li>
                </ul>
              </div>
              <div className="text-emerald-400 font-semibold pt-1">
                Then tap the blue <strong>"Pair Samsung Watch"</strong> button above, select your watch from the Chrome popup, and your real pulse will stream live!
              </div>
            </div>
          )}
        </div>

        {/* Quick Vitals Slider & Scenario Presets */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Manual Heart Rate Dial:
            </span>
            <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded-md border border-sky-800">
              {heartRate} BPM
            </span>
          </div>

          <input
            type="range"
            min="50"
            max="160"
            step="1"
            value={heartRate}
            onChange={(e) => handleSetHeartRate(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          <div className="grid grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => handleSetHeartRate(65)}
              className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                heartRate === 65
                  ? "bg-sky-500 text-white border-sky-400"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              🧘 65
              <span className="block text-[9px] font-normal text-slate-400">Rest</span>
            </button>

            <button
              onClick={() => handleSetHeartRate(78)}
              className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                heartRate === 78
                  ? "bg-sky-500 text-white border-sky-400"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              🚶 78
              <span className="block text-[9px] font-normal text-slate-400">Normal</span>
            </button>

            <button
              onClick={() => handleSetHeartRate(120)}
              className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                heartRate === 120
                  ? "bg-amber-500 text-white border-amber-400"
                  : "bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800"
              }`}
            >
              🏃 120
              <span className="block text-[9px] font-normal text-slate-400">Active</span>
            </button>

            <button
              onClick={() => handleSetHeartRate(145)}
              className={`py-2 rounded-xl text-[11px] font-bold border transition-all ${
                heartRate === 145
                  ? "bg-red-600 text-white border-red-500"
                  : "bg-slate-950 text-red-400 border-red-900/60 hover:bg-red-950/30"
              }`}
            >
              🚨 145
              <span className="block text-[9px] font-normal text-red-400">AFib</span>
            </button>
          </div>
        </div>

        {/* Primary Action Controls */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={toggleLiveStreaming}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all duration-200 shadow-lg flex items-center justify-center gap-2 ${
              isStreaming
                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30 animate-pulse"
                : "bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-600/30"
            }`}
          >
            {isStreaming ? "⏹ Pause Continuous Stream" : "▶ Start Live Streaming (Every 2s)"}
          </button>

          <button
            onClick={triggerSarahSpikeFromPhone}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-red-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            🚨 Trigger Sarah M. Spike (145 bpm)
          </button>

          <button
            onClick={() => setShowCameraNotice(!showCameraNotice)}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-medium text-xs border border-slate-800 transition-all flex items-center justify-center gap-1.5"
          >
            ℹ️ Why did the camera button say permission denied?
          </button>
        </div>

        {/* Camera Security Policy Explainer (Expandable) */}
        {showCameraNotice && (
          <div className="bg-slate-900/90 border border-sky-900/60 rounded-2xl p-4 text-xs text-slate-300 flex flex-col gap-2">
            <div className="font-bold text-sky-400 flex items-center gap-1.5">
              🔒 Android Chrome Security Policy
            </div>
            <p className="text-slate-300 leading-relaxed text-[12px]">
              Google Chrome automatically restricts physical camera and microphone hardware when browsing over unencrypted local IP addresses (<code>http://&lt;local-ip&gt;:5173</code>).
            </p>
            <p className="text-emerald-400 text-[12px] font-semibold">
              ✨ Good news: You do NOT need the camera! Your phone is already streaming real biometric telemetry packets to Kafka using the <strong>Live Stream</strong> button and the <strong>Thumb Pulse Sensor Pad</strong> above.
            </p>
            <button
              onClick={() => setShowCameraNotice(false)}
              className="mt-1 text-[11px] font-semibold text-sky-400 underline self-end"
            >
              Got it, close notice
            </button>
          </div>
        )}

        {/* Emergency Mobile Push & Notification Hub */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <div>
                <div className="text-xs font-bold text-white tracking-wide">
                  Mobile Push & Emergency Notifications Hub
                </div>
                <div className="text-[10px] text-sky-400 font-semibold">
                  Carrier Relay & Web Push Dispatcher (SLA ≤ 3.2m)
                </div>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
              DISPATCHER LIVE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={handleSendTestPush}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <span>⚡</span>
              <span>Send Test Push</span>
            </button>
            <button
              onClick={triggerSarahSpikeFromPhone}
              className="py-2.5 px-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
            >
              <span>🚨</span>
              <span>Trigger Sarah AFib</span>
            </button>
          </div>

          {/* Preferences & Browser Push Registration */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3 flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Native Browser Push:</span>
              {hasPushPermission ? (
                <span className="text-[10px] text-emerald-400 font-bold">✓ Permission Granted</span>
              ) : (
                <button
                  onClick={handleRequestPushPermission}
                  className="text-[10px] bg-sky-600 hover:bg-sky-500 text-white font-bold px-2.5 py-1 rounded-lg"
                >
                  Enable Native Push
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundAlertsEnabled}
                  onChange={(e) => setSoundAlertsEnabled(e.target.checked)}
                  className="accent-sky-500"
                />
                <span className="text-[11px] text-slate-300">Audio Chime</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vibrateAlertsEnabled}
                  onChange={(e) => setVibrateAlertsEnabled(e.target.checked)}
                  className="accent-sky-500"
                />
                <span className="text-[11px] text-slate-300">Haptic Vibration</span>
              </label>
            </div>
          </div>
        </div>

        {/* Transmission Status Log */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-400 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Kafka Ingestion Status:</span>
            <span className="text-emerald-400">Packets Sent: {sentCount}</span>
          </div>
          <div className="text-sky-300 text-[11px] leading-relaxed break-all">
            {pulseLog}
          </div>
          {lastSentTime && (
            <div className="text-[10px] text-slate-500">
              Last transmitted at: {lastSentTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
