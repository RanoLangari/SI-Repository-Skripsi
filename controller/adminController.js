import { FieldValue } from "@google-cloud/firestore";
import storage from "../utils/storege.js";
import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import EmailService from "../utils/emailService.js";
import Helper from "../utils/helper.js";
import exceljs from "exceljs";
dotenv.config();

const saltRounds = 8;
const emailService = new EmailService();
const helper = new Helper();

export const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;
    const query = db.collection("admin").where("username", "==", username);
    const snapshot = await query.get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Username tidak terdaftar");
    const user = snapshot.docs[0].data();
    const isPasswordMatch = bcrypt.compareSync(password, user.password);
    if (!isPasswordMatch)
      return helper.responseError(res, 400, "Password salah");
    const token = jwt.sign(
      { id: snapshot.docs[0].id },
      process.env.SECRET_KEY,
      { expiresIn: "1d" }
    );
    res.status(200).send({
      status: "success",
      message: "Login berhasil",
      token,
    });
  } catch (error) {
    console.log("Error in loginAdmin: ", error);
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { username, email, password, confirm_password } = req.body;
    if (password !== confirm_password)
      return helper.responseError(res, 400, "Password tidak sama");
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const query = db.collection("admin");
    const data = {
      username,
      email,
      password: hashPassword,
    };
    const snapshot = await query.where("email", "==", email).get();
    if (!snapshot.empty)
      return helper.responseError(res, 400, "Email sudah terdaftar");
    const result = await query.add(data);
    return helper.response(res, 200, "Admin berhasil ditambahkan", {
      id: result.id,
      ...data,
    });
  } catch (error) {
    console.log("Error in createAdmin: ", error);
  }
};

export const getAdmin = async (req, res) => {
  try {
    const { id } = req.user;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    const data = {
      email: snapshot.data().email,
      username: snapshot.data().username,
    };
    snapshot.exists
      ? helper.response(res, 200, "Data Ditemukan", data)
      : helper.responseError(res, 400, "Data tidak ditemukan");
  } catch (error) {
    console.log("Error in getAdmin: ", error);
  }
};
export const getDosen = async (_, res) => {
  try {
    const query = db.collection("dosen");
    const snapshot = await query.get();
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return helper.response(res, 200, "Berhasil mendapatkan data dosen", result);
  } catch (error) {
    console.log("Error in getDosen: ", error);
  }
};

export const tambahDosen = async (req, res) => {
  try {
    const { nama, jurusan } = req.body;
    const query = db.collection("dosen");
    const data = {
      nama,
      jurusan,
    };
    const result = await query.add(data);
    return helper.response(res, 200, "Dosen berhasil ditambahkan", {
      id: result.id,
      ...data,
    });
  } catch (error) {
    console.log("Error in tambahDosen: ", error);
  }
};

export const importExcelDosen = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return helper.responseError(
        res,
        400,
        "Mohon Masukan File yang Ingin Diupload dan Pastikan Sudah Sesuai Dengan Template"
      );
    }

    const file = req.files.file;
    const data = await helper.processExcelFileDataDosen(file.data);
    await helper.batchAddDataDosen(data);

    return helper.responseSuccess(res, 200, "Data mahasiswa berhasil diupload");
  } catch (error) {
    return helper.responseError(res, 500, error.message);
  }
};

export const deleteDosen = async (req, res) => {
  try {
    const id = req.params.id;
    const query = db.collection("dosen").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Dosen tidak ditemukan");
    await query.delete();
    return helper.responseSuccess(res, 200, "Dosen berhasil dihapus");
  } catch (error) {
    console.log("Error in deleteDosen: ", error);
  }
};

export const editDosen = async (req, res) => {
  try {
    const id = req.params.id;
    const { nama, jurusan } = req.body;
    const query = db.collection("dosen").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Dosen tidak ditemukan");
    await query.update({
      nama,
      jurusan,
    });
    return helper.responseSuccess(res, 200, "Dosen berhasil diupdate");
  } catch (error) {
    console.log("Error in editDosen: ", error);
  }
};
export const getSkripsiProcess = async (req, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("skripsi.status", "==", "proses").get();
    const result = snapshot.docs.map((doc) => ({
      id: doc.id,
      nim: doc.data().nim,
      nama: doc.data().nama,
      judul: doc.data().skripsi.judul_skripsi,
      jurusan: doc.data().jurusan,
      status: doc.data().skripsi.status,
    }));
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data mahasiswa",
      result
    );
  } catch (error) {
    console.log("Error in getSkripsiProcess: ", error);
  }
};

export const KonfirmasiSkripsi = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const data = snapshot.data();
    data.email && emailService.sendEmailSkripsiVerified(data.email);
    await query.update({
      "skripsi.status": "Terverifikasi",
    });
    return helper.response(res, 200, "Status skripsi Terverifikasi", data);
  } catch (error) {
    console.log("Error in konfirmasiSkripsi: ", error);
  }
};

