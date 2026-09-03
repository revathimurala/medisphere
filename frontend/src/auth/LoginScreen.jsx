import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const { login, loading, error } = useAuth();
  const [patientId, setPatientId] = useState("P001");

  const loginAsProvider = () => login("clinician-demo", "provider").catch(() => {});
  const loginAsPatient = (e) => {
    e.preventDefault();
    // The backend matches a patient session's JWT `sub` against the
    // requested :patientId on /api/twins/:id, so the patient logs in *as*
    // their own patient ID.
    login(patientId.trim(), "patient").catch(() => {});
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__brand">MediSphere</div>
        <h1>Clinical Operations</h1>
        <p className="login-card__tag">Milestone 1 · FHIR Integration &amp; Twin Foundation</p>

        <button className="login-btn login-btn--primary" onClick={loginAsProvider} disabled={loading}>
          {loading ? "Signing in…" : "Sign in as Clinician / Provider"}
        </button>

        <form className="login-patient-row" onSubmit={loginAsPatient}>
          <input
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="Patient ID, e.g. P001"
          />
          <button className="login-btn" type="submit" disabled={loading}>
            Sign in as Patient
          </button>
        </form>
        <p className="login-card__hint">
          A patient session is scoped to that one record only — the backend rejects
          requests for any other patient's twin (RBAC), it isn't just hidden by this UI.
        </p>

        {error && <div className="login-card__error">{error}</div>}
      </div>
    </div>
  );
}
