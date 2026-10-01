import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const { login, register, loading, error, clearError } = useAuth();

  // Mode: "login" (Sign In) vs "signup" (Create Account)
  const [mode, setMode] = useState("login");

  // Sign In state - clean empty fields, no passwords displayed or pre-filled
  const [loginRole, setLoginRole] = useState("provider"); // "provider" | "patient" | "admin"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up state
  const [regRole, setRegRole] = useState("patient");
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [validationError, setValidationError] = useState("");

  const switchMode = (nextMode) => {
    clearError();
    setValidationError("");
    setMode(nextMode);
  };

  // Switch role inside Login tab
  const handleRoleTabChange = (role) => {
    clearError();
    setLoginRole(role);
  };

  // Submit Sign In
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    if (!username.trim()) {
      setValidationError("Please enter your username or Patient ID.");
      return;
    }
    if (!password) {
      setValidationError("Please enter your password.");
      return;
    }

    try {
      await login(username.trim(), password, loginRole);
    } catch {
      // Error message handled by AuthContext
    }
  };

  // Submit Sign Up
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (!regName.trim()) {
      setValidationError("Please enter your full name.");
      return;
    }
    if (!regUsername.trim()) {
      setValidationError("Please enter a username or Patient ID.");
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setValidationError("Password must be at least 4 characters long.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setValidationError("Passwords do not match. Please verify.");
      return;
    }

    try {
      await register({
        username: regUsername.trim(),
        name: regName.trim(),
        email: regEmail.trim(),
        role: regRole,
        password: regPassword,
        patientId: regRole === "patient" ? regUsername.trim().toUpperCase() : ""
      });
    } catch {
      // Error message handled by AuthContext
    }
  };

  return (
    <div className="login-screen-modern">
      {/* Decorative backdrop elements */}
      <div className="login-bg-glow login-bg-glow--1" />
      <div className="login-bg-glow login-bg-glow--2" />

      <div className="login-card-modern">
        {/* Brand & Platform Header - Clean MediSphere title without FHIR badge beside it */}
        <div className="login-header">
          <div className="login-brand-badge">
            <span className="login-brand-icon">⚕</span>
            <span className="login-brand-text">MediSphere</span>
          </div>
          <h1 className="login-title">Digital Health Twin Platform</h1>
          <p className="login-subtitle">
            Secure Clinical Telemetry, AI Risk Analytics &amp; Patient Portal
          </p>
        </div>

        {/* Navigation Tabs: Sign In vs Sign Up */}
        <div className="login-mode-tabs" role="tablist">
          <button
            type="button"
            className={`login-mode-tab ${mode === "login" ? "login-mode-tab--active" : ""}`}
            onClick={() => switchMode("login")}
            id="tab-sign-in"
          >
            <span className="tab-icon">🔑</span> Sign In
          </button>
          <button
            type="button"
            className={`login-mode-tab ${mode === "signup" ? "login-mode-tab--active" : ""}`}
            onClick={() => switchMode("signup")}
            id="tab-sign-up"
          >
            <span className="tab-icon">✨</span> Create Account (Sign Up)
          </button>
        </div>

        {/* Global Error Banner */}
        {(error || validationError) && (
          <div className="login-alert-error" role="alert">
            <svg className="login-alert-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{validationError || error}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* MODE 1: SIGN IN (LOGIN) FORM                                  */}
        {/* ============================================================ */}
        {mode === "login" && (
          <form className="login-form" onSubmit={handleLoginSubmit}>
            {/* Role selector selector pills */}
            <div className="login-role-selector">
              <label className="login-field-label">Select Your Role:</label>
              <div className="login-role-buttons">
                <button
                  type="button"
                  className={`login-role-btn ${loginRole === "provider" ? "login-role-btn--active" : ""}`}
                  onClick={() => handleRoleTabChange("provider")}
                >
                  <span className="role-icon">🩺</span> Clinician
                </button>
                <button
                  type="button"
                  className={`login-role-btn ${loginRole === "patient" ? "login-role-btn--active" : ""}`}
                  onClick={() => handleRoleTabChange("patient")}
                >
                  <span className="role-icon">👤</span> Patient
                </button>
                <button
                  type="button"
                  className={`login-role-btn ${loginRole === "admin" ? "login-role-btn--active" : ""}`}
                  onClick={() => handleRoleTabChange("admin")}
                >
                  <span className="role-icon">🛡️</span> Admin
                </button>
              </div>
            </div>

            {/* Username / Patient ID Field */}
            <div className="login-input-group">
              <label className="login-field-label" htmlFor="login-username">
                {loginRole === "patient" ? "Patient ID / Username" : "Clinician / Provider Username"}
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">👤</span>
                <input
                  id="login-username"
                  type="text"
                  className="login-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={loginRole === "patient" ? "e.g. P001" : "e.g. clinician-demo"}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="login-input-group">
              <div className="login-label-row">
                <label className="login-field-label" htmlFor="login-password">Password</label>
              </div>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔒</span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
              id="btn-login-submit"
            >
              {loading ? (
                <span className="login-spinner-row">
                  <span className="login-spinner" /> Authenticating...
                </span>
              ) : (
                <>Sign In to MediSphere →</>
              )}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* MODE 2: SIGN UP (CREATE ACCOUNT) FORM                        */}
        {/* ============================================================ */}
        {mode === "signup" && (
          <form className="login-form" onSubmit={handleRegisterSubmit}>
            {/* Account Role Selector */}
            <div className="login-role-selector">
              <label className="login-field-label">I am registering as:</label>
              <div className="login-role-buttons">
                <button
                  type="button"
                  className={`login-role-btn ${regRole === "patient" ? "login-role-btn--active" : ""}`}
                  onClick={() => setRegRole("patient")}
                >
                  <span className="role-icon">👤</span> Patient
                </button>
                <button
                  type="button"
                  className={`login-role-btn ${regRole === "provider" ? "login-role-btn--active" : ""}`}
                  onClick={() => setRegRole("provider")}
                >
                  <span className="role-icon">🩺</span> Clinician / Doctor
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div className="login-input-group">
              <label className="login-field-label" htmlFor="reg-name">Full Name</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">📝</span>
                <input
                  id="reg-name"
                  type="text"
                  className="login-input"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder={regRole === "patient" ? "e.g. Sarah Connor" : "e.g. Dr. Marcus Vance, MD"}
                  required
                />
              </div>
            </div>

            {/* Username / Patient ID */}
            <div className="login-input-group">
              <label className="login-field-label" htmlFor="reg-username">
                {regRole === "patient" ? "Username / Patient ID (e.g. P006)" : "Clinician Username"}
              </label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">👤</span>
                <input
                  id="reg-username"
                  type="text"
                  className="login-input"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder={regRole === "patient" ? "P006" : "dr.vance"}
                  required
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="login-input-group">
              <label className="login-field-label" htmlFor="reg-email">Email Address (Optional)</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">✉️</span>
                <input
                  id="reg-email"
                  type="email"
                  className="login-input"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="name@medisphere.org"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-input-group">
              <label className="login-field-label" htmlFor="reg-password">Password (Min. 4 characters)</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔒</span>
                <input
                  id="reg-password"
                  type={showRegPassword ? "text" : "password"}
                  className="login-input"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a secure password"
                  required
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  title="Toggle password visibility"
                >
                  {showRegPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="login-input-group">
              <label className="login-field-label" htmlFor="reg-confirm-password">Confirm Password</label>
              <div className="login-input-wrapper">
                <span className="login-input-icon">🔐</span>
                <input
                  id="reg-confirm-password"
                  type={showRegPassword ? "text" : "password"}
                  className="login-input"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                />
              </div>
            </div>

            {/* Sign Up Submit Button */}
            <button
              type="submit"
              className="login-submit-btn login-submit-btn--register"
              disabled={loading}
              id="btn-signup-submit"
            >
              {loading ? (
                <span className="login-spinner-row">
                  <span className="login-spinner" /> Creating Account...
                </span>
              ) : (
                <>Create Account &amp; Access Dashboard →</>
              )}
            </button>

            <div className="login-switch-row">
              <span>Already registered?</span>
              <button
                type="button"
                className="login-switch-link"
                onClick={() => switchMode("login")}
              >
                Sign In to existing account
              </button>
            </div>
          </form>
        )}

        {/* Mobile Biosensor Hardware Telemetry Shortcut */}
        <div className="login-mobile-link-container">
          <span className="login-mobile-link-label">Using an Android phone as a hardware monitor?</span>
          <a
            href="#/mobile-sensor"
            className="login-mobile-link-btn"
          >
            📱 Launch Mobile Biosensor Telemetry Mode
          </a>
        </div>

        {/* Footer Security Badges */}
        <div className="login-footer-badges">
          <span className="footer-badge">🔒 HIPAA Ready</span>
          <span className="footer-badge">🛡️ Secure Authentication</span>
          <span className="footer-badge">🩺 Digital Twins</span>
        </div>
      </div>
    </div>
  );
}
