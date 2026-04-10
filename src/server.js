const app = require("./app");

const port = Number(process.env.PORT) || 3000;

const server = app.listen(port, () => {
  console.log(`Inventra backend running on port ${port}`);
});

const shutdown = (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Graceful shutdown timeout. Forcing exit.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