export const deleteSkripsi = async (req, res) => {
  try {
    const { id } = req.params;
    const { alasan } = req.body;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const bucket = storage.bucket(process.env.BUCKET_NAME);
    const file = bucket.file(`${id}.pdf`);
    await file.delete();
    await query.update({
      "skripsi.skripsi_url": FieldValue.delete(),
      "skripsi.status": "Ditolak",
      "skripsi.alasan": alasan,
      "skripsi.peminatan": FieldValue.delete(),
      "skripsi.abstract": FieldValue.delete(),
    });
    const data = snapshot.data();
    data.email && emailService.sendEmailSkripsiReject(data.email, alasan);
    return helper.response(
      res,
      200,
      `Status skripsi Ditolak dengan alasan ${alasan}`,
      data
    );
  } catch (error) {
    console.log("Error in deleteSkripsi: ", error);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { id } = req.user;
    const { old_password, new_password } = req.body;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const user = snapshot.data();
    const isPasswordMatch = bcrypt.compareSync(old_password, user.password);
    if (!isPasswordMatch)
      return helper.responseError(res, 400, "Password salah");
    const hashPassword = bcrypt.hashSync(new_password, saltRounds);
    await query.update({
      password: hashPassword,
    });
    return helper.response(res, 200, "Password berhasil diubah", user);
  } catch (error) {
    console.log("Error in ChangePassword: ", error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.user;
    const { username, email } = req.body;
    const query = db.collection("admin").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    await query.update({ username, email });
    return helper.response(res, 200, "Profile berhasil diubah");
  } catch (error) {
    console.log("Error in updateProfilAdmin: ", error);
  }
};

export const lupaPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const query = db.collection("admin");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Email tidak terdaftar");
    const RandomNumberOtp = Math.floor(1000 + Math.random() * 9000);
    emailService.sendOtpResetPasswordEmail(email, RandomNumberOtp);
    db.collection("admin").doc(snapshot.docs[0].id).update({
      otp: RandomNumberOtp,
    });
    return helper.responseSuccess(res, 200, "Berhasil mengirim kode OTP");
  } catch (error) {
    console.log("Error in lupaPassword:", error);
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const query = db.collection("admin");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Email tidak terdaftar");
    const data = snapshot.docs[0].data();
    if (data.otp != otp)
      return helper.responseError(res, 400, "Kode OTP tidak valid");
    return helper.responseSuccess(res, 200, "Kode OTP valid");
  } catch (error) {
    console.log("Error in verifyOtp:", error);
  }
};

export const resetpassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    const query = db.collection("admin");
    const snapshot = await query.where("email", "==", email).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "Email tidak valid");
    const hashPassword = bcrypt.hashSync(password, saltRounds);
    const result = await snapshot.docs[0].ref.update({
      password: hashPassword,
      otp: FieldValue.delete(),
    });
    if (!result) return helper.responseError(res, 400, "Gagal reset password");
    return helper.responseSuccess(res, 200, "Berhasil reset password");
  } catch (error) {
    console.log("Error in resetpassword:", error);
  }
};
export const getMahasiswaSkripsiVerified = async (req, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query
      .where("skripsi.status", "==", "Terverifikasi")
      .get();
    const result = snapshot.docs.map((doc) => ({
      ...doc.data(),
    }));
    const mapResult = result.map((item) => {
      return {
        nama: item.nama,
        nim: item.nim,
        jurusan: item.jurusan,
        judul_skripsi: item.skripsi.judul_skripsi,
        pembimbing1: item.skripsi.pembimbing1,
        pembimbing2: item.skripsi.pembimbing2,
        penguji: item.skripsi.penguji,
      };
    });
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data mahasiswa",
      mapResult
    );
  } catch (error) {
    console.log("Error in getMahasiswaSkripsiVerified:", error);
  }
};

export const getAllMahasiswa = async (_, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query.get();
    const result = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .map((item) => {
        return {
          id: item.id,
          nama: item.nama,
          nim: item.nim,
          jurusan: item.jurusan,
        };
      });
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data mahasiswa",
      result
    );
  } catch (error) {}
};

export const getAllSkripsi = async (_, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("skripsi", "!=", null).get();
    const result = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((item) => item.skripsi.status !== "Terverifikasi")
      .map((item) => {
        return {
          id: item.id,
          nama: item.nama,
          nim: item.nim,
          jurusan: item.jurusan,
          judul_skripsi: item.skripsi.judul_skripsi,
          pembimbing1: item.skripsi.pembimbing1,
          pembimbing2: item.skripsi.pembimbing2,
          penguji: item.skripsi.penguji,
        };
      });
    return helper.response(
      res,
      200,
      "Berhasil mendapatkan data skripsi",
      result
    );
  } catch (error) {
    console.log("Error in getAllSkripsi: ", error);
  }
};

