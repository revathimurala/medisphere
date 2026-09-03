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
};
