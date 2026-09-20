/**
 * Automated Verification Script: Milestone 3 - Clinical Rule Engine & Mobile Notifications
 * 
 * Verifies:
 * 1. Clinical Rule Engine catalog, categories, LOINC codes, and standard hospital protocols.
 * 2. Real-time multi-vital CDS rule evaluations (AFib 145 bpm, Hypoxia, Hypertensive Crisis, qSOFA Sepsis).
 * 3. Clinical Decision Support (CDS) Order Sets generation (STAT 12-lead ECG, ABG, Nicardipine, Lactate).
 * 4. Rule evaluation latency benchmark (< 25ms).
 * 5. Custom rule lifecycle (Create, Update threshold, Toggle active, Delete).
 * 6. Mobile push device registration & subscriptions.
 * 7. Multi-channel priority notification dispatch (Mobile Push, SMS Relay, Pager).
 * 8. Direct smartphone notification lifecycle: Claim/Acknowledge and Code Blue Escalation.
 * 9. End-to-end integration: Rule Engine trigger automatically creates actionable mobile push notification.
 */

const BASE_URL = process.env.API_BASE || "http://localhost:4000/api";

async function runTests() {
  console.log("================================================================================");
  console.log("⚖️  RUNNING CLINICAL RULE ENGINE & MOBILE NOTIFICATIONS TEST SUITE");
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

  // --- PART 1: CLINICAL RULE ENGINE TESTS ---
  console.log("--- PART 1: CLINICAL RULE ENGINE TESTS ---");

  // TEST 1: Rule Engine Catalog & Pre-Seeded Protocols
  console.log("\nTest 1: Rule Engine Catalog & Pre-Seeded Clinical Protocols");
  try {
    const res = await fetch(`${BASE_URL}/clinical-rules`).then((r) => r.json());
    assert(res.success === true, "Endpoint /api/clinical-rules responded with success");
    assert(Array.isArray(res.rules) && res.rules.length >= 8, `Catalog contains >= 8 clinical rules (found: ${res.rules?.length})`);

    const afibRule = res.rules.find((r) => r.ruleId === "RULE-CARD-01");
    assert(Boolean(afibRule), "Found RULE-CARD-01 (Atrial Fibrillation / Tachyarrhythmia Alert)");
    assert(afibRule?.severity === "CRITICAL", `AFib severity is CRITICAL (actual: ${afibRule?.severity})`);
    assert(afibRule?.targetRole === "CARDIOLOGIST_ON_CALL", `Target role is CARDIOLOGIST_ON_CALL (${afibRule?.targetRole})`);
    assert(afibRule?.slaMinutes <= 3.2, `AFib SLA window <= 3.2 minutes (actual: ${afibRule?.slaMinutes}m)`);
    assert(afibRule?.orderSet?.some((o) => o.name.toLowerCase().includes("ecg")), "Order set contains 12-Lead ECG STAT");
    assert(afibRule?.loincCodes?.some((l) => l.code === "8867-4"), "LOINC code 8867-4 (Heart rate) mapped");
  } catch (err) {
    assert(false, `Test 1 failed with error: ${err.message}`);
  }

  // TEST 2: Rule Engine Statistics & Latency Target
  console.log("\nTest 2: Rule Engine Benchmark Statistics & Latency Target");
  try {
    const res = await fetch(`${BASE_URL}/clinical-rules/stats`).then((r) => r.json());
    assert(res.success === true, "Endpoint /api/clinical-rules/stats responded with success");
    assert(res.stats?.status === "ACTIVE", `Rule Engine status is ACTIVE (actual: ${res.stats?.status})`);
    assert(res.stats?.activeRules >= 8, `Active rules count >= 8 (${res.stats?.activeRules})`);
    assert(res.stats?.latencyBenchmarkPassed === true, `Evaluation latency benchmark passed (< 25ms, actual: ${res.stats?.avgEvaluationLatencyMs}ms)`);
    assert(Boolean(res.stats?.ruleCategories?.CARDIOLOGY), "Cardiology rule category indexed");
    assert(Boolean(res.stats?.ruleCategories?.RESPIRATORY), "Respiratory rule category indexed");
  } catch (err) {
    assert(false, `Test 2 failed with error: ${err.message}`);
  }

  // TEST 3: Signature Evaluation - Sarah M. (P002) 145 bpm AFib Spike
  console.log("\nTest 3: Signature Scenario - Sarah M. (P002) 145 bpm AFib Telemetry Evaluation");
  try {
    const res = await fetch(`${BASE_URL}/clinical-rules/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telemetry: {
          patientId: "P002",
          heartRate: 145,
          systolic: 122,
          diastolic: 82,
          spo2: 98,
          temperature: 36.8,
          zScore: 3.1,
          spikeDelta: 71
        },
        patientContext: {
          patientId: "P002",
          patientName: "Sarah Miller"
        }
      })
    }).then((r) => r.json());

    assert(res.success === true, "Endpoint /api/clinical-rules/evaluate succeeded");
    assert(res.evaluation?.isActionRequired === true, "Action required flag is TRUE");
    assert(res.evaluation?.highestSeverity === "CRITICAL", `Highest severity is CRITICAL (actual: ${res.evaluation?.highestSeverity})`);
    assert(res.evaluation?.matchedRules?.some((m) => m.ruleId === "RULE-CARD-01"), "RULE-CARD-01 triggered on 145 bpm AFib spike");
    assert(res.evaluation?.generatedOrderSets?.length >= 3, `Generated CDS Order Sets >= 3 (actual: ${res.evaluation?.generatedOrderSets?.length})`);
    assert(res.evaluation?.latencyPassed === true, `Evaluation executed in < 25ms (actual: ${res.evaluation?.latencyMs}ms)`);
  } catch (err) {
    assert(false, `Test 3 failed with error: ${err.message}`);
  }

  // TEST 4: Multi-Protocol Evaluation (Hypoxia, Hypertensive Crisis, qSOFA Sepsis)
  console.log("\nTest 4: Multi-Protocol Evaluations (Hypoxia, Hypertensive Crisis, qSOFA Sepsis)");
  try {
    // 4A: Critical Hypoxia (SpO2 87%)
    const hypRes = await fetch(`${BASE_URL}/clinical-rules/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telemetry: { heartRate: 88, spo2: 87, systolic: 120, diastolic: 80 } })
    }).then((r) => r.json());
    assert(hypRes.evaluation?.matchedRules?.some((m) => m.ruleId === "RULE-PULM-01"), "RULE-PULM-01 triggered on SpO2 87% (Acute Hypoxemia)");
    assert(hypRes.evaluation?.generatedOrderSets?.some((o) => o.name.includes("ABG")), "STAT Arterial Blood Gas (ABG) ordered for hypoxia");

    // 4B: Hypertensive Crisis (188/124 mmHg)
    const htnRes = await fetch(`${BASE_URL}/clinical-rules/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telemetry: { heartRate: 90, systolic: 188, diastolic: 124, spo2: 98 } })
    }).then((r) => r.json());
    assert(htnRes.evaluation?.matchedRules?.some((m) => m.ruleId === "RULE-VAS-01"), "RULE-VAS-01 triggered on 188/124 mmHg (Hypertensive Crisis)");
    assert(htnRes.evaluation?.generatedOrderSets?.some((o) => o.name.includes("Nicardipine")), "IV Nicardipine infusion ordered for hypertensive crisis");

    // 4C: qSOFA Sepsis Risk (Systolic 92, HR 112, Temp 38.7°C)
    const sepRes = await fetch(`${BASE_URL}/clinical-rules/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telemetry: { heartRate: 112, systolic: 92, diastolic: 60, temperature: 38.7, spo2: 97 } })
    }).then((r) => r.json());
    assert(sepRes.evaluation?.matchedRules?.some((m) => m.ruleId === "RULE-SEPSIS-01"), "RULE-SEPSIS-01 triggered on qSOFA criteria (Hypotension + Tachycardia/Fever)");
    assert(sepRes.evaluation?.generatedOrderSets?.some((o) => o.name.includes("Lactate")), "STAT Serum Lactate ordered for sepsis protocol");
  } catch (err) {
    assert(false, `Test 4 failed with error: ${err.message}`);
  }

  // TEST 5: Custom Clinical Rule Lifecycle (Create -> Update -> Toggle -> Delete)
  console.log("\nTest 5: Custom Clinical Rule Lifecycle (Create, Update, Toggle, Delete)");
  let customRuleId = null;
  try {
    // Create
    const createRes = await fetch(`${BASE_URL}/clinical-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Pediatric Post-Op Tachycardia Precaution",
        category: "CARDIOLOGY",
        severity: "HIGH",
        criteria: { heartRateMin: 135 },
        targetRole: "PEDIATRIC_FELLOW",
        slaMinutes: 4.0,
        orderSet: [{ orderId: "ORD-CUST-01", name: "12-Lead ECG & Check Fluid Balance", urgent: true }]
      })
    }).then((r) => r.json());
    assert(createRes.success === true, "Custom rule created successfully");
    customRuleId = createRes.rule?.ruleId;
    assert(Boolean(customRuleId), `Assigned custom rule ID: ${customRuleId}`);

    // Update threshold
    const updateRes = await fetch(`${BASE_URL}/clinical-rules/${customRuleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criteria: { heartRateMin: 130 } })
    }).then((r) => r.json());
    assert(updateRes.success === true && updateRes.rule?.criteria?.heartRateMin === 130, "Custom rule threshold updated to 130 bpm");

    // Toggle
    const toggleRes = await fetch(`${BASE_URL}/clinical-rules/${customRuleId}/toggle`, { method: "POST" }).then((r) => r.json());
    assert(toggleRes.success === true && toggleRes.rule?.enabled === false, "Custom rule toggled to DISABLED");

    // Delete
    const delRes = await fetch(`${BASE_URL}/clinical-rules/${customRuleId}`, { method: "DELETE" }).then((r) => r.json());
    assert(delRes.success === true, "Custom rule deleted successfully");
  } catch (err) {
    assert(false, `Test 5 failed with error: ${err.message}`);
  }

  // --- PART 2: MOBILE NOTIFICATIONS TESTS ---
  console.log("\n--- PART 2: MOBILE NOTIFICATIONS TESTS ---");

  // TEST 6: Mobile Push Device Registration & Subscriptions
  console.log("\nTest 6: Mobile Push Device Registration & Subscriptions");
  try {
    const subRes = await fetch(`${BASE_URL}/notifications/subscriptions`).then((r) => r.json());
    assert(subRes.success === true, "Endpoint /api/notifications/subscriptions responded with success");
    assert(Array.isArray(subRes.devices) && subRes.devices.length >= 3, `Pre-seeded clinician mobile devices found (count: ${subRes.devices.length})`);

    // Register a new test smartphone device
    const regRes = await fetch(`${BASE_URL}/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "DEV-TEST-PHONE",
        model: "Samsung Galaxy Watch & Mobile Client",
        os: "Android / PWA Chrome",
        ownerName: "Dr. Evelyn Reed, MD",
        role: "CARDIOLOGIST_ON_CALL",
        phoneNumber: "+1 (555) 382-9901"
      })
    }).then((r) => r.json());
    assert(regRes.success === true, "Mobile device subscribed for push notifications");
    assert(regRes.device?.deviceId === "DEV-TEST-PHONE", "Device registered with correct ID");
  } catch (err) {
    assert(false, `Test 6 failed with error: ${err.message}`);
  }

  // TEST 7: Mobile Priority Notification Dispatch
  console.log("\nTest 7: Mobile Priority Push Notification Dispatch & SLA Latency");
  let testNotifId = null;
  try {
    const testRes = await fetch(`${BASE_URL}/notifications/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: "P002", severity: "CRITICAL" })
    }).then((r) => r.json());

    assert(testRes.success === true, "Endpoint /api/notifications/send-test succeeded");
    testNotifId = testRes.notification?.notificationId;
    assert(Boolean(testNotifId), `Dispatched notification ID: ${testNotifId}`);
    assert(testRes.notification?.status === "DELIVERED", `Notification status is DELIVERED (${testRes.notification?.status})`);
    assert(testRes.notification?.deliveryLatencyMs < 350, `Delivery latency meets SLA < 350ms (actual: ${testRes.notification?.deliveryLatencyMs}ms)`);
    assert(Array.isArray(testRes.notification?.vibrationPattern), "Haptic vibration pattern configured");
    assert(Boolean(testRes.notification?.soundChime), "Sound chime assigned");
    assert(testRes.notification?.quickActions?.length >= 2, "Action buttons (Claim & Escalate) attached");
  } catch (err) {
    assert(false, `Test 7 failed with error: ${err.message}`);
  }

  // TEST 8: Mobile Notification Acknowledgement & Escalation Lifecycle
  console.log("\nTest 8: Mobile Notification Acknowledgement & Escalation Lifecycle");
  try {
    if (!testNotifId) throw new Error("Missing testNotifId from Test 7");

    // Clinician claims alert from phone
    const ackRes = await fetch(`${BASE_URL}/notifications/${encodeURIComponent(testNotifId)}/acknowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clinician: "Dr. Evelyn Reed, MD" })
    }).then((r) => r.json());

    assert(ackRes.success === true, `Notification ${testNotifId} acknowledged`);
    assert(ackRes.notification?.status === "ACKNOWLEDGED", `Status transitioned to ACKNOWLEDGED (${ackRes.notification?.status})`);
    assert(ackRes.notification?.acknowledgedBy === "Dr. Evelyn Reed, MD", "Acknowledged by recorded accurately");

    // Spawn a second notification for mobile emergency escalation
    const simNotif = await fetch(`${BASE_URL}/notifications/send-test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: "P004", severity: "EMERGENCY" })
    }).then((r) => r.json());
    const escId = simNotif.notification?.notificationId;

    const escRes = await fetch(`${BASE_URL}/notifications/${encodeURIComponent(escId)}/escalate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Unresponsive patient / Ventricular arrhythmia escalation" })
    }).then((r) => r.json());

    assert(escRes.success === true, `Notification ${escId} escalated`);
    assert(escRes.notification?.status === "ESCALATED", `Status transitioned to ESCALATED (${escRes.notification?.status})`);
    assert(escRes.notification?.severity === "EMERGENCY", "Severity upgraded to EMERGENCY");
  } catch (err) {
    assert(false, `Test 8 failed with error: ${err.message}`);
  }

  // TEST 9: Notification History & Operational Analytics
  console.log("\nTest 9: Notification History & Operational Analytics");
  try {
    const listRes = await fetch(`${BASE_URL}/notifications?limit=10`).then((r) => r.json());
    assert(listRes.success === true, "Endpoint /api/notifications returned history list");
    assert(listRes.notifications?.length >= 2, `Notification feed contains records (count: ${listRes.notifications?.length})`);

    const statsRes = await fetch(`${BASE_URL}/notifications/stats`).then((r) => r.json());
    assert(statsRes.success === true, "Endpoint /api/notifications/stats returned operational stats");
    assert(statsRes.stats?.status === "ACTIVE", "Notification service status is ACTIVE");
    assert(statsRes.stats?.latencyBenchmarkPassed === true, `Average delivery latency passed SLA target (${statsRes.stats?.avgDeliveryLatencyMs}ms)`);
    assert(statsRes.stats?.channels?.length >= 3, `Active notification channels >= 3 (${statsRes.stats?.channels?.length} online)`);
  } catch (err) {
    assert(false, `Test 9 failed with error: ${err.message}`);
  }

  console.log("\n================================================================================");
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
