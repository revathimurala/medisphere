import express from "express";
import { login, register, getMe, getDemoCredentials, smartToken } from "../controllers/authController.js";
import { getSmartConfigApi } from "../controllers/fhirController.js";
import { auth } from "../middleware/authMiddleware.js";

const authRouter = express.Router();
authRouter.post("/auth/login", login);
authRouter.post("/auth/register", register);
authRouter.post("/auth/signup", register);
authRouter.get("/auth/me", auth, getMe);
authRouter.get("/auth/demo-credentials", getDemoCredentials);

const smartRouter = express.Router();
smartRouter.post("/token", express.urlencoded({ extended: false }), smartToken);
smartRouter.get("/config", getSmartConfigApi);

export { authRouter, smartRouter };
