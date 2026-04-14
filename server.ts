import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { spawn, exec } from "child_process";

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
    exec("ls -la", (lsErr, lsStdout, lsStderr) => {
      exec("python3 --version", (error, stdout, stderr) => {
        res.json({ 
          status: "ok", 
          message: "Server is running", 
          timestamp: new Date().toISOString(),
          python: error ? "Not found" : stdout.trim() || stderr.trim(),
          files: lsStdout ? lsStdout.split("\n").filter(f => f.trim()) : []
        });
      });
    });
  });

  app.get("/api/test-bridge", async (req, res) => {
    const dummyInputs = {
      age: 50, bp: 80, sg: 1.02, al: 0, su: 0, bgr: 120, bu: 40, sc: 1.2, sod: 140, pot: 4.5, hemo: 13, pcv: 40, wc: 8000, rc: 5,
      rbc: 'normal', pc: 'normal', pcc: 'notpresent', ba: 'notpresent', htn: 'no', dm: 'no', cad: 'no', appet: 'good', pe: 'no', ane: 'no'
    };
    
    const pythonProcess = spawn("python3", ["bridge.py"]);
    let resultData = "";
    let errorData = "";

    pythonProcess.stdin.write(JSON.stringify(dummyInputs));
    pythonProcess.stdin.end();

    pythonProcess.stdout.on("data", (data) => resultData += data.toString());
    pythonProcess.stderr.on("data", (data) => errorData += data.toString());

    pythonProcess.on("close", (code) => {
      res.json({
        code,
        stdout: resultData,
        stderr: errorData,
        parsed: resultData ? JSON.parse(resultData) : null
      });
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
    
    try {
      // Execute Python bridge script
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

      pythonProcess.on("error", (err) => {
        console.error("Failed to start Python process:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Python execution failed", details: err.message });
        }
      });

      const timeout = setTimeout(() => {
        pythonProcess.kill();
        if (!res.headersSent) {
          res.status(500).json({ error: "Prediction timed out after 30 seconds" });
        }
      }, 30000);

      pythonProcess.on("close", async (code) => {
        clearTimeout(timeout);
        if (res.headersSent) return;
        if (code !== 0) {
          console.error(`Python process exited with code ${code}. Error: ${errorData}`);
          return res.status(500).json({ 
            error: "Prediction model failed to execute", 
            details: errorData || `Exit code ${code}` 
          });
        }

        try {
          const result = JSON.parse(resultData);
          if (result.error) {
            return res.status(500).json({ error: result.error });
          }

          // Save to PostgreSQL
          await pool.query(
            "INSERT INTO assessments (user_id, inputs, result) VALUES ($1, $2, $3)",
            [userId, JSON.stringify(inputs), JSON.stringify(result)]
          );

          res.json(result);
        } catch (parseErr) {
          console.error("Failed to parse Python output:", resultData);
          res.status(500).json({ error: "Invalid output from prediction model" });
        }
      });
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
