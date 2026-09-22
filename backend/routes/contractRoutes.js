const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Document = require("../models/Document");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".pdf", ".docx", ".txt"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only .pdf, .docx, and .txt files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Upload contract
router.post("/upload", protect, (req, res) => {
  upload.single("contract")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File size exceeds 10MB limit" });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No contract file uploaded" });
    }

    try {
      const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
      const title = req.body.title && req.body.title.trim() ? req.body.title.trim() : req.file.originalname;

      const newDoc = await Document.create({
        user: req.user._id,
        title,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileType: ext,
        fileSize: req.file.size,
        status: "uploaded",
      });

      res.status(201).json({
        message: "Contract uploaded successfully",
        document: newDoc,
      });
    } catch (error) {
      console.error("Contract upload error:", error);
      res.status(500).json({ message: "Failed to save contract record" });
    }
  });
});

// List user's contracts
router.get("/", protect, async (req, res) => {
  try {
    const contracts = await Document.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ contracts });
  } catch (error) {
    console.error("List contracts error:", error);
    res.status(500).json({ message: "Failed to fetch contracts" });
  }
});

// Get single contract
router.get("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid contract ID format" });
    }

    const contract = await Document.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (contract.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized access to this contract" });
    }

    res.json({ contract });
  } catch (error) {
    console.error("Get contract error:", error);
    res.status(500).json({ message: "Failed to fetch contract" });
  }
});

// Delete contract
router.delete("/:id", protect, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid contract ID format" });
    }

    const contract = await Document.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    if (contract.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized access to this contract" });
    }

    if (contract.filePath && fs.existsSync(contract.filePath)) {
      try {
        fs.unlinkSync(contract.filePath);
      } catch (fileErr) {
        console.warn("Could not delete physical file:", fileErr.message);
      }
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Contract deleted successfully" });
  } catch (error) {
    console.error("Delete contract error:", error);
    res.status(500).json({ message: "Failed to delete contract" });
  }
});

module.exports = router;