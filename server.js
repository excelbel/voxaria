require("dotenv").config();

const mongoose = require("mongoose");
const app = require("./app");
const { connectRedis } = require("./config/redis");

const PORT = process.env.PORT || 10000;

// CONNECT SERVICES
(async () => {
  await connectRedis();

  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("MongoDB Connected");

      app.listen(PORT, "0.0.0.0", () => {
        console.log("Server running on", PORT);
      });
    })
    .catch(err => {
      console.log("DB Error:", err.message);
    });
})();