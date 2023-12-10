import { createAdmin, loginAdmin, getAdmin } from "../controller/adminController.js";
import { isAuthorized } from "../utils/auth.js";
import Express from "express";

const Router = Express.Router();

Router.post("/login", loginAdmin);
Router.post("/create", createAdmin);
Router.get("/getadmin", isAuthorized, getAdmin);


export default Router;