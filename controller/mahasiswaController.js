import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Storage } from "@google-cloud/storage";
import path from "path";
dotenv.config();
const saltRounds = 15;

const storage = new Storage({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.BUCKET_KEY,
});

export const registerMahasiswa = async (req, res) => {
  console.log(req.body);
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
    return res.status(200).send({
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
      { expiresIn: "1d" }
    );
    // set header authorization
    res.set("Authorization", `Bearer ${token}`);
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

export const checkLoginMahasiswa = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Data ditemukan",
    });
  } catch (error) {
    console.log(error);
  }
};

export const uploadSkripsi = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).send({
        message: "Mohon Masukan FIle",
      });
    }
    const file = req.files.file;
    console.log(file);
    const { id } = req.user;
    const { pembimbing1, pembimbing2, penguji, judul_skripsi, abstract } =
      req.body;
    if (!file) {
      return res.status(400).send({
        message: "Mohon Masukan FIle",
      });
    }
    if (file.mimetype !== "application/pdf")
      return res.status(400).send({
        message: "File harus berupa pdf",
      });

    if (
      !pembimbing1 ||
      !pembimbing2 ||
      !penguji ||
      !judul_skripsi ||
      !abstract
    ) {
      return res.status(400).send({
        message: "Data tidak lengkap",
      });
    }
    // upload file to google cloud storage
    const bucket = storage.bucket(process.env.BUCKET_NAME);
    const blob = bucket.file(id + path.extname(file.name));
    const blobStream = blob.createWriteStream();
    blobStream.on("error", (err) => {
      console.log(err);
    });
    blobStream.on("finish", async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      const query = db.collection("mahasiswa").doc(id);
      const data = {
        skripsi_url: publicUrl,
        pembimbing1,
        pembimbing2,
        penguji,
        judul_skripsi,
        abstract,
      };
      const result = await query.update(data);
      if (!result) {
        return res.status(400).send({
          message: "Gagal upload skripsi",
        });
      }
      res.status(200).send({
        status: "success",
        message: "Skripsi berhasil diupload",
        data: {
          skripsi: publicUrl,
        },
      });
    });
    blobStream.end(file.data);
  } catch (error) {
    console.log(error);
  }
};

export const getHalfSkripsi = async (req, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("skripsi", "!=", null).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const mapData = result.map((item) => ({
      id: item.id,
      nama: item.nama,
      jurusan: item.jurusan,
      judul_skripsi: item.skripsi.judul_skripsi,
    }));
    console.log(mapData);
    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data skripsi",
      data: mapData,
    });
  } catch (error) {
    console.log(error);
  }
};

export const getSkripsiById = async (req, res) => {
  try {
    const id = req.params.id;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const data = snapshot.data();
    const mapData = {
      id: snapshot.id,
      nama: data.nama,
      jurusan: data.jurusan,
      judul_skripsi: data.skripsi.judul_skripsi,
      abstract: data.skripsi.abstract,
      skripsi_url: data.skripsi.skripsi_url,
      pembimbing1: data.skripsi.pembimbing1,
      pembimbing2: data.skripsi.pembimbing2,
      penguji: data.skripsi.penguji,
    };
    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data skripsi",
      data: mapData,
    });
  } catch (error) {
    console.log(error);
  }
};
export const getProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const data = snapshot.data();

    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data profile",
      data,
    });
  } catch (error) {
    console.log(error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { nim, nama, jurusan, semester, status_kelulusan } = req.body;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const data = snapshot.data();
    const mapingData = {
      nim: data.nim,
      nama: data.nama,
      jurusan: data.jurusan,
      semester: data.semester,
      status_kelulusan: data.status_kelulusan,
    };
    const result = await query.update({
      nim: nim || mapingData.nim,
      nama: nama || mapingData.nama,
      jurusan: jurusan || mapingData.jurusan,
      semester: semester || mapingData.semester,
      status_kelulusan: status_kelulusan || mapingData.status_kelulusan,
    });
    if (!result) {
      return res.status(400).send({
        message: "Gagal update profile",
      });
    }
    return res.status(200).send({
      status: "success",
      message: "Berhasil update profile",
    });
  } catch (error) {
    console.log(error);
  }
};

export const getSkripsiByJurusan = async (req, res) => {
  try {
    const { jurusan } = req.query;
    console.log(jurusan);
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("jurusan", "==", jurusan).get();
    if (snapshot.empty) {
      return res.status(400).send({
        message: "Data tidak ditemukan",
      });
    }
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const mapData = result.map((item) => ({
      id: item.id,
      nama: item.nama,
      jurusan: item.jurusan,
      judul_skripsi: item.judul_skripsi,
    }));
    return res.status(200).send({
      status: "success",
      message: "Berhasil mendapatkan data skripsi",
      data: mapData,
    });
  } catch (error) {
    console.log(error);
  }
};
