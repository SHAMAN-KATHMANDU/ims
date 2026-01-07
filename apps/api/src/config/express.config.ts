import express from "express";
import router from "@/config/router.config"

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", router);

export default app;