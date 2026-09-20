import axios from "axios";
import {
  fhirEngine,
  localFhirResource,
  localFhirSearch,
  fhirBundle,
  validateFhirResource,
  addCollectedFhir
} from "../services/fhirStore.js";

/**
 * @route GET /fhir/R4/metadata, GET /fhir/metadata
 * @desc Returns HL7 FHIR R4 CapabilityStatement documenting supported FHIR resources and API capabilities
 * @access Public
 */
export function getCapabilityStatement(req, res) {
  const port = Number(process.env.PORT || 4000);
  res.type("application/fhir+json").json({
    resourceType: "CapabilityStatement",
    id: "medisphere-fhir",
    status: "active",
    kind: "instance",
    fhirVersion: "4.0.1",
    format: ["application/fhir+json"],
    implementation: {
      description: "MediSphere FHIR R4 Clinical API",
      url: `http://localhost:${port}/fhir/R4`
    },
    rest: [{
      mode: "server",
      resource: ["Patient", "Observation", "Condition", "MedicationRequest", "DiagnosticReport"].map(type => ({
        type,
        interaction: [{ code: "read" }, { code: "search-type" }]
      }))
    }]
  });
}

/**
 * @route GET /.well-known/smart-configuration, GET /fhir/R4/.well-known/smart-configuration
 * @desc Returns SMART on FHIR OAuth2 discovery metadata endpoints for EHR client authorization
 * @access Public
 */
export function getWellKnownSmartConfig(req, res) {
  const port = Number(process.env.PORT || 4000);
  res.json({
    authorization_endpoint: `http://localhost:${port}/smart/authorize`,
    token_endpoint: `http://localhost:${port}/smart/token`,
    capabilities: ["launch-ehr", "client-public", "client-confidential-symmetric", "sso-openid-connect"],
    scopes_supported: ["openid", "fhirUser", "user/*.read"],
    token_endpoint_auth_methods_supported: ["client_secret_post"]
  });
}

/**
 * @route GET /api/smart/config
 * @desc Retrieves current SMART on FHIR environment configuration and external EHR discovery info
 * @access Protected
 */
export async function getSmartConfigApi(req, res) {
  if (!process.env.FHIR_BASE_URL) return res.status(500).json({ message: "FHIR_BASE_URL missing" });
  let discovery = null;
  try {
    discovery = await axios.get(`${process.env.FHIR_BASE_URL.replace(/\/$/, "")}/.well-known/smart-configuration`, { timeout: 5000 }).then(r => r.data);
  } catch {}
  res.json({
    fhirBaseUrl: process.env.FHIR_BASE_URL,
    smartConfigured: !!(process.env.FHIR_TOKEN_URL && process.env.FHIR_CLIENT_ID),
    authorizationEndpoint: discovery?.authorization_endpoint || null,
    tokenEndpoint: discovery?.token_endpoint || process.env.FHIR_TOKEN_URL || null,
    scopes: process.env.FHIR_SCOPE || "user/*.read"
  });
}

/**
 * @route GET /fhir/R4/:resourceType/:id, GET /fhir/:resourceType/:id
 * @desc Fetches specific FHIR resource by ID (supports JSON and XML format conversion)
 * @access Protected (SMART Bearer token)
 */
export function getResourceById(req, res) {
  const resource = localFhirResource(req.params.resourceType, req.params.id);
  if (!resource) {
    return res.status(404).type("application/fhir+json").json({
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code: "not-found", diagnostics: "Resource not found" }]
    });
  }
  const accept = req.headers.accept || "";
  if (accept.includes("xml") || req.query._format === "xml") {
    return res.type("application/fhir+xml").send(fhirEngine.objToXml(resource));
  }
  res.type("application/fhir+json").json(resource);
}

/**
 * @route GET /fhir/R4/:resourceType, GET /fhir/:resourceType
 * @desc Searches FHIR resources by type and optional patient query parameter, returning a FHIR searchset Bundle
 * @access Protected (SMART Bearer token)
 */
export function searchResources(req, res) {
  const allowed = ["Patient", "Observation", "Condition", "MedicationRequest", "DiagnosticReport"];
  if (!allowed.includes(req.params.resourceType)) {
    return res.status(404).json({ message: "FHIR resource type not supported" });
  }
  const patientId = req.query.patient || req.query.subject?.replace(/^Patient\//, "");
  res.type("application/fhir+json").json(fhirBundle(localFhirSearch(req.params.resourceType, patientId), req.params.resourceType));
}

/**
 * @route POST /fhir/R4/$validate, POST /fhir/$validate
 * @desc Official HL7 FHIR R4 schema validation operation powered by npm fhir engine
 * @access Public
 */
export function validateResource(req, res) {
  const resource = req.body;
  if (!resource || typeof resource !== "object" || !resource.resourceType) {
    return res.status(400).type("application/fhir+json").json({
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code: "invalid", diagnostics: "A valid FHIR resource body is required" }]
    });
  }
  const result = fhirEngine.validate(resource);
  const issues = (result.messages || []).map(m => ({
    severity: m.severity || "error",
    code: m.severity === "error" ? "invalid" : "informational",
    location: [m.location],
    diagnostics: m.message
  }));
  if (result.valid) {
    issues.unshift({
      severity: "information",
      code: "informational",
      diagnostics: `Official HL7 FHIR R4 schema validation passed for ${resource.resourceType}/${resource.id || "new"}.`
    });
  }
  res.type("application/fhir+json").json({
    resourceType: "OperationOutcome",
    id: `outcome-${Date.now()}`,
    issue: issues
  });
}

/**
 * @route POST /fhir/R4/:resourceType, POST /fhir/:resourceType
 * @desc Validates and creates a new FHIR resource (Observation or DiagnosticReport) in the FHIR server
 * @access Protected (SMART Bearer token write scope)
 */
export function postResource(req, res) {
  const allowed = ["Observation", "DiagnosticReport"];
  const type = req.params.resourceType;
  if (!allowed.includes(type)) {
    return res.status(400).type("application/fhir+json").json({
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code: "not-supported", diagnostics: "Only Observation and DiagnosticReport writes are currently supported" }]
    });
  }
  const resource = req.body || {};
  if (resource.resourceType !== type || !validateFhirResource(resource)) {
    return res.status(400).type("application/fhir+json").json({
      resourceType: "OperationOutcome",
      issue: [{ severity: "error", code: "invalid", diagnostics: "Valid FHIR R4 resourceType, id, code and subject.reference are required" }]
    });
  }
  addCollectedFhir(resource);
  res.status(201).type("application/fhir+json").json(resource);
}
