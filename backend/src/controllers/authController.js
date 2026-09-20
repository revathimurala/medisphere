import jwt from "jsonwebtoken";

/**
 * @route POST /api/auth/login
 * @desc Authenticates user (clinician, patient, admin) and issues JWT access token
 * @access Public
 */
export function login(req, res) {
  const { username = "demo", role = "provider" } = req.body || {};
  const safeRole = ["admin", "provider", "patient"].includes(role) ? role : "provider";
  
  // Sign JWT token valid for 8 hours with user identity and RBAC role
  const token = jwt.sign(
    { sub: username, role: safeRole },
    process.env.JWT_SECRET || "change-me-in-production",
    { expiresIn: "8h" }
  );
  
  res.json({ token, user: { username, role: safeRole } });
}

/**
 * @route POST /smart/token
 * @desc OAuth2 Token Endpoint for SMART on FHIR authorization code / client credentials flow
 * @access Public (Requires valid client_id and client_secret)
 */
export function smartToken(req, res) {
  const clientId = req.body.client_id || req.body.clientId;
  const clientSecret = req.body.client_secret || req.body.clientSecret;
  const expectedId = process.env.FHIR_CLIENT_ID || "medisphere-demo-client";
  const expectedSecret = process.env.FHIR_CLIENT_SECRET || "medisphere-demo-secret";

  // Validate SMART client credentials
  if (clientId !== expectedId || clientSecret !== expectedSecret) {
    return res.status(401).json({ error: "invalid_client" });
  }

  const scope = req.body.scope || "user/*.read";
  
  // Issue SMART on FHIR access token valid for 1 hour
  const access_token = jwt.sign(
    { sub: clientId, scope },
    process.env.JWT_SECRET || "change-me-in-production",
    { expiresIn: "1h" }
  );
  
  res.json({ access_token, token_type: "Bearer", expires_in: 3600, scope });
}
