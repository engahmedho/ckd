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

  app.post("/api/predict", async (req, res) => {
    const { inputs, userId } = req.body;
    console.log(`[${new Date().toISOString()}] Prediction request received for user: ${userId}`);
    
    try {
      const HF_TOKEN = process.env.HUGGINGFACE_API_KEY;
      const MODEL_ID = "Habib94/llama2_fine-tuned_chronic_kidney_disease";

      if (!HF_TOKEN) {
        return res.status(500).json({ error: "Hugging Face API key is not configured" });
      }

      // Format inputs into a prompt for Llama 2
      const prompt = `<s>[INST] <<SYS>>
You are a medical diagnostic assistant. Analyze the patient data and determine if they have Chronic Kidney Disease (CKD) or are Healthy.
Respond ONLY with a JSON object in this exact format:
{"diagnosis": "CKD Detected" or "Healthy", "probability": 0.0 to 1.0, "summary": "A short medical explanation"}
<</SYS>>

Patient Data:
${Object.entries(inputs).map(([k, v]) => `${k}: ${v}`).join(", ")} [/INST]`;

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${MODEL_ID}`,
        {
          headers: { 
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          body: JSON.stringify({ 
            inputs: prompt,
            parameters: { 
              max_new_tokens: 150, 
              return_full_text: false,
              temperature: 0.1 // Keep it deterministic
            }
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error("Hugging Face API error:", error);
        return res.status(500).json({ error: "Hugging Face API failed", details: error });
      }

      const output = await response.json();
      let resultText = "";
      
      if (Array.isArray(output) && output[0]?.generated_text) {
        resultText = output[0].generated_text;
      } else {
        resultText = JSON.stringify(output);
      }

      // Extract JSON from Llama 2 output
      let result;
      try {
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : { 
          diagnosis: resultText.includes("CKD") ? "CKD Detected" : "Healthy",
          probability: 0.5,
          summary: resultText
        };
      } catch (e) {
        result = { 
          diagnosis: "Unknown", 
          probability: 0, 
          summary: "Failed to parse model output" 
        };
      }

      // Ensure shapValues exists for UI compatibility
      result.shapValues = [];

      // Save to PostgreSQL
      await pool.query(
        "INSERT INTO assessments (user_id, inputs, result) VALUES ($1, $2, $3)",
        [userId, JSON.stringify(inputs), JSON.stringify(result)]
      );

      res.json(result);
    } catch (err) {
      console.error("Prediction error:", err);
      res.status(500).json({ error: "Prediction failed" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
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
          userId: r.user_id,
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
