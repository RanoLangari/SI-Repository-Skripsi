import db from "../utils/dbFirestore.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();
const saltRounds = 10;


export const loginAdmin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const query = db.collection('admin').where('username', '==', username);
        const snapshot = await query.get();
        if (snapshot.empty) {
            return res.status(200).send({
                status: "error",
                message: "Username tidak terdaftar",
            });
        }
        const user = snapshot.docs[0].data();
        const isPasswordMatch = bcrypt.compareSync(password, user.password);
        if (!isPasswordMatch) {
            return res.status(200).send({
                status: "error",
                message: "Password salah",
            });
        }
        const token = jwt.sign({ email: user.email, username: user.username, }, process.env.SECRET_KEY, { expiresIn: "7d" });
        res.status(200).send({
            status: "success",
            message: "Login berhasil",
            token

        });
    } catch (error) {
        console.log(error);
    }
}

export const createAdmin = async (req, res) => {
    try {
        const { username, email, password, confirm_password } = req.body;
        if (password !== confirm_password) {
            return res.status(400).send({
                message: "Password tidak sama",
            });
        }
        const hashPassword = bcrypt.hashSync(password, saltRounds);
        const query = db.collection('admin');
        const data = {
            username,
            email,
            password: hashPassword,
        };
        const snapshot = await query.where('email', '==', email).get();
        if (!snapshot.empty) {
            return res.status(400).send({
                message: "Email sudah terdaftar",
            });
        }
        const result = await query.add(data);
        res.status(200).send({
            status: "success",
            message: "Admin berhasil ditambahkan",
            data: {
                id: result.id,
                ...data,
            },
        });

    } catch (error) {
        console.log(error);
    }
}

export const getAdmin = async (req, res) => {
    try {
        const query = db.collection('admin');
        const snapshot = await query.get();
        const result = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        res.status(200).send({
            status: "success",
            message: "Berhasil mendapatkan data admin",
            data: result,
        });
    } catch (error) {
        console.log(error);
    }
}

