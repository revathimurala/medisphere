import mobileNotificationService from "../services/mobileNotificationService.js";

export function getNotifications(req, res) {
  const { recipient, patientId, status, limit } = req.query;
  const list = mobileNotificationService.getNotifications({ recipient, patientId, status, limit });
  res.json({ success: true, count: list.length, notifications: list });
}

export function getNotificationStats(req, res) {
  const stats = mobileNotificationService.getNotificationStats();
  res.json({ success: true, stats });
}

export function getSubscriptions(req, res) {
  const devices = mobileNotificationService.getSubscriptions();
  res.json({ success: true, count: devices.length, devices });
}

export function subscribeDevice(req, res) {
  const device = mobileNotificationService.registerDevice(req.body || {});
  res.json({ success: true, message: "Mobile device registered for priority push notifications", device });
}

export function sendTestNotification(req, res) {
  const notification = mobileNotificationService.sendTestNotification(req.body || {});
  res.json({ success: true, message: "Test mobile push notification dispatched", notification });
}

export function acknowledgeNotification(req, res) {
  try {
    const { clinician = "Dr. Evelyn Reed, MD" } = req.body || {};
    const notification = mobileNotificationService.acknowledgeNotification(req.params.id, clinician);
    res.json({ success: true, message: `Notification ${req.params.id} acknowledged by ${clinician}`, notification });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export function escalateNotification(req, res) {
  try {
    const { reason = "Mobile escalation to Code Blue / ICU team" } = req.body || {};
    const notification = mobileNotificationService.escalateNotification(req.params.id, reason);
    res.json({ success: true, message: `Notification ${req.params.id} escalated to Code Blue team`, notification });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
}
