export default function TopBar({ title, username, role, onLogout }) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar__user">
        <span className="topbar__user-badge">
          {role === "provider" ? "Clinician" : "Patient"}
        </span>
        <span className="topbar__username">{username}</span>
        <button type="button" className="topbar__logout-btn" onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  );
}
