// server.js — safe startup, saves /order to Mongo when available
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Try connect but do not crash
async function tryConnectMongo() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("⚠️ MONGO_URI not provided — running without DB. Orders will NOT be persisted to Mongo.");
    return null;
  }
  try {
    await mongoose.connect(uri, { autoIndex: true });
    console.log("✅ Connected to MongoDB Atlas");
    return mongoose;
  } catch (err) {
    console.error("❌ MongoDB connection error (continuing without DB):", err.message || err);
    return null;
  }
}
mongoose.connection.on('connected', () => {
  console.log('🔎 Mongoose connected. DB name:', mongoose.connection.name);
  console.log('🔎 Mongoose hosts:', mongoose.connection.hosts || mongoose.connection.client?.topology?.s?.options?.hosts);
});

// Order schema
const orderItemSchema = new mongoose.Schema({
  sku: String,
  name: String,
  qtyKg: Number,
  price: Number,
  img: String,
});
const orderSchema = new mongoose.Schema({
  customer: {
    name: String,
    phone: String,
    address: String,
  },
  items: [orderItemSchema],
  totalKg: Number,
  totalAmount: Number,
  date: { type: Date, default: Date.now },
});
let Order;
try { Order = mongoose.model("Order", orderSchema); } catch(e) { Order = mongoose.models.Order || mongoose.model("Order", orderSchema); }

// Route: accept orders
app.post("/order", async (req, res) => {
  try {
    const payload = req.body;
    // basic validation
    if (!payload || !payload.customer || !Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid order payload" });
    }

    // normalize items
    const items = payload.items.map(it => ({
      sku: it.sku,
      name: it.name,
      qtyKg: Number(it.qtyKg) || 0,
      price: Number(it.price) || 0,
      img: it.img || ""
    }));
    const totalKg = items.reduce((s,i) => s + i.qtyKg, 0);
    const totalAmount = items.reduce((s,i) => s + (i.qtyKg * i.price), 0);

    if (mongoose.connection.readyState) {
      const newOrder = new Order({
        customer: payload.customer,
        items,
        totalKg,
        totalAmount,
      });
      const saved = await newOrder.save();
      console.log("✅ Order saved:", saved._id);
      return res.json({ success: true, orderId: saved._id });
    } else {
      console.warn("⚠️ Order received but DB not connected. Not saved.");
      // send back a pseudo-id so frontend behaves as success
      return res.json({ success: true, orderId: `NOSQL-${Date.now()}`, note: "DB not connected; order not persisted." });
    }
  } catch (err) {
    console.error("❌ Error saving order:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Fallback (serve index.html)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

tryConnectMongo().finally(() => {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
