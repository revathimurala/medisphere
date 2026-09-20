/**
 * Automated Verification Script: Milestone 3 Task 2 - Kafka Streams Anomaly Detection
 * 
 * Verifies:
 * 1. Engine KPI benchmarks (Precision > 85%, False Alert Rate < 3%, Latency < 250ms)
 * 2. Sliding window stream state (20 samples, rolling baseline μ & σ)
 * 3. Sarah M. (P002) signature 145 bpm AFib spike detection at 89% confidence
 * 4. Multi-model evaluation (Bradycardia, Hypoxia, Hypertensive Crisis)
 * 5. Alert fatigue filter (SQI < 60% rejected)
 */

const BASE_URL = process.env.API_BASE || "http://localhost:4000/api";

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 RUNNING MILESTONE 3 TASK 2: KAFKA STREAMS ANOMALY DETECTION TEST SUITE");
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

  // TEST 1: Engine KPI Stats
  console.log("Test 1: Engine Benchmark Statistics & Thresholds");
  try {
    const res = await fetch(`${BASE_URL}/anomalies/stats`).then((r) => r.json());
    assert(res.success === true, "Endpoint /api/anomalies/stats responded with success");
    assert(res.engine?.validationTargets?.precision?.passed === true, `Precision target passed (${res.engine?.validationTargets?.precision?.current} vs target ${res.engine?.validationTargets?.precision?.target})`);
    assert(res.engine?.validationTargets?.falseAlertRate?.passed === true, `False Alert Rate target passed (${res.engine?.validationTargets?.falseAlertRate?.current} vs target ${res.engine?.validationTargets?.falseAlertRate?.target})`);
    assert(res.engine?.validationTargets?.processingLatency?.passed === true, `Processing latency target passed (${res.engine?.validationTargets?.processingLatency?.current} vs target ${res.engine?.validationTargets?.processingLatency?.target})`);
  } catch (err) {
    assert(false, `Test 1 failed with error: ${err.message}`);
  }

  // TEST 2: Sliding Window Stream State for Sarah M. (P002)
  console.log("\nTest 2: Sliding Window Stream State (20 Samples) for P002");
  try {
    const res = await fetch(`${BASE_URL}/anomalies/stream/P002`).then((r) => r.json());
    assert(res.success === true, "Endpoint /api/anomalies/stream/P002 responded with success");
    assert(res.samplesInWindow === 20, `Sliding window contains exactly 20 samples (actual: ${res.samplesInWindow})`);
    assert(typeof res.rollingMeanHr === "number" && res.rollingMeanHr > 60 && res.rollingMeanHr < 90, `Rolling mean HR initialized correctly (${res.rollingMeanHr} bpm)`);
    assert(typeof res.rmssd === "number", `RMSSD HRV calculated (${res.rmssd} ms)`);
  } catch (err) {
    assert(false, `Test 2 failed with error: ${err.message}`);
  }

  // TEST 3: Signature Scenario - Sarah M. HR Spike to 145 bpm
  console.log("\nTest 3: Signature Scenario - Sarah M. (P002) HR Spike to 145 bpm");
  try {
    const res = await fetch(`${BASE_URL}/wearables/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: "P002", scenario: "sarah_afib_spike" })
    }).then((r) => r.json());

    assert(res.success === true, "Simulate wearable telemetry succeeded");
    assert(res.telemetry?.heartRate === 145, `Telemetry heart rate spiked to 145 bpm (actual: ${res.telemetry?.heartRate})`);
    assert(res.anomaly?.isAnomaly === true, "Stream processor flagged the packet as an Anomaly");
    assert(res.anomaly?.classification?.type === "POSSIBLE_AFIB", `Classified as POSSIBLE_AFIB (actual: ${res.anomaly?.classification?.type})`);
    assert(res.anomaly?.classification?.confidence >= 0.85, `Confidence score >= 85% (actual: ${Math.round(res.anomaly?.classification?.confidence * 100)}%)`);
    assert(res.anomaly?.windowMetrics?.zScore > 2.5, `Z-Score divergence |Z| > 2.5 (actual: |Z| = ${res.anomaly?.windowMetrics?.zScore})`);
    assert(res.anomaly?.anomalyRecord?.autoNotification?.slaMinutes <= 3.2, `Cardiologist auto-notification SLA <= 3.2 min (actual: ${res.anomaly?.anomalyRecord?.autoNotification?.slaMinutes} min)`);
  } catch (err) {
    assert(false, `Test 3 failed with error: ${err.message}`);
  }

  // TEST 4: Multi-Model Evaluation - Severe Bradycardia (<45 bpm)
  console.log("\nTest 4: Multi-Model Evaluation - Severe Bradycardia (42 bpm)");
  try {
    const res = await fetch(`${BASE_URL}/anomalies/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: "P002", heartRate: 42, spo2: 98, signalQuality: 98 })
    }).then((r) => r.json());

    assert(res.evaluation?.isAnomaly === true, "Bradycardia detected as anomaly");
    assert(res.evaluation?.classification?.type === "SEVERE_BRADYCARDIA", `Classification type is SEVERE_BRADYCARDIA (actual: ${res.evaluation?.classification?.type})`);
  } catch (err) {
    assert(false, `Test 4 failed with error: ${err.message}`);
  }

  // TEST 5: Multi-Model Evaluation - Critical Hypoxia (SpO2 86%)
  console.log("\nTest 5: Multi-Model Evaluation - Critical Hypoxia (SpO2 86%)");
  try {
    const res = await fetch(`${BASE_URL}/anomalies/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: "P002", heartRate: 85, spo2: 86, signalQuality: 95 })
    }).then((r) => r.json());

    assert(res.evaluation?.isAnomaly === true, "Hypoxia detected as anomaly");
    assert(res.evaluation?.classification?.type === "CRITICAL_HYPOXIA", `Classification type is CRITICAL_HYPOXIA (actual: ${res.evaluation?.classification?.type})`);
  } catch (err) {
    assert(false, `Test 5 failed with error: ${err.message}`);
  }

  // TEST 6: Alert Fatigue Prevention - Signal Quality Degradation (SQI < 60%)
  console.log("\nTest 6: Alert Fatigue Prevention - Signal Quality Filter (SQI < 60%)");
  try {
    const res = await fetch(`${BASE_URL}/anomalies/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: "P002", heartRate: 155, spo2: 95, signalQuality: 45 })
    }).then((r) => r.json());

    assert(res.evaluation?.isAnomaly === false, "Degraded signal does NOT trigger clinical false alarm");
    assert(res.evaluation?.filtered === true, "Alert fatigue filter applied");
    assert(res.evaluation?.reason?.includes("Alert fatigue filter"), `Filter reason logged: ${res.evaluation?.reason}`);
  } catch (err) {
    assert(false, `Test 6 failed with error: ${err.message}`);
  }

  console.log("\n================================================================================");
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
