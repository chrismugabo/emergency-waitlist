const express = require("express");
const { Pool } = require("pg");
const path = require("path");
const cors = require("cors");

// Initialize Express application
const app = express();

// Database connection setup
const pool = new Pool({
    user: "postgres", // Database user
    host: "localhost", // Hostname
    database: "hospital_triage", // Database name
    password: "2003", // Database password
    port: 5432, // Default PostgreSQL port
});

// Middleware
app.use(cors()); // Enable cross-origin resource sharing
app.use(express.json()); // Parse incoming JSON requests
app.use(express.static(path.join(__dirname, "../"))); // Serve static files from parent directory

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
    if (err) {
        console.error("Database connection error:", err);
    } else {
        console.log("Database connected at:", res.rows[0]);
    }
});

// Serve `index.html` as the default route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

// Helper function to generate unique 3-letter codes
const generateCode = () => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join("");
};

// Helper function to calculate dynamic wait time
const calculateWaitTime = async (severity) => {
    try {
        const result = await pool.query(
            "SELECT COUNT(*) AS count FROM patients WHERE severity_of_injuries >= $1",
            [severity]
        );
        const patientsAhead = parseInt(result.rows[0].count, 10);
        const averageProcessingTime = 15; // Assume 15 minutes per patient
        return patientsAhead * averageProcessingTime;
    } catch (error) {
        console.error("Error calculating wait time:", error);
        return 0;
    }
};

// API: Admin Login Authentication
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

// API: Fetch All Patients
app.get("/patients", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM patients ORDER BY arrival_time ASC");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching patients:", err);
        res.status(500).send("Error fetching patients");
    }
});

// API: Get Specific Patient's Wait Time by Code
app.get("/patients/:code", async (req, res) => {
    const code = req.params.code;

    try {
        const result = await pool.query("SELECT estimated_wait_time FROM patients WHERE code = $1", [code]);
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

// API: Add New Patient
app.post("/patients", async (req, res) => {
    const { name, severity } = req.body;
    const code = generateCode();

    try {
        const estimatedWaitTime = await calculateWaitTime(severity);

        const result = await pool.query(
            `INSERT INTO patients (name, severity_of_injuries, code, estimated_wait_time, arrival_time) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, severity, code, estimatedWaitTime, new Date()]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding patient:", error);
        res.status(500).send("Error adding patient");
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
