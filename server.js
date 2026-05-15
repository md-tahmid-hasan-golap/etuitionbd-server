const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const verifyToken = require("./middlewares/verifyToken");
const verifyRole = require("./middlewares/verifyRole");

const app = express();
const port = process.env.PORT || 5000;
const dns = require('dns')
dns.setServers(['1.1.1.1', '8.8.8.8'])
// --- 1. ENV Check ---
const requiredEnvs = ["DB_URL", "ACCESS_TOKEN_SECRET", "STRIPE_SECRET_KEY"];
requiredEnvs.forEach((env) => {
  if (!process.env[env]) {
    console.error(`ERROR: Missing required environment variable: ${env}`);
  }
});

// --- 2. Middleware & CORS ---
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://etutionbd-client.vercel.app", // Placeholder for production
    ],
    credentials: true,
  })
);
app.use(express.json());

// --- 3. MongoDB Connection ---
const uri = process.env.DB_URL;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    
    const db = client.db("tuitionDB");
    const usersCollection = db.collection("users");
    const tuitionsCollection = db.collection("tuitions");
    const tutorsCollection = db.collection("tutors");
    const applicationsCollection = db.collection("applications");
    const paymentsCollection = db.collection("payments");

    console.log("Successfully connected to MongoDB!");

    // --- ROUTES IMPORT ---
    const studentRoutes = require("./routes/studentRoutes")(usersCollection, tuitionsCollection, applicationsCollection, paymentsCollection);
    const tutorRoutes = require("./routes/tutorRoutes")(tuitionsCollection, applicationsCollection, paymentsCollection, tutorsCollection);
    const adminRoutes = require("./routes/adminRoutes")(usersCollection, tuitionsCollection, paymentsCollection, applicationsCollection, tutorsCollection);
    const publicRoutes = require("./routes/publicRoutes")(usersCollection, tuitionsCollection, tutorsCollection);

    // --- USE ROUTES ---
    app.use("/api/student", verifyToken, verifyRole("Student", usersCollection), studentRoutes);
    app.use("/api/tutor", verifyToken, verifyRole("Tutor", usersCollection), tutorRoutes);
    app.use("/api/admin", verifyToken, verifyRole("Admin", usersCollection), adminRoutes);
    app.use("/", publicRoutes);

    // JWT Generation
    app.post("/api/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
      res.send({ token });
    });

  } catch (error) {
    console.error("Critical: Failed to connect to MongoDB", error);
  }
}
run().catch(console.dir);

// --- 4. Health Check & Root Route ---
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Tuition Management Server is running...",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// --- 5. Global Error Handling Middleware ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong! Internal Server Error.",
    error: process.env.NODE_ENV === "development" ? err.message : {},
  });
});

// --- 6. Port Listening ---
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// --- 7. Export for Vercel ---
module.exports = app;
