export default function TopBar({ title, username, onLogout }) {
  return (
    <header className="topbar">
      <h1>{title}</h1>
      <div className="topbar__user">
        <span>{username}</span>
        <button onClick={onLogout}>Sign out</button>
      </div>
    </header>
  );
}
