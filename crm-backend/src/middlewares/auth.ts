import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * Rôles autorisés dans l'application
 */
export type UserRole = "admin" | "administratif" | "prof" | "eleve";

/**
 * Requête Express enrichie avec l'utilisateur authentifié
 */
export type AuthedRequest = Request & {
  user?: {
    id: string;
    role: UserRole;
    email: string;
  };
};

/**
 * 🔐 Middleware d’authentification JWT
 */
export function authRequired(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: missing token" });
  }

  const token = header.slice(7);

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET) as {
      id: string;
      role: UserRole;
      email: string;
    };

    req.user = {
      id: payload.id,
      role: payload.role,
      email: payload.email,
    };

    next();
  } catch (err) {
    console.error("❌ Invalid token:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * 🧠 Middleware de contrôle des rôles
 */
export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: insufficient rights" });
    }
    next();
  };
}
