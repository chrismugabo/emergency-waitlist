const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const cors = require("cors");

// Initialize Express application
const app = express();

// Database connection setup
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "hospital_triage",
    password: "2003",
    port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../"))); // Serve static files

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.error("Database connection error:", err);
    } else {
        console.log("Database connected at:", res.rows[0]);
    }
});

// Serve index.html as the default route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

// API endpoint to authenticate admin login
app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query("SELECT * FROM admins WHERE username = $1", [username]);
        if (result.rows.length === 0 || result.rows[0].password !== password) {
            return res.status(401).json({
                authenticated: false,
                message: "Invalid username or password",
            });
        }
        res.json({ authenticated: true });
    } catch (error) {
        console.error("Error during admin authentication:", error);
        res.status(500).json({ authenticated: false, message: "Server error" });
    }
});

// API endpoint to fetch all patients
app.get("/patients", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM patients");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching patients:", err);
        res.status(500).send("Error fetching patients");
    }
});

// API endpoint to get a specific patient's wait time by their code
app.get("/patients/:code", async (req, res) => {
    const code = req.params.code;
    try {
        const result = await pool.query("SELECT wait_time FROM patients WHERE code = $1", [code]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).send("Patient not found");
        }
    } catch (err) {
        console.error("Error fetching patient wait time:", err);
        res.status(500).send("Error fetching patient wait time");
    }
});

// API endpoint to add a new patient
app.post("/patients", async (req, res) => {
    const { name, severity, medical_issue } = req.body;
    const code = Math.random().toString(36).substring(2, 5).toUpperCase();
    try {
        const result = await pool.query(
            "INSERT INTO patients (name, severity, medical_issue, code, wait_time, arrival_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [name, severity, medical_issue, code, 0, new Date()]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding patient:", error);
        res.status(500).send("Error adding patient");
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
