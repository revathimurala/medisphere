export default function TopBar({ title, username, role, onLogout }) {
  const isProvider = role === "provider";

  return (
    <header className="h-[70px] sticky top-0 z-20 backdrop-blur-md bg-white/95 border-b border-slate-200/80 px-8 flex items-center justify-between transition-all box-border">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200/80 pl-2.5 pr-3.5 py-1.5 rounded-full text-xs text-slate-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-900">{username}</span>
          <span className="text-slate-400">·</span>
          <span className="text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
            {isProvider ? "Clinician" : "Patient"}
          </span>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 px-3.5 py-2 rounded-xl border border-transparent hover:border-red-100 transition-all duration-150"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
