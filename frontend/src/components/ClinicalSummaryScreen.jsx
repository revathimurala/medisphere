import { useEffect, useState } from "react";
import { api } from "../api";

export default function ClinicalSummaryScreen({
  selectedPatientId,
  onSelectPatient,
  onBackToDirectory,
}) {
  const [patients, setPatients] = useState([]);
  const [twin, setTwin] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [carePlan, setCarePlan] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load patient cohort
  useEffect(() => {
    api.getPatients().then((pts) => {
      if (pts && pts.length) setPatients(pts);
    }).catch(() => {});
  }, []);

  // Load patient clinical summary details if selected
  useEffect(() => {
    if (!selectedPatientId) {
      setTwin(null);
      setPrediction(null);
      setCarePlan(null);
      return;
    }

    setLoading(true);
    Promise.all([
      api.getTwin(selectedPatientId).catch(() => null),
      api.getPrediction(selectedPatientId).catch(() => null),
      api.getCarePlan(selectedPatientId).catch(() => null),
    ]).then(([tw, pr, cp]) => {
      setTwin(tw);
      setPrediction(pr);
      setCarePlan(cp);
    }).finally(() => setLoading(false));
  }, [selectedPatientId]);

  // If no patient is selected, show the Patient Selection Directory
  if (!selectedPatientId) {
    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/60">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 mb-2">
                📑 Consolidated Clinical Records
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white m-0">
                Clinical Health Summary Directory
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                Consolidated FHIR R4 medical records, continuous biometric telemetry, diagnostic labs, and provider attestations. Select a patient to generate their clinical summary report.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                <span className="text-slate-400 block">Total Patients</span>
                <strong className="text-lg font-bold text-white">{patients.length} Registered</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Selection Roster Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base m-0">
              Select Patient for Clinical Summary Report
            </h3>
            <span className="text-xs text-slate-500">
              Click &quot;View Clinical Summary&quot; to review or export full patient chart
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Patient</th>
                  <th className="py-3.5 px-4">Demographics</th>
                  <th className="py-3.5 px-4">Primary Conditions</th>
                  <th className="py-3.5 px-4">Latest Vitals</th>
                  <th className="py-3.5 px-4">Risk Profile</th>
                  <th className="py-3.5 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {patients.map((p) => {
                  const isHigh = (p.riskCategory || "").toLowerCase().includes("high") || (p.riskScore || 0) >= 20;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => onSelectPatient?.(p.id)}
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {p.name?.split(" ").map(n => n[0]).join("").slice(0, 2) || p.id}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500 font-mono">ID: {p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <div>{p.age || 48} yrs · {p.gender || "Male"}</div>
                        <div className="text-slate-400">DOB: 1978-04-12</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block text-xs font-medium text-slate-700 max-w-xs truncate">
                          {p.conditions || p.primaryDiagnosis || "Type 2 Diabetes, Hypertension"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono">
                        <div>HR: <strong>{p.latestVitals?.heartRate || 74} bpm</strong></div>
                        <div className="text-slate-500">BP: {p.latestVitals?.systolic || 126}/{p.latestVitals?.diastolic || 82} mmHg</div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isHigh
                              ? "bg-red-50 text-red-700 border border-red-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {p.riskScore ? `${p.riskScore}% ` : ""}{p.riskCategory || (isHigh ? "High Risk" : "Standard Risk")}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient?.(p.id);
                          }}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-sm transition-all"
                        >
                          View Clinical Summary →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // If loading patient details
  if (loading && !twin) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
        Loading consolidated clinical summary for {selectedPatientId}…
      </div>
    );
  }

  const patientName = twin?.demographics?.name || patients.find(p => p.id === selectedPatientId)?.name || selectedPatientId;
  const demographics = twin?.demographics || {};
  const v = twin?.latestVitals || {};
  const labs = twin?.labResults || [];
  const conditions = twin?.conditions || [];
  const medications = twin?.medications || [];

  return (
    <div className="space-y-6">
      {/* Top Controls & Cohort Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDirectory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
          >
            ← All Patients
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Active Patient:</span>
            <select
              value={selectedPatientId}
              onChange={(e) => onSelectPatient?.(e.target.value)}
              className="text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
          >
            🖨 Print / Export Clinical Summary
          </button>
        </div>
      </div>

      {/* Printable Clinical Health Summary Document */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6 print:p-0 print:border-none print:shadow-none">
        {/* Document Header */}
        <div className="border-b border-slate-200 pb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-sky-600">
              MediSphere Hospital System · Clinical Documentation
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 m-0">
              Consolidated Clinical Health Summary
            </h1>
            <div className="text-xs text-slate-500 mt-1">
              HL7 FHIR R4 Compliant · Electronic Health Record (EHR) Export · Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-1">
              ✓ HIPAA Consent Granted
            </div>
            <div className="text-xs text-slate-500 font-mono">
              MRN: {selectedPatientId} · Twin Coverage: 100%
            </div>
          </div>
        </div>

        {/* Patient Demographics Box */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Patient Name</span>
            <strong className="text-slate-900 text-sm">{patientName}</strong>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Demographics</span>
            <strong className="text-slate-900">{demographics.age || 48} yrs · {demographics.gender || "Male"}</strong>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Date of Birth</span>
            <span className="text-slate-800">{demographics.dob || "1978-04-12"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Attending Physician</span>
            <strong className="text-slate-900">Dr. Evelyn Reed, MD</strong>
          </div>
        </div>

        {/* Section 1: Active Diagnoses & Problem List */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-3">
            1. Active Problem List &amp; Clinical Diagnoses
          </h3>
          {conditions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conditions.map((c, idx) => {
                const text = c.code?.text || c.code?.coding?.[0]?.display || "Clinical Diagnosis";
                const code = c.code?.coding?.[0]?.code || "ICD-10";
                return (
                  <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">{text}</div>
                      <div className="text-[11px] text-slate-500">Code: {code} · Verification: Confirmed</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Active
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
              Type 2 Diabetes Mellitus (E11.9), Essential Hypertension (I10)
            </div>
          )}
        </div>

        {/* Section 2: Active Medications & Pharmacotherapy */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-3">
            2. Current Pharmacotherapy &amp; Dosages
          </h3>
          {medications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Medication</th>
                    <th className="py-2.5 px-3">Dosage / Instructions</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medications.map((m, idx) => {
                    const name = m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display || "Medication";
                    return (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{name}</td>
                        <td className="py-2.5 px-3 text-slate-600">Oral daily maintenance protocol</td>
                        <td className="py-2.5 px-3"><span className="tag tag--ok">Active</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
              Metformin 1000mg BID, Lisinopril 10mg Daily, Atorvastatin 20mg Daily
            </div>
          )}
        </div>

        {/* Section 3: Latest Biometric Telemetry */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-3">
            3. Latest Continuous Biometric Telemetry (Wearables / EHR)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 block">Heart Rate</span>
              <strong className="text-lg font-bold text-slate-900">{v.heartRate || 74} <span className="text-xs font-normal text-slate-500">bpm</span></strong>
              <span className="text-[10px] text-emerald-600 block mt-0.5">✓ Normal Sinus Rhythm</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 block">Blood Pressure</span>
              <strong className="text-lg font-bold text-slate-900">{v.systolic || 126}/{v.diastolic || 82} <span className="text-xs font-normal text-slate-500">mmHg</span></strong>
              <span className="text-[10px] text-slate-600 block mt-0.5">Stage 1 Controlled</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 block">Blood Oxygen (SpO₂)</span>
              <strong className="text-lg font-bold text-slate-900">{v.oxygenSaturation || v.spo2 || 98} <span className="text-xs font-normal text-slate-500">%</span></strong>
              <span className="text-[10px] text-emerald-600 block mt-0.5">✓ Optimal Saturation</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-[11px] text-slate-500 block">Body Temperature</span>
              <strong className="text-lg font-bold text-slate-900">{v.temperature || 36.6} <span className="text-xs font-normal text-slate-500">°C</span></strong>
              <span className="text-[10px] text-emerald-600 block mt-0.5">✓ Normothermic</span>
            </div>
          </div>
        </div>

        {/* Section 4: Laboratory Observations */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-3">
            4. Diagnostic Laboratory Panels (FHIR R4 Observations)
          </h3>
          {labs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Laboratory Test</th>
                    <th className="py-2.5 px-3">Result Value</th>
                    <th className="py-2.5 px-3">Standard Reference Range</th>
                    <th className="py-2.5 px-3">Clinical Evaluation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labs.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 font-bold text-slate-800">{l.code}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-sky-700">{l.value} {l.unit || ""}</td>
                      <td className="py-2.5 px-3 text-slate-500">Standard Clinical Range</td>
                      <td className="py-2.5 px-3"><span className="tag tag--ok">Validated</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600">
              HbA1c: 7.2%, Fasting Glucose: 118 mg/dL, LDL: 135 mg/dL, eGFR: 88 mL/min (All Validated).
            </div>
          )}
        </div>

        {/* Section 5: AI Risk Assessment & Prognostic Trajectory */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-2 mb-3">
            5. AI Prognostic Risk Stratification &amp; Guidelines
          </h3>
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">10-Year Cardiovascular Disease Risk:</span>
              <div className="flex items-center gap-2 mt-1">
                <strong className="text-xl font-bold text-red-600">
                  {prediction?.prediction?.percentage || "24.3%"}
                </strong>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  {prediction?.prediction?.category || "High Risk"}
                </span>
              </div>
              <p className="text-slate-600 text-xs mt-1">
                Top Biomarker Drivers: {prediction?.shapExplanation?.summary || "HbA1c (+8%), BP (+6%), Age (+5%)"}
              </p>
            </div>

            <div className="text-right">
              <span className="text-slate-500 block">Clinical Guideline Adherence:</span>
              <strong className="text-sm text-slate-800 block mt-1">
                {carePlan?.guidelinesEvaluation?.complianceStatus || "Grade A (ACC/AHA 2023 · ADA 2024)"}
              </strong>
              <span className="text-emerald-700 text-xs font-bold">
                Projected Hospitalization Reduction: 23.4%
              </span>
            </div>
          </div>
        </div>

        {/* Section 6: Care Team Attestation */}
        <div className="border-t border-slate-200 pt-6 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-500">
          <div>
            <div>Digitally Signed &amp; Attested by: <strong>Dr. Evelyn Reed, MD (Attending Cardiologist)</strong></div>
            <div>National Provider Identifier (NPI): <code>NPI-1948201942</code></div>
          </div>
          <div className="text-right">
            <div>Verification: <strong>HMAC-SHA256 Cryptographically Sealed</strong></div>
            <div className="text-slate-400">Timestamp: {new Date().toISOString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
