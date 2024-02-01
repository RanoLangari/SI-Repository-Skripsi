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
  }),
);

app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));
app.use(fileUpload());
app.use("/api/admin", adminRoutes);
app.use("/api/mahasiswa", MahasiswaRoutes);
app.use("*", (req, res) =>
  res.status(404).json({ message: "Endpont Not Match" }),
);

app.listen(port, () => {
  console.log(`server up and running on http://localhost:${port}`);
});
