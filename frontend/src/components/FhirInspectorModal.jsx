import { useEffect, useState } from "react";
import { api } from "../api";

export default function FhirInspectorModal({ patientId, patientName, onClose }) {
  const [bundle, setBundle] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    api.getFhirBundle(patientId)
      .then(setBundle)
      .catch(() => setBundle(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  const jsonString = bundle ? JSON.stringify(bundle, null, 2) : "";

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--large" onClick={e => e.stopPropagation()}>
        <div className="modal-card__head">
          <div>
            <h3>HL7 FHIR R4 Resource Inspector</h3>
            <p>Raw FHIR Bundle ({bundle?.total || 0} resources) for {patientName || patientId}</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn--small" onClick={copyToClipboard} disabled={!bundle}>
              {copied ? "✓ Copied!" : "Copy JSON"}
            </button>
            <button className="btn btn--small" onClick={onClose}>✕ Close</button>
          </div>
        </div>

        <div className="fhir-inspector-content">
          {loading && <div className="timeline-empty">Loading FHIR R4 resources…</div>}
          {!loading && !bundle && <div className="timeline-empty">Could not load FHIR bundle.</div>}
          {!loading && bundle && (
            <pre className="fhir-json-view">
              <code>{jsonString}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
