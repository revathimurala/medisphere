const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "📊", providerOnly: false },
  { key: "alerts", label: "Clinical Alerts", icon: "🚨", providerOnly: false, badge: "STAT" },
  { key: "rules", label: "Clinical Rules", icon: "⚖️", providerOnly: false, badge: "CDS" },
  { key: "monitoring", label: "Wearable Telemetry", icon: "⌚", providerOnly: false, badge: "M3 Live" },
  { key: "mobile-sensor", label: "Mobile Biosensor", icon: "📱", providerOnly: false, badge: "Phone" },
  { key: "pipeline", label: "Data Pipeline", icon: "🔄", providerOnly: true },
  { key: "patients", label: "Patients", icon: "👥", providerOnly: true },
  { key: "twin", label: "Digital Twin", icon: "🧬", providerOnly: false },
  { key: "validation", label: "System Compliance", icon: "🛡️", providerOnly: true },
  { key: "audit", label: "Audit Log", icon: "📜", providerOnly: true },
];

const INTELLIGENCE_ITEMS = [
  { key: "predictions", label: "Risk Predictions", icon: "🧠", tag: "AI" },
  { key: "careplans", label: "Care Protocols", icon: "📋", tag: "Clinical" },
  { key: "reports", label: "Clinical Summary", icon: "📑", tag: "Report" },
];

export default function Sidebar({ current, onSelect, role }) {
  const isProvider = role === "provider";
  const visibleNav = NAV_ITEMS.filter((item) => isProvider || !item.providerOnly);

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 select-none sticky top-0 h-screen overflow-y-auto z-20">
      <div>
        {/* Brand Header - Height strictly synchronized with TopBar (h-[70px]) */}
        <div className="h-[70px] flex items-center gap-3 px-5 border-b border-slate-800/80 box-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-sky-500/25">
            M
          </div>
          <div>
            <div className="font-bold text-white tracking-tight text-[15px] leading-snug">
              MediSphere
            </div>
            <div className="text-[11px] text-sky-400 font-medium tracking-wide">
              {isProvider ? "Clinical Operations" : "Patient Portal"}
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="px-3 pt-5 pb-2">
          <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Platform Hub
          </div>
          <nav className="flex flex-col gap-1">
            {visibleNav.map((item) => {
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 text-left ${
                    active
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      active ? "bg-white/20 text-white" : "bg-sky-500/20 text-sky-300"
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Clinical Intelligence */}
        <div className="px-3 pt-4 pb-2">
          <div className="px-3 pb-2 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Clinical Intelligence
          </div>
          <nav className="flex flex-col gap-1">
            {INTELLIGENCE_ITEMS.map((item) => {
              const active = current === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onSelect(item.key)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 text-left ${
                    active
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-600/30 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[15px]">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      active
                        ? "bg-white/20 border-white/30 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400"
                    }`}
                  >
                    {item.tag}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-4 m-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-400 flex flex-col gap-1.5">
        <div className="font-semibold text-slate-200 flex items-center justify-between text-[11.5px]">
          <span>Data Engine Active</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="text-[10.5px] text-slate-400 leading-tight">
          HL7 FHIR R4 · Kafka · MongoDB Atlas
        </div>
        <div className="pt-1 text-[11px] font-medium text-sky-400">
          User: {isProvider ? "Dr. Clinician (Provider)" : "Sarah Miller (Patient)"}
        </div>
      </div>
    </aside>
  );
}
