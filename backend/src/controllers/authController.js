import jwt from "jsonwebtoken";
import User, { hashPassword, verifyPassword } from "../models/User.js";
import { findUserByUsername, registerPatientRecord, DEFAULT_USERS } from "../services/userService.js";
import audit from "../services/auditService.js";

/**
 * @route POST /api/auth/login
 * @desc Authenticates user with password and issues JWT access token
 * @access Public
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required to log in."
      });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      await audit(username, "unknown", "LOGIN_FAILED", "N/A", "USER_NOT_FOUND");
      return res.status(401).json({
        message: `Account "${username}" not found. Please check your username or create an account.`
      });
    }

    // Verify hashed password
    const isValid = verifyPassword(password, user.salt, user.hash);
    if (!isValid) {
      await audit(user.username, user.role, "LOGIN_FAILED", user.patientId || "N/A", "INVALID_PASSWORD");
      return res.status(401).json({
        message: "Invalid password. Please check your credentials."
      });
    }

    // Sign JWT token valid for 8 hours with user identity and RBAC role
    const sub = user.patientId || user.username;
    const token = jwt.sign(
      {
        sub,
        username: user.username,
        role: user.role,
        name: user.name,
        patientId: user.patientId
      },
      process.env.JWT_SECRET || "change-me-in-production",
      { expiresIn: "8h" }
    );

    await audit(user.username, user.role, "LOGIN_SUCCESS", user.patientId || "N/A", "SUCCESS");

    res.json({
      token,
      user: {
        username: user.username,
        name: user.name,
        role: user.role,
        email: user.email,
        patientId: user.patientId || (user.role === "patient" ? user.username : "")
      }
    });
  } catch (err) {
    console.error("Login controller error:", err);
    res.status(500).json({ message: "Authentication service error: " + err.message });
  }
}

/**
 * @route POST /api/auth/register (or /api/auth/signup)
 * @desc Creates a new user account with hashed password and generates initial profile
 * @access Public
 */
export async function register(req, res) {
  try {
    const {
      username,
      password,
      name,
      role = "patient",
      email = "",
      patientId: customPatientId = ""
    } = req.body || {};

    if (!username || !username.trim()) {
      return res.status(400).json({ message: "Username is required." });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ message: "Password must be at least 4 characters long." });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Full Name is required." });
    }

    const cleanUsername = username.trim();
    const safeRole = ["admin", "provider", "patient"].includes(role) ? role : "patient";

    // Check if username already exists
    const existing = await User.findOne({
      username: { $regex: new RegExp(`^${cleanUsername}$`, "i") }
    });
    if (existing) {
      return res.status(409).json({ message: `Username "${cleanUsername}" is already registered. Please sign in or use another username.` });
    }

    // Determine patient ID if registering as patient
    const effectivePatientId = safeRole === "patient"
      ? (customPatientId.trim() || cleanUsername.toUpperCase())
      : "";

    // Hash password securely with PBKDF2 sha512
    const { salt, hash } = hashPassword(password);

    const newUser = await User.create({
      username: cleanUsername,
      name: name.trim(),
      email: (email || "").trim(),
      role: safeRole,
      patientId: effectivePatientId,
      hash,
      salt
    });

    // If patient, automatically provision FHIR Patient record and Consent
    if (safeRole === "patient") {
      await registerPatientRecord(effectivePatientId, name.trim());
    }

    // Sign JWT token
    const sub = effectivePatientId || newUser.username;
    const token = jwt.sign(
      {
        sub,
        username: newUser.username,
        role: newUser.role,
        name: newUser.name,
        patientId: effectivePatientId
      },
      process.env.JWT_SECRET || "change-me-in-production",
      { expiresIn: "8h" }
    );

    await audit(newUser.username, newUser.role, "REGISTER_SUCCESS", effectivePatientId || "N/A", "SUCCESS");

    res.status(201).json({
      token,
      user: {
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        email: newUser.email,
        patientId: effectivePatientId
      },
      message: `Account created successfully! Welcome, ${newUser.name}.`
    });
  } catch (err) {
    console.error("Register controller error:", err);
    res.status(500).json({ message: "Registration error: " + err.message });
  }
}

/**
 * @route GET /api/auth/me
 * @desc Returns currently authenticated user details
 * @access Protected
 */
export async function getMe(req, res) {
  try {
    const user = await findUserByUsername(req.user.username || req.user.sub);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      username: user.username,
      name: user.name,
      role: user.role,
      email: user.email,
      patientId: user.patientId
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/**
 * @route GET /api/auth/demo-credentials
 * @desc Returns pre-configured demo account hints for quick one-click login testing
 * @access Public
 */
export function getDemoCredentials(req, res) {
  const credentials = DEFAULT_USERS.map((u) => ({
    username: u.username,
    password: u.password,
    role: u.role,
    name: u.name,
    patientId: u.patientId
  }));
  res.json(credentials);
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
