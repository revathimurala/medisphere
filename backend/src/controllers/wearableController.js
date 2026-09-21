import jwt from "jsonwebtoken";
import wearableService from "../services/wearableIntegrationService.js";
import anomalyService from "../services/anomalyDetectionService.js";
import audit from "../services/auditService.js";
import { publishFhirToKafka } from "../services/twinService.js";
import { isKafkaReady, producer } from "../config/kafka.js";

function getBearerToken(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export function getPatientDevices(req, res) {
  const token = getBearerToken(req);
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || "change-me-in-production");
    } catch {}
  }
  const patientId = req.params.patientId || req.query.patientId || "P002";
  if (user && user.role === "patient" && user.sub !== patientId) {
    return res.status(403).json({ message: "RBAC denied: patient access restricted to self" });
  }
  const devices = wearableService.getPatientDevices(patientId);
  res.json({ patientId, devices });
}

export async function pairDevice(req, res) {
  try {
    const device = wearableService.pairDevice(req.body);
    await audit(req.user?.sub || "system", req.user?.role || "provider", "WEARABLE_DEVICE_PAIRED", device.patientId, "SUCCESS", {
      deviceId: device.deviceId,
      model: device.deviceModel
    });
    res.status(201).json({ success: true, device });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function streamTelemetry(req, res) {
  const token = getBearerToken(req);
  let actor = "WEARABLE_DEVICE";
  let role = "device";
  if (token) {
    try {
      const u = jwt.verify(token, process.env.JWT_SECRET || "change-me-in-production");
      actor = u.sub;
      role = u.role;
    } catch {}
  }

  const validation = wearableService.validateTelemetryPayload(req.body);
  if (!validation.isValid) {
    return res.status(422).json({
      success: false,
      message: "Physiological vitals range validation failed",
      errors: validation.errors
    });
  }

  const { data } = validation;
  const fhirObservation = wearableService.buildFhirObservation(data);
  wearableService.recordTelemetryBuffer(data.patientId, data);

  // Send to Kafka / FHIR persistence
  await publishFhirToKafka(fhirObservation, "WEARABLE_STREAM", actor, true);

  // Process real-time Kafka Streams Anomaly Detection
  const anomalyEvaluation = anomalyService.processTelemetryEvent(data);
  if (anomalyEvaluation.isAnomaly && anomalyEvaluation.anomalyRecord) {
    try {
      if (isKafkaReady()) {
        await producer.send({
          topic: "vital-anomalies",
          messages: [{
            key: data.patientId,
            value: JSON.stringify(anomalyEvaluation.anomalyRecord)
          }]
        });
      }
    } catch (kErr) {
      console.warn("Kafka vital-anomalies dispatch notice:", kErr.message);
    }
  }

  await audit(actor, role, "WEARABLE_TELEMETRY_INGESTED", data.patientId, "SUCCESS", {
    hr: data.heartRate,
    spo2: data.spo2,
    bp: `${data.systolic || "--"}/${data.diastolic || "--"}`,
    deviceId: data.deviceId,
    sqi: data.signalQuality,
    isAnomaly: anomalyEvaluation.isAnomaly,
    anomalyType: anomalyEvaluation.classification?.type
  });

  res.status(201).json({
    success: true,
    message: "Wearable telemetry ingested, evaluated for stream anomalies, and routed to Kafka stream",
    pipeline: [
      "WEARABLE_SENSOR_TELEMETRY",
      "PHYSIOLOGICAL_RANGE_VALIDATION (PASSED)",
      "KAFKA_STREAM_INGESTION (wearable-vitals)",
      "SLIDING_WINDOW_PROCESSOR (20-sample window)",
      `ANOMALY_DETECTOR (${anomalyEvaluation.isAnomaly ? "ANOMALY_DETECTED: " + anomalyEvaluation.classification.type : "NORMAL_SINUS"})`,
      ...(anomalyEvaluation.isAnomaly ? ["KAFKA_ANOMALIES_TOPIC (vital-anomalies)", "CARDIOLOGIST_SLA_DISPATCH (<= 3.2 min)"] : []),
      "FHIR_R4_OBSERVATION_MAPPING",
      "DIGITAL_HEALTH_TWIN_SYNC"
    ],
    telemetry: data,
    anomaly: anomalyEvaluation,
    fhirObservation
  });
}

export function getTelemetry(req, res) {
  const token = getBearerToken(req);
  let user = null;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || "change-me-in-production");
    } catch {}
  }
  const patientId = req.params.patientId || req.query.patientId || "P002";
  if (user && user.role === "patient" && user.sub !== patientId) {
    return res.status(403).json({ message: "RBAC denied: patient access restricted to self" });
  }
  const history = wearableService.getTelemetryHistory(patientId);
  res.json({ patientId, history });
}

export async function simulateTelemetry(req, res) {
  const token = getBearerToken(req);
  let actor = "CLINICAL_SIMULATOR";
  let role = "provider";
  if (token) {
    try {
      const u = jwt.verify(token, process.env.JWT_SECRET || "change-me-in-production");
      actor = u.sub;
      role = u.role;
    } catch {}
  }

  const { patientId = "P002", scenario = "normal" } = req.body || {};
  const simulated = wearableService.generateSimulatedTelemetry(patientId, scenario);
  
  const validation = wearableService.validateTelemetryPayload(simulated);
  const fhirObservation = wearableService.buildFhirObservation(validation.data);
  wearableService.recordTelemetryBuffer(patientId, validation.data);

  await publishFhirToKafka(fhirObservation, "WEARABLE_SIMULATOR", actor, true);

  // Run Kafka Streams Anomaly Detection on simulated stream
  const anomalyEvaluation = anomalyService.processTelemetryEvent(validation.data);
  if (anomalyEvaluation.isAnomaly && anomalyEvaluation.anomalyRecord) {
    try {
      if (isKafkaReady()) {
        await producer.send({
          topic: "vital-anomalies",
          messages: [{
            key: patientId,
            value: JSON.stringify(anomalyEvaluation.anomalyRecord)
          }]
        });
      }
    } catch (kErr) {
      console.warn("Kafka vital-anomalies dispatch notice:", kErr.message);
    }
  }

  await audit(actor, role, "WEARABLE_SIMULATED_TELEMETRY", patientId, "SUCCESS", {
    scenario,
    hr: validation.data.heartRate,
    rhythm: validation.data.rhythmStatus,
    isAnomaly: anomalyEvaluation.isAnomaly,
    anomalyType: anomalyEvaluation.classification?.type
  });

  res.json({
    success: true,
    scenario,
    telemetry: validation.data,
    anomaly: anomalyEvaluation,
    fhirObservation
  });
}

export function getConfig(req, res) {
  res.json(wearableService.getCloudApiConfig());
}

export function updateConfig(req, res) {
  const updated = wearableService.updateCloudApiConfig(req.body);
  res.json({ success: true, config: updated });
}
