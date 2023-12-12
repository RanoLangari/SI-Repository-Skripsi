import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const isAuthorized = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ message: "Token tidak ditemukan" });
  }
  const splitToken = token.split(" ")[1];
  jwt.verify(splitToken, process.env.SECRET_KEY, (err, result) => {
    if (err) {
      return res.status(401).json({ message: "Token tidak valid" });
    }
    req.user = result;
    next();
  });
};
