import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const isAuthorized = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }
  jwt.verify(token, process.env.SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Token tidak valid" });
    }
    req.user = user;
    next();
  });
};
