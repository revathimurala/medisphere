/**
 * Multi-Patient Automated Verification Suite: Milestone 3 Tasks 1 & 2
 * 
 * Verifies for all 5 patients (P001, P002, P003, P004, P005):
 * 1. Task 1: Wearable Device Registry & Paired Hardware Sensors
 * 2. Task 1: Telemetry Sliding Window History & Ingestion
 * 3. Task 2: Kafka Streams 20-Sample Sliding Window Baseline (μ, σ, Z-Score)
 * 4. Task 2: Multi-Model Arrhythmia Detection on Each Patient:
 *    - Tachycardia / AFib Spike (145 bpm) -> POSSIBLE_AFIB (89% confidence, |Z| > 2.5, SLA <= 3.2m)
 *    - Bradycardia (42 bpm) -> SEVERE_BRADYCARDIA
 *    - Hypoxia (SpO2 86%) -> CRITICAL_HYPOXIA
 *    - Degraded SQI (SQI 45%) -> Alert Fatigue Filter Rejection
 *    - Normal Sinus Rhythm (patient baseline)
 */

const BASE_URL = process.env.API_BASE || "http://localhost:4000/api";

const COHORT = [
  { id: "P001", name: "John Doe", expectedDevice: "DEV-AW-01" },
  { id: "P002", name: "Sarah Miller", expectedDevice: "DEV-BS-02" },
  { id: "P003", name: "David Kumar", expectedDevice: "DEV-FS-03" },
  { id: "P004", name: "Robert Taylor", expectedDevice: "DEV-MB-04" },
  { id: "P005", name: "Elena Rostova", expectedDevice: "DEV-GV-05" }
];

