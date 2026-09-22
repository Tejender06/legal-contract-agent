# Task: Implement Week 3 Deliverables — Contract Upload Pipeline & Frontend UI

You are an expert full-stack developer working on the repository `c:\OJT\legal-contract-agent`.
The current Git branch is `feature/contract-upload`.

Your goal is to implement the complete **Week 3 Milestone**: Contract Upload Pipeline, Auth Middleware, and Frontend UI.

---

### Context & Rules:
1. **Backend** is in `backend/` using Node.js, Express 5, Mongoose 9, CommonJS (`require`/`module.exports`).
2. **Frontend** is in `frontend/` using Vite, React 19, ES Modules (`import`/`export`), and React Router 7.
3. Keep all responses modular, clean, and follow the exact specifications below. Do not leave placeholder comments like `// implement logic here`.
4. Follow the execution steps sequentially.

---

### Step 1: Backend Dependencies & Directory Setup
1. In `backend/`, install `multer`:
   ```bash
   cd backend && npm install multer
   ```
2. Create the folder `backend/uploads/` (if it does not exist) to store contract files.
3. Add `backend/uploads/` to the root `.gitignore` file so uploaded user files are not committed to git.

---

### Step 2: Update Document Model (`backend/models/Document.js`)
Update `backend/models/Document.js` to ensure it captures file size and file type:
```javascript
const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["pdf", "docx", "txt"],
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "completed", "failed"],
      default: "uploaded",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Document", documentSchema);
```

---

### Step 3: Create Auth Middleware (`backend/middleware/authMiddleware.js`)
Create `backend/middleware/authMiddleware.js` to verify JWT Bearer tokens and attach the user ID:
```javascript
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.userId).select("-password");
      if (!user) {
        return res.status(401).json({ message: "User not found or token invalid" });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error.message);
      return res.status(401).json({ message: "Not authorized, token invalid or expired" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

module.exports = { protect };
```

---

### Step 4: Create Contract Routes with Multer (`backend/routes/contractRoutes.js`)
Create `backend/routes/contractRoutes.js` with:
- Multer disk storage saving to `backend/uploads/` with unique filenames (`Date.now()-[safeName]`).
- File filter strictly allowing `.pdf`, `.docx`, and `.txt` extensions.
- Max file size limit: 10 MB (10 * 1024 * 1024 bytes).
- Endpoints:
  1. `POST /upload` (protected): Uploads single file field named `"contract"`, creates a `Document` record in MongoDB tied to `req.user._id`, returns status 201 with the created document.
  2. `GET /` (protected): Retrieves all contracts owned by `req.user._id`, sorted by `createdAt: -1`.
  3. `GET /:id` (protected): Retrieves a single contract by ID, verifying `contract.user.toString() === req.user._id.toString()`. Returns 404 if not found or 403 if unauthorized.

```javascript
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
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
      const title = req.body.title || req.file.originalname;

      const newDoc = await Document.create({
        user: req.user._id,
        title,
        fileName: req.file.filename,
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

module.exports = router;
```

---

### Step 5: Register Contract Routes in `backend/server.js`
In `backend/server.js`:
Import `contractRoutes` and mount it at `/api/contracts`:
```javascript
const contractRoutes = require("./routes/contractRoutes");
app.use("/api/contracts", contractRoutes);
```

---

### Step 6: Frontend Auth Context & State (`frontend/src/context/AuthContext.jsx`)
Create `frontend/src/context/AuthContext.jsx` to manage user login state, JWT in `localStorage`, and provide `login`, `register`, and `logout` functions to the application.
Also export a custom `useAuth()` hook.

---

### Step 7: Frontend Upload Screen (`frontend/src/pages/UploadScreen.jsx`)
Upgrade `frontend/src/pages/UploadScreen.jsx`:
1. Include an interactive drag-and-drop zone and a hidden file input trigger.
2. Allow custom title input (optional) with file selection.
3. Validate `.pdf`, `.docx`, `.txt` and size `<= 10MB` before submitting.
4. Send `FormData` to `http://localhost:5000/api/contracts/upload` with `Authorization: Bearer <token>`.
5. Show upload spinner/progress, success confirmation banner, and a link to view the contract on the Dashboard.
6. If the user is not logged in, show an informative message directing them to authenticate first.

---

### Step 8: Frontend Dashboard (`frontend/src/pages/Dashboard.jsx`)
Upgrade `frontend/src/pages/Dashboard.jsx`:
1. When mounted, fetch contracts from `http://localhost:5000/api/contracts` using the stored JWT token.
2. Display contracts in a responsive card grid or table showing: Title, File Name, File Type, File Size (in KB/MB), Upload Date, and Status Badge (`uploaded`, `processing`, `completed`).
3. If no contracts exist, render an attractive empty state with an "Upload Your First Contract" button linking to `/upload`.
4. Handle loading and error states gracefully.

---

### Step 9: Update Navbar & App Wrapper (`frontend/src/App.jsx`)
1. Wrap the app with `AuthProvider`.
2. Add a simple Login/Register modal or banner in the navbar so users can log in, switch accounts, or register.
3. Show the logged-in user name and a "Logout" button.

---

### Step 10: Verification
1. Test that `npm run dev` in `backend` starts without errors.
2. Run `npm run lint` and `npm run build` in `frontend` to verify 0 syntax or bundling errors.
3. Ensure `.serena/` and `backend/uploads/` remain ignored in `git status`.