export const importExcelMhs = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return helper.responseError(
        res,
        400,
        "Mohon Masukan File yang Ingin Diupload dan Pastikan Sudah Sesuai Dengan Template"
      );
    }

    const file = req.files.file;
    const data = await helper.processExcelFileDataMhs(file.data);
    await helper.validateDataMhs(data);
    await helper.batchAddDataMhs(data);

    return helper.responseSuccess(res, 200, "Data mahasiswa berhasil diupload");
  } catch (error) {
    return helper.responseError(res, 500, error.message);
  }
};

export const addMahasiswa = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let { nim, nama, jurusan } = req.body;
    const checkNim = await db
      .collection("mahasiswa")
      .where("nim", "==", Number(nim))
      .get();
    if (!checkNim.empty)
      return helper.responseError(res, 400, "NIM sudah terdaftar");
    let semester =
      `${currentYear}` - `20${nim}`.split("").splice(0, 4).join("");
    currentMonth > 6 ? (semester *= 1.5) : (semester *= 2);
    nama = helper.capitalizeFirstLetter(nama);
    const data = {
      nim: Number(nim),
      nama,
      jurusan,
      semester: semester.toString(),
      password: bcrypt.hashSync(`FEB_${nim}`, saltRounds),
      status_kelulusan: "Belum Lulus",
    };
    await db.collection("mahasiswa").add(data);
    return helper.responseSuccess(res, 200, "Mahasiswa berhasil ditambahkan");
  } catch (error) {
    console.log("Error in addMahasiswa: ", error);
  }
};

export const editDataMahasiswa = async (req, res) => {
  try {
    const { id } = req.params;
    let { nama, nim, jurusan } = req.body;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const checkNim = await db
      .collection("mahasiswa")
      .where("nim", "==", nim)
      .get();
    if (!checkNim.empty)
      if (checkNim.docs[0].id !== id)
        return helper.responseError(res, 400, "NIM sudah terdaftar");
    nama = helper.capitalizeFirstLetter(nama);
    await query.update({
      nama,
      nim: Number(nim),
      jurusan,
    });
    return helper.responseSuccess(res, 200, "Data Mahasiswa Berhasil Diubah");
  } catch (error) {
    console.log("Error in editDataMahasiswa: ", error);
  }
};

export const deleteMahasiswa = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    await query.delete();
    return helper.responseSuccess(res, 200, "Mahasiswa berhasil dihapus");
  } catch (error) {
    console.log("Error in deleteMahasiswa: ", error);
  }
};

export const cekNimAddMahasiswa = async (req, res) => {
  try {
    const { nim } = req.body;
    const query = db.collection("mahasiswa").where("nim", "==", Number(nim));
    const snapshot = await query.get();
    if (snapshot.empty)
      return helper.responseError(
        res,
        400,
        `Mahasiswa Dengan NIM ${nim} Tidak Terdaftar`
      );
    const data = snapshot.docs[0].id;
    if (snapshot.docs[0].data().status_kelulusan === "Lulus")
      return helper.responseError(
        res,
        400,
        `Data Skripsi Mahasiswa dengan NIM ${nim} Telah Terdaftar`
      );
    return helper.response(res, 200, "Data Ditemukan", data);
  } catch (error) {
    console.log("Error in cekNimAddMahasiswa: ", error);
  }
};

export const getMahasiswaAddSkripsi = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    if (snapshot.data().status_kelulusan === "Lulus")
      return helper.responseError(res, 400, "Data skripsi sudah terdaftar");
    const data = {
      nim: snapshot.data().nim,
      jurusan: snapshot.data().jurusan,
    };
    return helper.response(res, 200, "Data ditemukan", data);
  } catch (error) {
    console.log("Error in getMahasiswaAddSkripsi: ", error);
  }
};

export const getDosenByJurusan = async (req, res) => {
  try {
    const { jurusan } = req.query;
    const query = db.collection("dosen").where("jurusan", "==", jurusan);
    const snapshot = await query.get();
    const result = snapshot.docs.map((doc) => ({
      ...doc.data(),
    }));
    return helper.response(res, 200, "Data dosen ditemukan", result);
  } catch (error) {
    console.log("Error in getDosenByJurusan: ", error);
  }
};
export const tambahDataSkripsi = async (req, res) => {
  try {
    let { nim, pembimbing1, pembimbing2, penguji, judul_skripsi } = req.body;
    const query = db.collection("mahasiswa");
    const snapshot = await query.where("nim", "==", Number(nim)).get();
    if (snapshot.empty)
      return helper.responseError(res, 400, "NIM tidak terdaftar");
    if (snapshot.docs[0].data().skripsi !== undefined)
      if (snapshot.docs[0].data().skripsi)
        return helper.responseError(
          res,
          400,
          `Data Skripsi Mahasiswa dengan NIM ${nim} Telah Terdaftar`
        );
    const data = {
      status_kelulusan: "Lulus",
      skripsi: {
        pembimbing1,
        pembimbing2,
        penguji,
        judul_skripsi: helper.capitalizeFirstLetter(judul_skripsi),
      },
    };
    await query.doc(snapshot.docs[0].id).update({
      ...data,
    });
    return helper.responseSuccess(
      res,
      200,
      "Data skripsi berhasil ditambahkan"
    );
  } catch (error) {
    console.log("Error in tambahDataSkripsi: ", error);
  }
};

