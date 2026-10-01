import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth/AuthContext";
import LoginScreen from "./auth/LoginScreen";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import StatCards from "./components/StatCards";
import PatientList from "./components/PatientList";
import TwinPanel from "./components/TwinPanel";
import ValidationPanel from "./components/ValidationPanel";
import AuditLog from "./components/AuditLog";
import PipelinePanel from "./components/PipelinePanel";
import { PredictionsView, CareplansView } from "./components/IntelligencePanels";
import ClinicalSummaryScreen from "./components/ClinicalSummaryScreen";
import Milestone2PredictionScreen from "./components/Milestone2PredictionScreen";
import WearableMonitoringScreen from "./components/WearableMonitoringScreen";
import MobileSensorScreen from "./components/MobileSensorScreen";
import Milestone4CareplanScreen from "./components/Milestone4CareplanScreen";
import DashboardHub from "./components/DashboardHub";
import GlobalAlertBanner from "./components/GlobalAlertBanner";
import ClinicalAlertScreen from "./components/ClinicalAlertScreen";
import ClinicalRuleEngineScreen from "./components/ClinicalRuleEngineScreen";
import { api } from "./api";

const VALID_VIEWS = [
  "dashboard",
  "alerts",
  "rules",
  "monitoring",
  "mobile-sensor",
  "pipeline",
  "patients",
  "twin",
  "validation",
  "audit",
  "predictions",
  "careplans",
  "reports",
];

