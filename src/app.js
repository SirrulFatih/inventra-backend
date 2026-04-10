require("dotenv").config();

const cors = require("cors");
const express = require("express");
const auditLogRoutes = require("./routes/auditLogRoutes");
const itemRoutes = require("./routes/itemRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const userRoutes = require("./routes/userRoutes");
const { errorHandler, notFound } = require("./middlewares/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

app.use("/api/inventra/users", userRoutes);
app.use("/api/inventra/items", itemRoutes);
app.use("/api/inventra/transactions", transactionRoutes);
app.use("/api/inventra/audit-logs", auditLogRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
