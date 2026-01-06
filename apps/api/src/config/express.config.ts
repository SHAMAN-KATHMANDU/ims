import express from "express";
import router from "./router.config"
import dbConnect from "./dbConnect";

dbConnect();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);

export default app;