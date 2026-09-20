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
        <p className="login-card__tag">FHIR R4 Interoperability &amp; Digital Health Twin Platform</p>

        <button className="login-btn login-btn--primary" onClick={loginAsProvider} disabled={loading}>
          {loading ? "Signing in…" : "Sign in as Clinician / Provider"}
        </button>

        <form className="login-patient-row" onSubmit={loginAsPatient}>
          <input
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            placeholder="Patient ID (e.g. P001)"
          />
          <button className="login-btn" type="submit" disabled={loading}>
            Sign in as Patient
          </button>
        </form>

        <p className="login-card__hint">
          Sign in with any patient ID (P001 to P005) to access your personalized Digital Health Twin, vitals telemetry, and precision careplan.
        </p>

        <div className="mt-5 pt-4 border-t border-slate-700/60 flex flex-col items-center gap-2">
          <span className="text-xs text-slate-400">Using an Android phone as a hardware monitor?</span>
          <a
            href="#/mobile-sensor"
            className="w-full text-center py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs tracking-wide shadow-md transition-all active:scale-[0.98]"
          >
            📱 Launch Mobile Biosensor Telemetry Mode
          </a>
        </div>

        {error && <div className="login-card__error">{error}</div>}
      </div>
    </div>
  );
}