function parseHash(hash) {
  const clean = (hash || window.location.hash || "").replace(/^#\/?/, "");
  if (!clean) return { view: "dashboard", patientId: null };
  const parts = clean.split("/").filter(Boolean);
  const view = VALID_VIEWS.includes(parts[0]) ? parts[0] : "dashboard";
  const patientId = parts[1] || null;
  return { view, patientId };
}

function Shell({ user, onLogout }) {
  const initialRoute = parseHash(window.location.hash);
  const [view, setView] = useState(initialRoute.view);
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(initialRoute.patientId);
  const [twin, setTwin] = useState(null);
  const [validation, setValidation] = useState(null);
  const [notice, setNotice] = useState("");

  const isProvider = user.role === "provider" || user.role === "admin";

  const loadPatients = useCallback(async () => {
    if (!isProvider) return [];
    try {
      const data = await api.getPatients();
      setPatients(data);
      return data;
    } catch {
      setNotice("Could not load the patient roster.");
      return [];
    }
  }, [isProvider]);

  const loadValidation = useCallback(() => {
    api.getValidation().then(setValidation).catch(() => {});
  }, []);

  const openPatient = useCallback(
    (patientId) => {
      setSelectedId(patientId);
      setTwin(null);
      api
        .getTwin(patientId)
        .then(setTwin)
        .catch((e) => setNotice(e.response?.data?.message || "Could not load this twin."));
    },
    []
  );

  // Browser Navigation: Route changes via real browser URL hash
  const navigateTo = useCallback(
    (nextView, nextPatientId = null) => {
      const effectivePatientId = isProvider ? nextPatientId : user.username;
      const targetHash = `#/${nextView}${effectivePatientId ? `/${effectivePatientId}` : ""}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      } else {
        setView(nextView);
        setSelectedId(effectivePatientId);
        if (effectivePatientId) {
          openPatient(effectivePatientId);
        } else {
          setTwin(null);
        }
      }
    },
    [openPatient, isProvider, user.username]
  );

  // Listen to browser Back / Forward arrow clicks (native browser navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const { view: hView, patientId: hPatientId } = parseHash(window.location.hash);
      const effectivePatientId = isProvider ? hPatientId : user.username;
      setView(hView);
      setSelectedId(effectivePatientId);
      if (effectivePatientId) {
        openPatient(effectivePatientId);
      } else {
        setTwin(null);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [openPatient, isProvider, user.username]);

  useEffect(() => {
    loadPatients().then((data) => {
      if (isProvider && data.length) {
        const { patientId: hashPatientId } = parseHash(window.location.hash);
        if (hashPatientId) {
          setSelectedId(hashPatientId);
          openPatient(hashPatientId);
        } else {
          setSelectedId(null);
          setTwin(null);
          if (!window.location.hash) {
            window.location.hash = `#/dashboard`;
          }
        }
      }
    });
    loadValidation();
    if (!isProvider) {
      openPatient(user.username);
      if (!window.location.hash) {
        window.location.hash = `#/dashboard/${user.username}`;
      }
    }
  }, [isProvider, loadPatients, loadValidation, openPatient, user.username]);

  useEffect(() => {
    if (!isProvider) return undefined;

    const refreshLiveData = () => {
      loadPatients();
      loadValidation();
      if (selectedId) {
        api.getTwin(selectedId).then(setTwin).catch(() => {});
      }
    };

    const intervalId = window.setInterval(refreshLiveData, 5000);
    return () => window.clearInterval(intervalId);
  }, [isProvider, loadPatients, loadValidation, selectedId]);

  const refreshAfterChange = async () => {
    const data = await loadPatients();
    loadValidation();
    const patientId = selectedId || data[0]?.id;
    if (patientId) {
      setSelectedId(patientId);
      openPatient(patientId);
    }
  };

  const currentPatient =
    patients.find((p) => p.id === (selectedId || twin?.patientId)) ||
    (twin?.demographics ? { id: twin.patientId, name: twin.demographics.name } : null);

  const title =
    {
      dashboard: selectedId && twin ? (isProvider ? `Patient 360: ${currentPatient?.name || selectedId}` : "My Health Dashboard") : (isProvider ? "Clinical Patient Directory" : "My Health Dashboard"),
      twin: selectedId && twin ? `Digital Twin: ${currentPatient?.name || selectedId}` : "Digital Health Twin Directory",
      predictions: selectedId ? `AI Risk Prediction: ${currentPatient?.name || selectedId}` : "AI Risk Prediction Directory",
      careplans: selectedId ? `Care Protocol: ${currentPatient?.name || selectedId}` : "Precision Care Protocols Directory",
      reports: selectedId ? `Clinical Summary: ${currentPatient?.name || selectedId}` : "Clinical Health Summary Directory",
      monitoring: selectedId ? `Wearable Telemetry: ${currentPatient?.name || selectedId}` : "Wearable Telemetry Directory",
      alerts: "Clinical Alert Center & Escalation Engine",
      rules: "Clinical Decision Support (CDS) Rule Engine",
      "mobile-sensor": "Mobile Biosensor & Emergency Push Hub",
      pipeline: "Data Pipeline",
      patients: "Patient Cohort Management",
      validation: "FHIR R4 Validation & Compliance",
      audit: "Audit Log",
    }[view] || "Dashboard";

  return (
    <div className="app">
      <Sidebar
        current={view}
        onSelect={(v) => {
          const directoryViews = ["dashboard", "twin", "predictions", "careplans", "reports", "monitoring"];
          if (directoryViews.includes(v)) {
            navigateTo(v, null);
          } else {
            navigateTo(v, selectedId);
          }
        }}
        role={user.role}
      />
      <div className="app__main">
        <TopBar
          title={title}
          username={user.username}
          role={user.role}
          onLogout={onLogout}
        />
        <GlobalAlertBanner onNavigate={(v, pid) => navigateTo(v, pid)} selectedPatientId={selectedId} />
        <main className="content">
          {notice && <div className="notice">{notice}</div>}

          {view === "dashboard" && (
            <>
              {isProvider && (
                <StatCards
                  patientCount={patients.length}
                  highRiskCount={patients.filter((p) => (p.riskCategory || "").toLowerCase().includes("high") || (p.riskScore || 0) >= 20).length}
                  twinCount={patients.filter((p) => p.twinReady).length}
                />
              )}
              {selectedId && twin ? (
                <DashboardHub
                  twin={twin}
                  patient={currentPatient}
                  patients={patients}
                  selectedId={selectedId}
                  onSelectPatient={(pid) => {
                    openPatient(pid);
                    navigateTo("dashboard", pid);
                  }}
                  isProvider={isProvider}
                  onNavigate={(v) => navigateTo(v, selectedId)}
                  onBackToDirectory={() => navigateTo("dashboard", null)}
                />
              ) : (
                <PatientList
                  patients={patients}
                  selectedId={selectedId}
                  onOpen={(id) => {
                    openPatient(id);
                    navigateTo("dashboard", id);
                  }}
                  onOpenTwin={(id) => navigateTo("twin", id)}
                  onOpenPredictions={(id) => navigateTo("predictions", id)}
                  onSynced={refreshAfterChange}
                />
              )}
            </>
          )}

          {view === "alerts" && (
            <ClinicalAlertScreen
              selectedPatientId={selectedId || "P002"}
              onSelectPatient={(pid) => {
                setSelectedId(pid);
                openPatient(pid);
                navigateTo("alerts", pid);
              }}
              onNavigate={(v, pid) => navigateTo(v, pid)}
            />
          )}

          {view === "rules" && (
            <ClinicalRuleEngineScreen
              selectedPatientId={selectedId || "P002"}
              onNavigate={(v, pid) => navigateTo(v, pid)}
            />
          )}

          {view === "monitoring" && (
            <WearableMonitoringScreen
              selectedPatientId={selectedId}
              onSelectPatient={(pid) => {
                if (pid) {
                  setSelectedId(pid);
                  openPatient(pid);
                  navigateTo("monitoring", pid);
                } else {
                  navigateTo("monitoring", null);
                }
              }}
              onBackToDirectory={() => navigateTo("monitoring", null)}
              onNavigate={(v, pid) => navigateTo(v, pid || selectedId)}
            />
          )}

          {view === "pipeline" && isProvider && (
            <PipelinePanel onComplete={refreshAfterChange} />
          )}

          {view === "patients" && isProvider && (
            <PatientList
              patients={patients}
              selectedId={selectedId}
              onOpen={(id) => navigateTo("twin", id)}
              onOpenTwin={(id) => navigateTo("twin", id)}
              onOpenPredictions={(id) => navigateTo("predictions", id)}
              onSynced={refreshAfterChange}
            />
          )}

          {view === "twin" && (
            <TwinPanel
              twin={twin}
              patients={patients}
              selectedId={selectedId}
              isProvider={isProvider}
              role={user.role}
              onSelectPatient={(pid) => {
                if (isProvider) {
                  openPatient(pid);
                  navigateTo("twin", pid);
                }
              }}
              onBackToDirectory={() => {
                if (isProvider) navigateTo("twin", null);
              }}
              onRefresh={refreshAfterChange}
              onNavigate={(v, pid) => navigateTo(v, isProvider ? pid || selectedId : user.username)}
            />
          )}

          {view === "validation" && isProvider && <ValidationPanel data={validation} />}

          {view === "audit" && isProvider && <AuditLog />}

          {view === "predictions" && (
            <Milestone2PredictionScreen
              selectedPatientId={selectedId}
              onSelectPatient={(pid) => {
                if (pid) {
                  setSelectedId(pid);
                  openPatient(pid);
                  navigateTo("predictions", pid);
                } else {
                  navigateTo("predictions", null);
                }
              }}
              onBackToDirectory={() => navigateTo("predictions", null)}
              onNavigate={(v, pid) => navigateTo(v, pid || selectedId)}
            />
          )}

          {view === "careplans" && (
            <Milestone4CareplanScreen
              selectedPatientId={isProvider ? selectedId : user.username}
              role={user.role}
              currentUserId={user.username}
              onSelectPatient={(pid) => {
                if (isProvider) {
                  if (pid) {
                    setSelectedId(pid);
                    openPatient(pid);
                    navigateTo("careplans", pid);
                  } else {
                    navigateTo("careplans", null);
                  }
                }
              }}
              onBackToDirectory={() => {
                if (isProvider) navigateTo("careplans", null);
              }}
              onNavigate={(v, pid) => navigateTo(v, isProvider ? pid || selectedId : user.username)}
            />
          )}

          {view === "reports" && (
            <ClinicalSummaryScreen
              selectedPatientId={selectedId}
              onSelectPatient={(pid) => {
                setSelectedId(pid);
                openPatient(pid);
                navigateTo("reports", pid);
              }}
              onBackToDirectory={() => navigateTo("reports", null)}
            />
          )}

          {view === "mobile-sensor" && <MobileSensorScreen />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [hash, setHash] = useState(() => (window.location.hash || "").replace(/^#\/?/, ""));

  useEffect(() => {
    const onHashChange = () => {
      setHash((window.location.hash || "").replace(/^#\/?/, ""));
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  if (
    hash.startsWith("mobile-sensor") ||
    hash.startsWith("mobile") ||
    hash.startsWith("sensor") ||
    hash.startsWith("phone")
  ) {
    return <MobileSensorScreen />;
  }

  const { user, ready, logout } = useAuth();

  if (!ready || !user) {
    return <LoginScreen />;
  }

  return <Shell user={user} onLogout={logout} />;
}
