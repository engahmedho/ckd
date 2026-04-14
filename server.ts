import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import dotenv from "dotenv";
import { spawn } from "child_process";

dotenv.config();

// حل يعمل مع ESM و CJS
let __filename: string;
let __dirname: string;

if (typeof import.meta.url !== 'undefined') {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} else {
  // في حالة CommonJS
  __filename = __filename;
  __dirname = __dirname;
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000; // استخدام PORT من البيئة

  app.use(express.json());

  // Initialize Database
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        inputs JSONB NOT NULL,
        result JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("PostgreSQL table 'assessments' is ready.");
  } catch (err) {
    console.error("Database initialization error:", err);
  }

  // API Routes
  app.post("/api/predict", async (req, res) => {
    const { inputs, userId } = req.body;

    try {
      // Use Python Bridge to run the .pkl model
      const pythonProcess = spawn("python3", ["bridge.py"]);
      
      let resultData = "";
      let errorData = "";

      pythonProcess.stdin.write(JSON.stringify(inputs));
      pythonProcess.stdin.end();

      pythonProcess.stdout.on("data", (data) => {
        resultData += data.toString();
      });

      pythonProcess.stderr.on("data", (data) => {
        errorData += data.toString();
      });

      pythonProcess.on("close", async (code) => {
        if (code !== 0) {
          console.error("Python error:", errorData);
          return res.status(500).json({ error: "Prediction failed" });
        }

        try {
          const result = JSON.parse(resultData);
          
          // Save to PostgreSQL
          await pool.query(
            "INSERT INTO assessments (user_id, inputs, result) VALUES ($1, $2, $3)",
            [userId || "anonymous", JSON.stringify(inputs), JSON.stringify(result)]
          );

          res.json(result);
        } catch (e) {
          console.error("JSON Parse error:", e);
          res.status(500).json({ error: "Invalid prediction output" });
        }
      });
    } catch (err) {
      console.error("Prediction error:", err);
      res.status(500).json({ error: "Prediction failed" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const total = await pool.query("SELECT COUNT(*) FROM assessments");
      const ckd = await pool.query("SELECT COUNT(*) FROM assessments WHERE result->>'diagnosis' = 'CKD Detected'");
      const healthy = await pool.query("SELECT COUNT(*) FROM assessments WHERE result->>'diagnosis' = 'Healthy'");
      const recent = await pool.query("SELECT * FROM assessments ORDER BY created_at DESC LIMIT 10");

      res.json({
        totalAssessments: parseInt(total.rows[0].count),
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
