import jwt from "jsonwebtoken";
/**
 * 🧱 Middleware d’authentification JWT
 * Vérifie la présence et la validité du token et ajoute `req.user`
 */
export function authRequired(req, res, next) {
    try {
        const header = req.headers["authorization"] || "";
        const token = typeof header === "string" && header.startsWith("Bearer ")
            ? header.slice(7)
            : null;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized: missing token" });
        }
        // Vérifie le JWT
        const payload = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
        // Attache les infos utilisateur à la requête
        req.user = { id: payload.id, role: payload.role, email: payload.email };
        next();
    }
    catch (err) {
        console.error("❌ Invalid token:", err);
        return res.status(401).json({ error: "Invalid token" });
    }
}
/**
 * 🧠 Middleware de rôle
 * Vérifie si l'utilisateur connecté a un des rôles autorisés
 */
export function requireRole(...roles) {
    return (req, res, next) => {
        const userRole = req.user?.role;
        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({ error: "Forbidden: insufficient rights" });
        }
        next();
    };
}
