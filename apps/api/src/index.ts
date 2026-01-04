import express from "express";

const app = express();

app.get("/", (_req, res) => {
  res.send("Get Method Called on Backend");
});

const PORT = 9000;
const HOST = "localhost";
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
