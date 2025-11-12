// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Fix for ES modules (__dirname replacement)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Serve static files (HTML, JS, images) from the root directory
app.use(express.static(__dirname));

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Schema & Model
const inquirySchema = new mongoose.Schema({
  name: String,
  business_name: String,
  phone: String,
  city: String,
  address: String,
  variety: String,
  quantity_kg: String,
  message: String,
  consent: Boolean,
  createdAt: { type: Date, default: Date.now },
});

const Inquiry = mongoose.model("Inquiry", inquirySchema);

// ✅ API endpoint to handle form submission
app.post("/submit-inquiry", async (req, res) => {
  try {
    console.log("📩 Received inquiry:", req.body);
    const inquiry = new Inquiry(req.body);
    await inquiry.save();
    res.json({ success: true, message: "Inquiry saved successfully!" });
  } catch (err) {
    console.error("❌ Error saving inquiry:", err);
    res.status(500).json({ success: false, message: "Server error, could not save" });
  }
});

// ✅ Serve index.html for all other routes
// ✅ Works in Express 5 — fallback route using RegExp
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});



// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
