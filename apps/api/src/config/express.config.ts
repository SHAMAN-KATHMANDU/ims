import express from "express";
import router from "@/config/router.config"
import dbConnect from "@/config/dbConnect";

dbConnect();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);

export default app;