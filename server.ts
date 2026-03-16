import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("archo.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    clientName TEXT,
    propertyValue INTEGER,
    loanAmount INTEGER,
    ltv INTEGER,
    stage TEXT,
    lastActionDate TEXT,
    ragStatus TEXT
  );

  CREATE TABLE IF NOT EXISTS lenders (
    id TEXT PRIMARY KEY,
    name TEXT,
    maxLTV INTEGER,
    minIncome INTEGER,
    selfEmployedPolicy TEXT,
    adverseCreditStance TEXT,
    lastUpdated TEXT
  );
`);

// Seed lenders if empty
const lenderCount = db.prepare("SELECT count(*) as count FROM lenders").get() as { count: number };
if (lenderCount.count === 0) {
  const insertLender = db.prepare(`
    INSERT INTO lenders (id, name, maxLTV, minIncome, selfEmployedPolicy, adverseCreditStance, lastUpdated)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertLender.run('1', 'Accord Mortgages', 95, 20000, '2 years accounts required. Will consider 1 year with projection.', 'Strict. No CCJs in last 3 years.', '2024-03-10');
  insertLender.run('2', 'NatWest', 90, 0, 'Average of last 2 years. 1 year considered for professionals.', 'Case by case. Small defaults ignored if satisfied.', '2024-03-11');
  insertLender.run('3', 'The Mortgage Works', 75, 25000, 'BTL focus. No minimum income for experienced landlords.', 'No adverse in last 2 years.', '2024-03-05');
  insertLender.run('4', 'Halifax', 95, 0, 'Latest year or average of last 2. Very flexible.', 'Credit score based. High tolerance for minor issues.', '2024-03-11');
}

// Seed cases if empty
const caseCount = db.prepare("SELECT count(*) as count FROM cases").get() as { count: number };
if (caseCount.count === 0) {
  const insertCase = db.prepare(`
    INSERT INTO cases (id, clientName, propertyValue, loanAmount, ltv, stage, lastActionDate, ragStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertCase.run('1', 'James & Sarah Wilson', 450000, 360000, 80, 'Sourcing', '2024-03-10', 'Green');
  insertCase.run('2', 'Michael Chen', 820000, 500000, 61, 'Fact-Find', '2024-03-11', 'Amber');
  insertCase.run('3', 'Emma Thompson', 310000, 279000, 90, 'Application', '2024-03-08', 'Red');
  insertCase.run('4', 'David Miller', 550000, 412500, 75, 'Lead', '2024-03-11', 'Green');
  insertCase.run('5', 'Robert & Linda Gray', 1200000, 720000, 60, 'Offer', '2024-03-05', 'Green');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/cases", (req, res) => {
    const cases = db.prepare("SELECT * FROM cases").all();
    res.json(cases);
  });

  app.post("/api/cases", (req, res) => {
    const { clientName, propertyValue, loanAmount, stage } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const ltv = Math.round((loanAmount / propertyValue) * 100);
    const lastActionDate = new Date().toISOString().split('T')[0];
    const ragStatus = 'Green';

    db.prepare(`
      INSERT INTO cases (id, clientName, propertyValue, loanAmount, ltv, stage, lastActionDate, ragStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, clientName, propertyValue, loanAmount, ltv, stage, lastActionDate, ragStatus);

    res.json({ id, clientName, propertyValue, loanAmount, ltv, stage, lastActionDate, ragStatus });
  });

  app.get("/api/lenders", (req, res) => {
    const lenders = db.prepare("SELECT * FROM lenders").all();
    res.json(lenders);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
