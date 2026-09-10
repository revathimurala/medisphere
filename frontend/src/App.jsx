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
import { PredictionsView, CareplansView, ReportsView } from "./components/IntelligencePanels";
import Milestone2PredictionScreen from "./components/Milestone2PredictionScreen";
import DashboardHub from "./components/DashboardHub";
import { api } from "./api";

const VALID_VIEWS = [
  "dashboard",
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

  const isProvider = user.role === "provider";

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
      const targetId = nextPatientId || selectedId;
      const targetHash = `#/${nextView}${targetId ? `/${targetId}` : ""}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      } else {
        setView(nextView);
        if (targetId && targetId !== selectedId) {
          openPatient(targetId);
        }
      }
    },
    [openPatient, selectedId]
  );

  // Listen to browser Back / Forward arrow clicks (native browser navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const { view: hView, patientId: hPatientId } = parseHash(window.location.hash);
      setView(hView);
      if (hPatientId && hPatientId !== selectedId) {
        openPatient(hPatientId);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [openPatient, selectedId]);

  useEffect(() => {
    loadPatients().then((data) => {
      if (isProvider && data.length) {
        const { patientId: hashPatientId } = parseHash(window.location.hash);
        const patientId = hashPatientId || selectedId || data[0].id;
        setSelectedId(patientId);
        openPatient(patientId);
        if (!window.location.hash) {
          window.location.hash = `#/dashboard/${patientId}`;
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
  }, [isProvider, loadPatients, loadValidation, openPatient, selectedId, user.username]);

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
      dashboard: isProvider ? "Patient 360 Dashboard" : "My Health Dashboard",
      pipeline: "Data Ingestion Pipeline",
      patients: "Patients",
      twin: "Digital Twin",
      validation: "System Compliance",
      audit: "Audit Log",
      predictions: "AI Risk Prediction Engine",
      careplans: "Precision Care Protocol",
      reports: "Clinical Health Summary",
    }[view] || "Dashboard";

  return (
    <div className="app">
      <Sidebar current={view} onSelect={(v) => navigateTo(v)} role={user.role} />
      <div className="app__main">
        <TopBar
          title={title}
          username={user.username}
          role={user.role}
          onLogout={onLogout}
        />
        <main className="content">
          {notice && <div className="notice">{notice}</div>}

          {view === "dashboard" && (
            <>
              {isProvider && (
                <StatCards
                  patientCount={patients.length}
                  resourceCount={validation?.fhirResourceValidation?.total ?? 0}
                  twinCount={patients.filter((p) => p.twinReady).length}
                />
              )}
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
                onNavigate={(v) => navigateTo(v)}
              />
            </>
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

          {view === "twin" && <TwinPanel twin={twin} onRefresh={refreshAfterChange} />}

          {view === "validation" && isProvider && <ValidationPanel data={validation} />}

          {view === "audit" && isProvider && <AuditLog />}

          {view === "predictions" && (
            <Milestone2PredictionScreen
              selectedPatientId={selectedId || "P001"}
              onSelectPatient={(pid) => {
                setSelectedId(pid);
                openPatient(pid);
                navigateTo("predictions", pid);
              }}
              onNavigate={(v) => navigateTo(v)}
            />
          )}

          {view === "careplans" && (
            <CareplansView
              twin={twin}
              patientName={currentPatient?.name || twin?.patientId}
            />
          )}

          {view === "reports" && (
            <ReportsView
              twin={twin}
              patientName={currentPatient?.name || twin?.patientId}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { user, ready, logout } = useAuth();

  if (!ready || !user) {
    return <LoginScreen />;
  }

  return <Shell user={user} onLogout={logout} />;
}
