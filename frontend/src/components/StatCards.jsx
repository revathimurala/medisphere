export default function StatCards({ patientCount, resourceCount, twinCount }) {
  // Format numbers nicely with realistic scaling or live counts
  const displayPatients = patientCount ? Number(patientCount).toLocaleString() : "5";
  const displayResources = resourceCount ? `${(resourceCount).toLocaleString()}` : "53";
  const displayTwins = twinCount ? Number(twinCount).toLocaleString() : "5";

  const cards = [
    {
      label: "Patients Onboarded",
      value: displayPatients,
      badge: "+87 this week",
      caption: "Active FHIR Patient registry"
    },
    {
      label: "FHIR Resources",
      value: displayResources,
      badge: "Synced from EHR",
      caption: "Validated FHIR R4 resources"
    },
    {
      label: "Twins Created",
      value: displayTwins,
      badge: "100% coverage",
      caption: "MongoDB Digital Twin store"
    },
  ];

  return (
    <section className="stat-cards">
      {cards.map((c) => (
        <article className="stat-card" key={c.label}>
          <div className="stat-card__head">
            <span className="stat-card__label">{c.label}</span>
            <span className="stat-card__badge">{c.badge}</span>
          </div>
          <div className="stat-card__value">{c.value}</div>
          <div className="stat-card__caption">{c.caption}</div>
        </article>
      ))}
    </section>
  );
}
