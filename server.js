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
    origin: process.env.FRONTEND_DOMAIN,
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(Express.static("public"));
app.get("/", (_, res) => {
  res.send("API REPOSITORY FEB UNDANA UP AND RUNNING");
});
app.use("/api/admin", adminRoutes);
app.use("/api/mahasiswa", MahasiswaRoutes);
app.use("*", (_, res) =>
  res.status(404).json({ message: "Endpont Not Match" })
);

app.listen(port, () => {
  console.log(`server up and running on http://localhost:${port}`);
});