async function runCohortVerification() {
  console.log("================================================================================");
  console.log("🧪 RUNNING MULTI-PATIENT VERIFICATION: MILESTONE 3 TASKS 1 & 2 (ALL PATIENTS)");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  for (const patient of COHORT) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`🏥 TESTING PATIENT: ${patient.name} (${patient.id})`);
    console.log(`--------------------------------------------------------------------------------`);

    // --- TASK 1: WEARABLE INTEGRATION TESTS ---
    console.log(`[Task 1] Wearable Device Registry for ${patient.id}:`);
    try {
      const devRes = await fetch(`${BASE_URL}/wearables/devices/${patient.id}`).then((r) => r.json());
      const devices = devRes.devices || [];
      assert(devices.length > 0, `Found ${devices.length} registered wearable device(s) for ${patient.id}`);
      assert(devices.some((d) => d.deviceId.includes(patient.expectedDevice.split("-")[1])), `Expected device model paired for ${patient.id} (${devices[0]?.deviceModel})`);
    } catch (e) {
      assert(false, `Device fetch failed for ${patient.id}: ${e.message}`);
    }

    console.log(`[Task 1] Continuous Telemetry Stream Buffer for ${patient.id}:`);
    try {
      const tlmRes = await fetch(`${BASE_URL}/wearables/telemetry/${patient.id}`).then((r) => r.json());
      const history = tlmRes.history || [];
      assert(history.length > 0, `Continuous telemetry buffer active with ${history.length} samples for ${patient.id}`);
      assert(typeof history[0]?.heartRate === "number", `Valid physiological telemetry readings present (HR: ${history[history.length - 1]?.heartRate} bpm)`);
    } catch (e) {
      assert(false, `Telemetry fetch failed for ${patient.id}: ${e.message}`);
    }

    // --- TASK 2: KAFKA STREAMS ANOMALY DETECTION TESTS ---
    console.log(`[Task 2] Kafka Streams Sliding Window State (20 Samples) for ${patient.id}:`);
    try {
      const streamRes = await fetch(`${BASE_URL}/anomalies/stream/${patient.id}`).then((r) => r.json());
      assert(streamRes.success === true, `Stream state endpoint responded for ${patient.id}`);
      assert(streamRes.samplesInWindow === 20, `Sliding window contains exactly 20 samples for ${patient.id}`);
      assert(typeof streamRes.rollingMeanHr === "number" && streamRes.rollingMeanHr > 50, `Rolling mean baseline computed (μ = ${streamRes.rollingMeanHr} bpm)`);
      assert(typeof streamRes.rollingStdDevHr === "number", `Standard deviation baseline computed (σ = ${streamRes.rollingStdDevHr} bpm)`);
    } catch (e) {
      assert(false, `Stream state failed for ${patient.id}: ${e.message}`);
    }

    console.log(`[Task 2] Arrhythmia Spike Simulation (145 bpm) on ${patient.id}:`);
    try {
      const spikeRes = await fetch(`${BASE_URL}/wearables/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, scenario: "tachycardia_spike" })
      }).then((r) => r.json());

      assert(spikeRes.success === true, `Spike simulation accepted for ${patient.id}`);
      assert(spikeRes.telemetry?.heartRate === 145, `Heart rate spiked to 145 bpm for ${patient.id}`);
      assert(spikeRes.anomaly?.isAnomaly === true, `Kafka stream processor flagged anomaly for ${patient.id}`);
      assert(spikeRes.anomaly?.classification?.type === "POSSIBLE_AFIB", `Classified as POSSIBLE_AFIB for ${patient.id}`);
      assert(spikeRes.anomaly?.classification?.confidence >= 0.85, `Confidence score >= 85% (actual: ${Math.round(spikeRes.anomaly?.classification?.confidence * 100)}%)`);
      assert(spikeRes.anomaly?.windowMetrics?.zScore > 2.5, `Z-Score divergence |Z| > 2.5 (actual: |Z| = ${spikeRes.anomaly?.windowMetrics?.zScore})`);
      assert(spikeRes.anomaly?.anomalyRecord?.autoNotification?.slaMinutes <= 3.2, `Cardiologist notification SLA <= 3.2 min dispatched`);
    } catch (e) {
      assert(false, `Spike test failed for ${patient.id}: ${e.message}`);
    }

    console.log(`[Task 2] Multi-Model Bradycardia (<45 bpm) on ${patient.id}:`);
    try {
      const bradyRes = await fetch(`${BASE_URL}/wearables/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, scenario: "bradycardia" })
      }).then((r) => r.json());

      assert(bradyRes.anomaly?.isAnomaly === true, `Bradycardia flagged as anomaly for ${patient.id}`);
      assert(bradyRes.anomaly?.classification?.type === "SEVERE_BRADYCARDIA", `Classification is SEVERE_BRADYCARDIA (HR: ${bradyRes.telemetry?.heartRate} bpm)`);
    } catch (e) {
      assert(false, `Bradycardia test failed for ${patient.id}: ${e.message}`);
    }

    console.log(`[Task 2] Multi-Model Hypoxia (SpO2 < 90%) on ${patient.id}:`);
    try {
      const hypoxRes = await fetch(`${BASE_URL}/wearables/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, scenario: "hypoxia" })
      }).then((r) => r.json());

      assert(hypoxRes.anomaly?.isAnomaly === true, `Hypoxia flagged as anomaly for ${patient.id}`);
      assert(hypoxRes.anomaly?.classification?.type === "CRITICAL_HYPOXIA", `Classification is CRITICAL_HYPOXIA (SpO2: ${hypoxRes.telemetry?.spo2}%)`);
    } catch (e) {
      assert(false, `Hypoxia test failed for ${patient.id}: ${e.message}`);
    }

    console.log(`[Task 2] Alert Fatigue Filter (SQI < 60%) on ${patient.id}:`);
    try {
      const sqiRes = await fetch(`${BASE_URL}/wearables/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patient.id, scenario: "degraded_sqi" })
      }).then((r) => r.json());

      assert(sqiRes.anomaly?.isAnomaly === false, `Degraded packet does NOT trigger false alarm for ${patient.id}`);
      assert(sqiRes.anomaly?.filtered === true, `SQI filter successfully intercepted noisy packet for ${patient.id}`);
    } catch (e) {
      assert(false, `SQI test failed for ${patient.id}: ${e.message}`);
    }
  }

  // --- GLOBAL ENGINE KPI VALIDATION ---
  console.log(`\n================================================================================`);
  console.log(`🎯 GLOBAL STREAM ANOMALY ENGINE KPI TARGETS (AFTER COHORT EVALUATION):`);
  console.log(`================================================================================`);
  try {
    const statsRes = await fetch(`${BASE_URL}/anomalies/stats`).then((r) => r.json());
    const engine = statsRes.engine;
    assert(engine.validationTargets.precision.passed === true, `Global Precision: ${engine.validationTargets.precision.current} (Target: ${engine.validationTargets.precision.target}) - PASSED`);
    assert(engine.validationTargets.falseAlertRate.passed === true, `False Alert Rate: ${engine.validationTargets.falseAlertRate.current} (Target: ${engine.validationTargets.falseAlertRate.target}) - PASSED`);
    assert(engine.validationTargets.processingLatency.passed === true, `Processing Latency: ${engine.validationTargets.processingLatency.current} (Target: ${engine.validationTargets.processingLatency.target}) - PASSED`);
    assert(engine.telemetryCounters.artifactsFiltered > 0, `Artifacts Filtered by Alert Fatigue Engine: ${engine.telemetryCounters.artifactsFiltered}`);
  } catch (e) {
    assert(false, `Engine stats fetch failed: ${e.message}`);
  }

  console.log(`\n================================================================================`);
  console.log(`MULTI-PATIENT TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log(`================================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCohortVerification();
