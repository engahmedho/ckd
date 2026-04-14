import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "ckd-predictor-secret-key";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Request Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Routes (Register these FIRST)
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "Server is running", 
      timestamp: new Date().toISOString()
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, displayName } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const role = email === "admin@ckd.com" ? "admin" : "user";
      
      const result = await pool.query(
        "INSERT INTO users (email, password, display_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, display_name, role",
        [email, hashedPassword, displayName, role]
      );
      
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      
      res.json({ user, token });
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === '23505') {
        return res.status(400).json({ error: "Email already exists" });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length === 0) {
        return res.status(400).json({ error: "User not found" });
      }
      
      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }
      
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
      res.json({ 
        user: { id: user.id, email: user.email, display_name: user.display_name, role: user.role }, 
        token 
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  });

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: "Invalid or expired token." });
      req.user = user;
      next();
    });
  };

  app.post("/api/predict", authenticateToken, async (req: any, res) => {
    const { inputs } = req.body;
    const userId = req.user?.id?.toString();
    
    if (!userId) {
      return res.status(400).json({ error: "Invalid user session. Please log in again." });
    }

    console.log(`[${new Date().toISOString()}] Authenticated Prediction request for user: ${userId}`);
    
    try {
      // Internal Clinical Logic (Rule-based Scoring)
      let score = 0;
      let maxScore = 0;
      const findings: string[] = [];

      // 1. Serum Creatinine (Very important)
      maxScore += 40;
      if (inputs.sc > 1.2) {
        score += 40;
        findings.push(`Elevated Serum Creatinine (${inputs.sc} mg/dL) indicates impaired kidney filtration.`);
      }

      // 2. Albumin (Protein in urine)
      maxScore += 30;
      if (inputs.al > 0) {
        score += 30;
        findings.push(`Presence of Albumin in urine (Level ${inputs.al}) is a strong marker of kidney damage.`);
      }

      // 3. Hemoglobin (Anemia)
      maxScore += 20;
      if (inputs.hemo < 12) {
        score += 20;
        findings.push(`Low Hemoglobin (${inputs.hemo} g/dL) suggests anemia, common in chronic kidney issues.`);
      }

      // 4. Specific Gravity
      maxScore += 15;
      if (inputs.sg < 1.020) {
        score += 15;
        findings.push(`Low Urine Specific Gravity (${inputs.sg}) may indicate inability of kidneys to concentrate urine.`);
      }

      // 5. Blood Pressure & Hypertension
      maxScore += 20;
      if (inputs.htn === 'yes' || inputs.bp > 90) {
        score += 20;
        findings.push("Hypertension or high blood pressure is a significant risk factor for renal progression.");
      }

      // 6. Diabetes Mellitus
      maxScore += 20;
      if (inputs.dm === 'yes' || inputs.bgr > 140) {
        score += 20;
        findings.push("Diabetes or elevated blood glucose is a leading cause of diabetic nephropathy.");
      }

      // 7. Blood Urea
      maxScore += 15;
      if (inputs.bu > 45) {
        score += 15;
        findings.push(`High Blood Urea (${inputs.bu} mg/dL) indicates accumulation of nitrogenous waste.`);
      }

      // 8. Pedal Edema
      maxScore += 10;
      if (inputs.pe === 'yes') {
        score += 10;
        findings.push("Pedal Edema (swelling) suggests fluid retention due to decreased kidney function.");
      }

      const probability = Math.min(score / (maxScore * 0.7), 0.99); // Scaled probability
      const diagnosis = probability > 0.45 ? "CKD Detected" : "Healthy";
      
      let summary = "";
      if (findings.length > 0) {
        summary = `Based on clinical parameters: ${findings.join(" ")}`;
      } else {
        summary = "All clinical parameters are within normal ranges. No significant risk factors for CKD were detected.";
      }

      const prediction = {
        diagnosis,
        probability: parseFloat(probability.toFixed(2)),
        summary,
        shapValues: [] // For UI compatibility
      };

      // Save to PostgreSQL
      await pool.query(
        "INSERT INTO assessments (user_id, inputs, result) VALUES ($1, $2, $3)",
        [userId, JSON.stringify(inputs), JSON.stringify(prediction)]
      );

      res.json(prediction);
    } catch (err: any) {
      console.error("Internal Prediction error:", err);
      res.status(500).json({ 
        error: "Internal Analysis failed", 
        details: err.message || "Unknown error"
      });
    }
  });

  app.get("/api/stats", authenticateToken, async (req: any, res) => {
    try {
      // Only admins can see full stats
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden. Admin access required." });
      }
      const totalAssessments = await pool.query("SELECT COUNT(*) FROM assessments");
      const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
      const ckd = await pool.query("SELECT COUNT(*) FROM assessments WHERE result->>'diagnosis' = 'CKD Detected'");
      const healthy = await pool.query("SELECT COUNT(*) FROM assessments WHERE result->>'diagnosis' = 'Healthy'");
      const recent = await pool.query("SELECT * FROM assessments ORDER BY created_at DESC LIMIT 10");

      res.json({
        totalUsers: parseInt(totalUsers.rows[0].count),
        totalAssessments: parseInt(totalAssessments.rows[0].count),
        ckdDetected: parseInt(ckd.rows[0].count),
        healthy: parseInt(healthy.rows[0].count),
        recentAssessments: recent.rows.map(r => ({
          userId: r.user_id || "Unknown",
          createdAt: r.created_at,
          result: r.result
        }))
      });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // API Catch-all (for unmatched /api/* routes)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Initialize Database in background (Don't block routes)
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS assessments (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      inputs JSONB NOT NULL,
      result JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `).then(() => console.log("PostgreSQL tables are ready."))
    .catch(err => console.error("Database initialization error:", err));


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    console.log(`[Production] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
