import Express from "express";
import dotenv from "dotenv";
import cors from "cors";
import adminRoutes from "./routes/adminRoutes.js";
import MahasiswaRoutes from "./routes/mahasiswaRoutes.js";
import fileUpload from "express-fileupload";

dotenv.config();
const port = process.env.PORT || 5000;
const app = Express();

app.use(
  cors({
    // allow all origin
    origin: "*",
    credentials: false,
    // allow methods
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(fileUpload());

app.get("/", (req, res) => {
  res.render("dashboard");
});
app.get("/login-mhs", (req, res) => {
  res.render("auth/login-mhs");
});
app.get("/register-mhs", (req, res) => {
  res.render("auth/register-mhs");
});
app.get("/login-admin", (req, res) => {
  res.render("auth/login-admin");
});
app.use("/api/admin", adminRoutes);
app.use("/api/mahasiswa", MahasiswaRoutes);
app.use("*", (req, res) => res.status(404).json({ error: "not found" }));

app.listen(port, () => {
  console.log(`aplikasi berjalan pada http://localhost:${port}`);
});
