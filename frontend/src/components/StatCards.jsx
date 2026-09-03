export default function StatCards({ patientCount, resourceCount, twinCount }) {
  const cards = [
    { label: "Patients Onboarded", value: patientCount, caption: "FHIR-connected registry" },
    { label: "FHIR Resources", value: resourceCount, caption: "Validated through the pipeline" },
    { label: "Digital Twins", value: twinCount, caption: "MongoDB twin records" },
  ];
  return (
    <section className="stat-cards">
      {cards.map((c) => (
        <article className="stat-card" key={c.label}>
          <div className="stat-card__label">{c.label}</div>
          <div className="stat-card__value">{c.value}</div>
          <div className="stat-card__caption">{c.caption}</div>
        </article>
      ))}
    </section>
  );
}