export const UploadDataSkripsi = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return helper.responseError(
        res,
        400,
        "Mohon Masukan File yang Ingin Diupload dan Pastikan Sudah Sesuai Dengan Template"
      );
    }

    const file = req.files.file;
    const data = await helper.processSkripsiFile(file.data);
    data.splice(0, 2);

    await helper.updateSkripsiData(data);

    return helper.responseSuccess(res, 200, "Data skripsi berhasil diupload");
  } catch (error) {
    return helper.responseError(res, 500, error.message);
  }
};

export const getSkripsiById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    const data = {
      jurusan: snapshot.data().jurusan,
      nim: snapshot.data().nim,
      judul_skripsi: snapshot.data().skripsi.judul_skripsi,
      pembimbing1: snapshot.data().skripsi.pembimbing1,
      pembimbing2: snapshot.data().skripsi.pembimbing2,
      penguji: snapshot.data().skripsi.penguji,
    };
    return helper.response(res, 200, "Data ditemukan", data);
  } catch (error) {
    console.log("Error in getSkripsiById: ", error);
  }
};

export const updateSkripsiById = async (req, res) => {
  try {
    const id = req.params.id;
    const { nim, pembimbing1, pembimbing2, penguji, judul_skripsi } = req.body;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    if (snapshot.data().nim != nim)
      return helper.responseError(res, 400, "NIM tidak valid");
    await query.update({
      "skripsi.pembimbing1": pembimbing1,
      "skripsi.pembimbing2": pembimbing2,
      "skripsi.penguji": penguji,
      "skripsi.judul_skripsi": judul_skripsi,
    });
    return helper.responseSuccess(res, 200, "Data skripsi berhasil diupdate");
  } catch (error) {
    console.log("Error in updateSkripsiById: ", error);
  }
};

export const deleteSkripsiById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = db.collection("mahasiswa").doc(id);
    const snapshot = await query.get();
    if (!snapshot.exists)
      return helper.responseError(res, 400, "Data tidak ditemukan");
    await query.update({
      skripsi: FieldValue.delete(),
      status_kelulusan: "Belum Lulus",
    });
    return helper.responseSuccess(res, 200, "Data skripsi berhasil dihapus");
  } catch (error) {
    console.log("Error in deleteSkripsiById: ", error);
  }
};

export const getDataMahasiswaForChartAdmin = async (_, res) => {
  try {
    const query = db.collection("mahasiswa");
    const snapshot = await query.get();
    const data = snapshot.docs.map((doc) => ({
      ...doc.data(),
    }));
    const result = {
      dataMhsSkripsi: {
        totalMahasiswa: data.length,
        totalMahasiswaLulus: data.filter(
          (item) => item.status_kelulusan === "Lulus"
        ).length,
        totalMahasiswaBelumLulus: data.filter(
          (item) => item.status_kelulusan === "Belum Lulus"
        ).length,
      },
      dataMhsJurusan: {
        totalMhsAkuntansi: data.filter((item) => item.jurusan == "Akuntansi")
          .length,
        totalMhsManajemen: data.filter((item) => item.jurusan == "Manajemen")
          .length,
        totalMhsEkBang: data.filter(
          (item) => item.jurusan == "Ekonomi Pembangunan"
        ).length,
      },

      dataSkripsi: {
        totalSkripsi: data.filter((item) => item.skripsi !== undefined).length,
        totalSkripsiProses: data.filter(
          (item) => item.skripsi && item.skripsi.status === "proses"
        ).length,
        totalSkripsiTerverifikasi: data.filter(
          (item) => item.skripsi && item.skripsi.status === "Terverifikasi"
        ).length,
        totalSkripsiDitolak: data.filter(
          (item) => item.skripsi && item.skripsi.status === "Ditolak"
        ).length,
        totalSkripsiDiajukanAdmin: data.filter(
          (item) => item.skripsi && item.skripsi.skripsi_url == undefined
        ).length,
      },
    };
    return helper.response(res, 200, "Berhasil mendapatkan data", result);
  } catch (error) {
    console.log("Error in getDataForChartAdmin: ", error);
  }
};
