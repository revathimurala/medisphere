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
import { api } from "./api";

function Shell({ user, onLogout }) {
  const [view, setView] = useState("dashboard");
  const [patients, setPatients] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
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

  useEffect(() => {
    loadPatients().then((data) => {
      if (isProvider && data.length) {
        const patientId = selectedId || data[0].id;
        setSelectedId(patientId);
        openPatient(patientId);
      }
    });
    loadValidation();
    // A patient session goes straight to its own twin - there is no roster to browse.
    if (!isProvider) openPatient(user.username);
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

  const title =
    {
      dashboard: "Patient 360 Dashboard",
      pipeline: "Data Ingestion Pipeline",
      patients: "Patients",
      twin: "Digital Twin",
      validation: "Validation",
      audit: "Audit Log"
    }[view] || "Dashboard";

  return (
    <div className="app">
      <Sidebar current={view} onSelect={setView} role={user.role} />
      <div className="app__main">
        <TopBar title={title} username={user.username} onLogout={onLogout} />
        <main className="content">
          {notice && <div className="notice">{notice}</div>}

          {!isProvider && (
            <div className="notice notice--info">
              You're signed in as a patient — this view is scoped to your own record only.
              The backend rejects requests for any other patient (RBAC), it isn't just hidden here.
            </div>
          )}

          {view === "dashboard" && (
            <>
              {isProvider && (
                <PipelinePanel onComplete={refreshAfterChange} />
              )}
              <StatCards
                patientCount={isProvider ? patients.length : 1}
                resourceCount={validation?.fhirResourceValidation?.total ?? 0}
                twinCount={isProvider ? patients.filter((p) => p.twinReady).length : twin ? 1 : 0}
              />
              {isProvider && (
                <PatientList
                  patients={patients}
                  selectedId={selectedId}
                  onOpen={openPatient}
                  onSynced={refreshAfterChange}
                />
              )}
              <TwinPanel twin={twin} onRefresh={refreshAfterChange} />
            </>
          )}

          {view === "pipeline" && isProvider && (
            <PipelinePanel onComplete={refreshAfterChange} />
          )}

          {view === "patients" && isProvider && (
            <PatientList patients={patients} selectedId={selectedId} onOpen={(id) => { openPatient(id); setView("twin"); }} onSynced={refreshAfterChange} />
          )}

          {view === "twin" && <TwinPanel twin={twin} onRefresh={refreshAfterChange} />}

          {view === "validation" && <ValidationPanel data={validation} />}

          {view === "audit" && isProvider && <AuditLog />}
          {view === "audit" && !isProvider && (
            <div className="panel empty-panel">The audit trail is a provider-only view (RBAC).</div>
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
