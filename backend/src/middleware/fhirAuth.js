import jwt from "jsonwebtoken";
import { getBearer } from "./authMiddleware.js";

export function requireFhirBearer(write = false) {
  return (req, res, next) => {
    const token = getBearer(req);
    if (!token) {
      return res.status(401).type("application/fhir+json").json({
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "login", diagnostics: "SMART on FHIR bearer token required" }]
      });
    }
    try {
      const claims = jwt.verify(token, process.env.JWT_SECRET || "change-me-in-production");
      const scope = String(claims.scope || "");
      const isProvider = ["admin", "provider"].includes(claims.role);
      if (write && !isProvider && !/user\/\*\.write/.test(scope)) {
        throw new Error("write scope required");
      }
      if (!write && !isProvider && !(/user\/\*\.read/.test(scope) || /user\/\*\.write/.test(scope))) {
        throw new Error("read scope required");
      }
      req.fhirUser = claims;
      next();
    } catch {
      return res.status(403).type("application/fhir+json").json({
        resourceType: "OperationOutcome",
        issue: [{ severity: "error", code: "forbidden", diagnostics: "Invalid SMART on FHIR token or scope" }]
      });
    }
  };
}
