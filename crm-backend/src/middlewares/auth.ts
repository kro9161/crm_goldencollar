import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * 🔐 Type de requête enrichi avec l'utilisateur JWT et les champs standards
 */
export type AuthedRequest = Request & {
  user?: {
    id: string;
    role: string;
    email: string;
  };
  body: any;
  params: Record<string, string>;
  query: Record<string, any>;
};

/**
 * 🧱 Middleware d’authentification JWT
 * Vérifie la présence et la validité du token et ajoute `req.user`
 */
export function authRequired(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers["authorization"] || "";
    const token =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: missing token" });
    }

    // Vérifie le JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as {
      id: string;
      role: string;
      email: string;
    };

    // Attache les infos utilisateur à la requête
    req.user = { id: payload.id, role: payload.role, email: payload.email };

    next();
  } catch (err) {
    console.error("❌ Invalid token:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * 🧠 Middleware de rôle
 * Vérifie si l'utilisateur connecté a un des rôles autorisés
 */
export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ error: "Forbidden: insufficient rights" });
    }

    next();
  };
}
