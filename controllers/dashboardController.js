require("dotenv").config();

const express = require("express");

const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");

const app = express();

connectDB();

app.use(express.json());

app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.listen(3000, () => {
  console.log("Server Running");
});