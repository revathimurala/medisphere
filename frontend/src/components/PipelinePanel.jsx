import { useState, useRef, Fragment } from "react";
import { api, getToken } from "../api";

const STAGES = [
  { key: "collect", label: "Collect", detail: "Wearables, labs & records" },
  { key: "fhir", label: "FHIR R4", detail: "Standardized FHIR resources" },
  { key: "kafka", label: "Kafka", detail: "Published as streaming events" },
  { key: "mongo", label: "MongoDB", detail: "Consumer persists resources" },
  { key: "twin", label: "Digital Twin", detail: "Rebuilt from stored data" },
];

export default function PipelinePanel({ onComplete }) {
  const [busy, setBusy] = useState(false);
  const [activeStage, setActiveStage] = useState(-1);
  const [message, setMessage] = useState(
    "Load complete clinical data directly from Excel (bundled demo workbook or your own .xlsx file)."
  );
  const [lastResult, setLastResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const simulateStages = () => {
    setActiveStage(0);
    const t1 = setTimeout(() => setActiveStage(1), 300);
    const t2 = setTimeout(() => setActiveStage(2), 600);
    const t3 = setTimeout(() => setActiveStage(3), 900);
    const t4 = setTimeout(() => setActiveStage(4), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  };

  const handleRunBundled = async () => {
    setBusy(true);
    setUploadError(null);
    setMessage("Reading bundled Excel workbook → FHIR R4 API → Kafka → MongoDB…");
    const cleanup = simulateStages();
    try {
      const result = await api.runExcelPipeline();
      setActiveStage(-1);
      setLastResult(result);
      setMessage(
        `Pipeline complete! Ingested ${result.patients || 0} patients, ${result.wearables || 0} wearable readings, ${result.laboratoryReports || 0} labs, ${result.conditions || 0} conditions, and ${result.medications || 0} medications (${result.queued || 0} FHIR events queued).`
      );
      onComplete?.();
    } catch (e) {
      setActiveStage(-1);
      const errMsg = e.response?.data?.message || "Pipeline failed — check the backend and database.";
      setUploadError(errMsg);
      setMessage(errMsg);
    } finally {
      cleanup();
      setBusy(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setUploadError(null);
    setMessage(`Uploading & parsing ${file.name} → FHIR R4 → Kafka → MongoDB…`);
    const cleanup = simulateStages();

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const fileBase64 = reader.result;
          const result = await api.uploadExcelFile(fileBase64, file.name);
          setActiveStage(-1);
          setLastResult(result);
          setMessage(
            `Successfully processed "${file.name}"! Loaded ${result.patients || 0} patients, ${result.wearables || 0} wearable readings, ${result.laboratoryReports || 0} labs, and ${result.conditions || 0} conditions into the Digital Twin.`
          );
          onComplete?.();
        } catch (err) {
          setActiveStage(-1);
          const errMsg = err.response?.data?.message || `Failed to process ${file.name}`;
          setUploadError(errMsg);
          setMessage(errMsg);
        } finally {
          cleanup();
          setBusy(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      reader.onerror = () => {
        setActiveStage(-1);
        setUploadError("Could not read the uploaded file.");
        setBusy(false);
        cleanup();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setActiveStage(-1);
      setUploadError(err.message || "Upload failed");
      setBusy(false);
      cleanup();
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(api.getTemplateUrl(), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "medisphere_milestone1_template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setMessage("Could not download template: " + e.message);
    }
  };

  return (
    <section className="panel pipeline-panel">
      <div className="panel__head">
        <div>
          <h3>Data Ingestion Pipeline (Excel Source)</h3>
          <p>Read Excel → Local FHIR R4 API → Apache Kafka → MongoDB → Digital Health Twin</p>
        </div>
        <div className="pipeline-panel__actions">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            style={{ display: "none" }}
          />
          <button
            className="btn btn--secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            title="Upload your own custom Excel workbook (.xlsx)"
          >
            Upload Excel (.xlsx)
          </button>
          <button
            className="btn btn--primary"
            onClick={handleRunBundled}
            disabled={busy}
            title="Load the rich demo Excel dataset bundled with the project"
          >
            {busy ? "Ingesting data…" : "Load Bundled Excel"}
          </button>
        </div>
      </div>

      <div className="pipeline-flow">
        {STAGES.map((s, i) => (
          <Fragment key={s.key}>
            <div
              className={`pipeline-flow__stage ${
                activeStage === i ? "is-running" : activeStage > i ? "is-complete" : ""
              }`}
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              <strong>{s.label}</strong>
              <small>{s.detail}</small>
            </div>
            {i < STAGES.length - 1 && <span className="pipeline-flow__arrow">→</span>}
          </Fragment>
        ))}
      </div>

      {lastResult && (
        <div className="pipeline-results">
          <div className="pipeline-results__item">
            <span className="pipeline-results__val">{lastResult.patients ?? 0}</span>
            <span className="pipeline-results__lbl">Patients</span>
          </div>
          <div className="pipeline-results__item">
            <span className="pipeline-results__val">{lastResult.wearables ?? 0}</span>
            <span className="pipeline-results__lbl">Wearable Vitals</span>
          </div>
          <div className="pipeline-results__item">
            <span className="pipeline-results__val">{lastResult.laboratoryReports ?? 0}</span>
            <span className="pipeline-results__lbl">Lab Observations</span>
          </div>
          <div className="pipeline-results__item">
            <span className="pipeline-results__val">{lastResult.conditions ?? 0}</span>
            <span className="pipeline-results__lbl">Conditions</span>
          </div>
          <div className="pipeline-results__item">
            <span className="pipeline-results__val">{lastResult.medications ?? 0}</span>
            <span className="pipeline-results__lbl">Medications</span>
          </div>
          <div className="pipeline-results__item pipeline-results__item--total">
            <span className="pipeline-results__val">{lastResult.queued ?? 0}</span>
            <span className="pipeline-results__lbl">Total FHIR Events</span>
          </div>
        </div>
      )}

      <div className="pipeline-panel__footer">
        <div className={`pipeline-panel__message ${uploadError ? "is-error" : lastResult ? "is-success" : ""}`}>
          {message}
        </div>
        <button
          type="button"
          className="btn-link"
          onClick={handleDownloadTemplate}
          title="Download the multi-sheet Excel template containing Patients, Vitals, Labs, Conditions, and Medications"
        >
          Download Excel Template (.xlsx)
        </button>
      </div>
    </section>
  );
}
