import express from "express";
import { login, smartToken } from "../controllers/authController.js";
import { getSmartConfigApi } from "../controllers/fhirController.js";

const authRouter = express.Router();
authRouter.post("/auth/login", login);

const smartRouter = express.Router();
smartRouter.post("/token", express.urlencoded({ extended: false }), smartToken);
smartRouter.get("/config", getSmartConfigApi);

export { authRouter, smartRouter };
