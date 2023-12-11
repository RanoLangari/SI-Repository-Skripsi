import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();
const saltRounds = 15;

export const registerMahasiswa = async (req, res) => {
  try {
    const {
      nim,
      nama,
      jurusan,
      semester,
      status_kelulusan,
      password,
      confirm_password,
    } = req.body;
    if (
      !nim ||
      !nama ||
      !jurusan ||
      !semester ||
      !status_kelulusan ||
      !password ||
      !confirm_password
    ) {
      return res.status(400).send({
        message: "Data tidak lengkap",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).send({
        message: "Password tidak sama",
      });
    }
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const query = db.collection("mahasiswa");
    const data = {
      nim,
      nama,
      jurusan,
      semester,
      status_kelulusan,
      password: hashPassword,
    };
    const snapshot = await query.where("nim", "==", nim).get();
    if (!snapshot.empty) {
      return res.status(400).send({
        message: "NIM sudah terdaftar",
      });
    }
    const result = await query.add(data);
    if (!result) {
      return res.status(400).send({
        message: "Register gagal",
      });
    }
    res.status(200).send({
      status: "success",
      message: "Register berhasil",
    });
  } catch (error) {
    console.log(error);
  }
};

export const loginMahasiswa = async (req, res) => {
  try {
    const { nim, password } = req.body;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("nim", "==", nim).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "NIM tidak terdaftar",
      });
    }
    const data = snapshot.docs[0].data();
    const checkPassword = bcrypt.compareSync(password, data.password);
    if (!checkPassword) {
      return res.status(400).send({
        message: "Password salah",
      });
    }
    const token = jwt.sign(
      { id: snapshot.docs[0].id },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );
    res.status(200).send({
      status: "success",
      message: "Login berhasil",
      data: {
        id: snapshot.docs[0].id,
        token,
      },
    });
  } catch (error) {
    console.log(error);
  }
};
