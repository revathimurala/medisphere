import express from "express";
import os from "os";

const router = express.Router();

router.get("/system/network-info", (req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push({ interface: name, address: iface.address });
      }
    }
  }
  // Sort Wi-Fi / Hotspot first if available, then Ethernet
  addresses.sort((a, b) => {
    const aWifi = /wi-fi|wlan|wireless|hotspot/i.test(a.interface);
    const bWifi = /wi-fi|wlan|wireless|hotspot/i.test(b.interface);
    if (aWifi && !bWifi) return -1;
    if (!aWifi && bWifi) return 1;
    return 0;
  });

  const primaryIp = addresses[0]?.address || "localhost";
  res.json({
    primaryIp,
    addresses,
    port: 5173,
    mobileSensorUrl: `http://${primaryIp}:5173/#/mobile-sensor`
  });
});

export default router;
