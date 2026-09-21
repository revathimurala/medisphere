import express from "express";
import {
  getNotifications,
  getNotificationStats,
  getSubscriptions,
  subscribeDevice,
  sendTestNotification,
  acknowledgeNotification,
  escalateNotification
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/notifications", getNotifications);
router.get("/notifications/stats", getNotificationStats);
router.get("/notifications/subscriptions", getSubscriptions);
router.post("/notifications/subscribe", subscribeDevice);
router.post("/notifications/send-test", sendTestNotification);
router.post("/notifications/:id/acknowledge", acknowledgeNotification);
router.post("/notifications/:id/escalate", escalateNotification);

export default router;
