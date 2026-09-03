import { useState, Fragment } from "react";
import { api } from "../api";

const STAGES = [
  { key: "collect", label: "Collect", detail: "Wearables + labs" },
  { key: "fhir", label: "FHIR R4", detail: "Converted to Observations" },
  { key: "kafka", label: "Kafka", detail: "Published as events" },
  { key: "mongo", label: "MongoDB", detail: "Consumer persists resources" },
  { key: "twin", label: "Digital Twin", detail: "Rebuilt from stored data" },
];

export default function PipelinePanel({ onComplete }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Runs the exact Milestone 1 flow documented in the README against the bundled demo workbook."
  );
  const [lastResult, setLastResult] = useState(null);

  const run = async () => {
    setBusy(true);
    setMessage("Collecting demo workbook rows → FHIR R4 → Kafka → MongoDB…");
    try {
      const result = await api.runExcelPipeline();
      setLastResult(result);
      setMessage(
        `Pipeline complete — ${result.wearables} wearable readings and ${result.laboratoryReports} lab results queued (${result.queued} FHIR resources total).`
      );
      onComplete?.();
    } catch (e) {
      setMessage(e.response?.data?.message || "Pipeline failed — check the backend, MongoDB, and Kafka are running.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel pipeline-panel">
      <div className="panel__head">
        <div>
          <h3>Data ingestion pipeline</h3>
          <p>Collect → FHIR R4 → Kafka → MongoDB → Digital Health Twin</p>
        </div>
        <button className="btn btn--primary" onClick={run} disabled={busy}>
          {busy ? "Running…" : "Run data pipeline"}
        </button>
      </div>

      <div className="pipeline-flow">
        {STAGES.map((s, i) => (
          <Fragment key={s.key}>
            <div className="pipeline-flow__stage">
              <b>{String(i + 1).padStart(2, "0")}</b>
              <strong>{s.label}</strong>
              <small>{s.detail}</small>
            </div>
            {i < STAGES.length - 1 && <span>→</span>}
          </Fragment>
        ))}
      </div>

      <div className="pipeline-panel__message">{message}</div>
    </section>
  );
}
