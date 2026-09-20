import jwt from "jsonwebtoken";

export function getBearer(req) {
  const h = req.headers.authorization || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export function auth(req, res, next) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ message: "Authentication required" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "change-me-in-production");
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function roleGuard(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "RBAC denied" });
    }
    next();
  };
}
