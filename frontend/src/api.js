import axios from "axios";

// In `npm run dev` this goes through the Vite proxy (see vite.config.js),
// which forwards /api to http://localhost:4000. For a production build there
// is no dev proxy, so VITE_API_BASE lets you point at the real backend URL.
const baseURL = import.meta.env.VITE_API_BASE || "/api";

export const http = axios.create({ baseURL });

let token = localStorage.getItem("medisphere_token") || "";

export function setToken(nextToken) {
  token = nextToken || "";
  if (token) localStorage.setItem("medisphere_token", token);
  else localStorage.removeItem("medisphere_token");
}

export function getToken() {
  return token;
}

http.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function unwrap(promise) {
  return promise.then((r) => r.data);
}

export const api = {
  login: (username, role) => unwrap(http.post("/auth/login", { username, role })),
  getPatients: () => unwrap(http.get("/patients")),
  getTwin: (patientId) => unwrap(http.get(`/twins/${patientId}`)),
  getValidation: () => unwrap(http.get("/validation")),
  getAuditLog: () => unwrap(http.get("/audit")),
  syncFromFhir: (patientId) => unwrap(http.post(`/fhir/sync/${encodeURIComponent(patientId)}`, {})),
  runExcelPipeline: () => unwrap(http.post("/demo/collect-excel")),
  uploadExcelFile: (fileBase64, filename) => unwrap(http.post("/demo/upload-excel", { fileBase64, filename })),
  getTemplateUrl: () => `${baseURL}/demo/download-template`,
  getTimeline: (patientId) => unwrap(http.get(`/twins/${encodeURIComponent(patientId)}/timeline`)),
  getFhirBundle: (patientId) => unwrap(http.get(`/twins/${encodeURIComponent(patientId)}/fhir-bundle`)),
  streamVitals: (patientId) => unwrap(http.post("/collect/stream-vitals", { patientId })),
  // Milestone 2: Federated Learning & Risk Models API
  getPredictionStats: () => unwrap(http.get("/predictions/stats")),
  getPrediction: (patientId) => unwrap(http.get(`/predictions/${encodeURIComponent(patientId || "")}`)),
  getFederatedStatus: () => unwrap(http.get("/models/federated/status")),
  trainFederatedRound: () => unwrap(http.post("/models/federated/train-round", {})),
  getModelRegistry: () => unwrap(http.get("/models/registry")),
  getMilestone2Validation: () => unwrap(http.get("/validation/milestone2")),
  // Milestone 3: Wearable Device Integration & Continuous Telemetry
  getWearableDevices: (patientId) => unwrap(http.get(`/wearables/devices/${encodeURIComponent(patientId || "")}`)),
  pairWearableDevice: (deviceData) => unwrap(http.post("/wearables/pair", deviceData)),
  sendWearableTelemetry: (telemetry) => unwrap(http.post("/wearables/stream", telemetry)),
  getWearableTelemetry: (patientId) => unwrap(http.get(`/wearables/telemetry/${encodeURIComponent(patientId || "")}`)),
  simulateWearableTelemetry: (patientId, scenario) => unwrap(http.post("/wearables/simulate", { patientId, scenario })),
  getWearableConfig: () => unwrap(http.get("/wearables/config")),
  saveWearableConfig: (config) => unwrap(http.post("/wearables/config", config)),
  // Milestone 3 Task 2: Kafka Streams Anomaly Detection
  getAnomalyStream: (patientId) => unwrap(http.get(`/anomalies/stream/${encodeURIComponent(patientId || "")}`)),
  getAnomalyStats: () => unwrap(http.get("/anomalies/stats")),
  evaluateAnomaly: (payload) => unwrap(http.post("/anomalies/evaluate", payload)),
  // Milestone 3 Task 3: Real-Time Alert Engine & Cardiologist Clinical Escalation
  getAlerts: (params) => unwrap(http.get("/alerts", { params })),
  getActiveAlerts: (patientId) => unwrap(http.get("/alerts/active", { params: { patientId } })),
  getAlertStats: () => unwrap(http.get("/alerts/stats")),
  acknowledgeAlert: (alertId, clinician) => unwrap(http.post(`/alerts/${encodeURIComponent(alertId)}/acknowledge`, { clinician })),
  resolveAlert: (alertId, resolutionNotes, clinician) => unwrap(http.post(`/alerts/${encodeURIComponent(alertId)}/resolve`, { resolutionNotes, clinician })),
  escalateAlert: (alertId, reason) => unwrap(http.post(`/alerts/${encodeURIComponent(alertId)}/escalate`, { reason })),
  simulateAlert: (patientId, scenario) => unwrap(http.post("/alerts/simulate", { patientId, scenario })),
  // Clinical Decision Support (CDS) Rule Engine
  getClinicalRules: (params) => unwrap(http.get("/clinical-rules", { params })),
  getClinicalRuleStats: () => unwrap(http.get("/clinical-rules/stats")),
  getClinicalRuleAuditLog: (limit) => unwrap(http.get("/clinical-rules/audit-log", { params: { limit } })),
  createClinicalRule: (ruleData) => unwrap(http.post("/clinical-rules", ruleData)),
  updateClinicalRule: (ruleId, updates) => unwrap(http.put(`/clinical-rules/${encodeURIComponent(ruleId)}`, updates)),
  deleteClinicalRule: (ruleId) => unwrap(http.delete(`/clinical-rules/${encodeURIComponent(ruleId)}`)),
  toggleClinicalRule: (ruleId) => unwrap(http.post(`/clinical-rules/${encodeURIComponent(ruleId)}/toggle`, {})),
  evaluateClinicalRules: (payload) => unwrap(http.post("/clinical-rules/evaluate", payload)),
  resetClinicalRulesDefaults: () => unwrap(http.post("/clinical-rules/reset-defaults", {})),
  // Mobile Push & Emergency Notifications
  getMobileNotifications: (params) => unwrap(http.get("/notifications", { params })),
  getMobileNotificationStats: () => unwrap(http.get("/notifications/stats")),
  getMobileSubscriptions: () => unwrap(http.get("/notifications/subscriptions")),
  subscribeMobileDevice: (deviceData) => unwrap(http.post("/notifications/subscribe", deviceData)),
  sendTestMobileNotification: (payload) => unwrap(http.post("/notifications/send-test", payload)),
  acknowledgeMobileNotification: (id, clinician) => unwrap(http.post(`/notifications/${encodeURIComponent(id)}/acknowledge`, { clinician })),
  escalateMobileNotification: (id, reason) => unwrap(http.post(`/notifications/${encodeURIComponent(id)}/escalate`, { reason })),
  getNetworkInfo: () => unwrap(http.get("/system/network-info")),
};