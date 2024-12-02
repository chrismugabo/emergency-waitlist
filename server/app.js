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
const calculateWaitTime = async (severity, arrivalTime) => {
    try {
        const result = await pool.query(
            "SELECT COUNT(*) AS count FROM patients WHERE severity_of_injuries >= $1 AND arrival_time <= $2",
            [severity, arrivalTime]
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

// API: Add New Patient
app.post("/patients", async (req, res) => {
    const { name, severity } = req.body;
    const code = generateCode();

    try {
        const estimatedWaitTime = await calculateWaitTime(severity, new Date());

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

// API: Delete a Patient and Recalculate Wait Times
app.delete("/patients/:id", async (req, res) => {
    const patientId = req.params.id;

    try {
        // Retrieve patient data to be deleted
        const patientResult = await pool.query("SELECT * FROM patients WHERE patient_id = $1", [patientId]);
        if (patientResult.rows.length === 0) {
            return res.status(404).send("Patient not found");
        }
        const patientToDelete = patientResult.rows[0];

        // Delete the patient
        await pool.query("DELETE FROM patients WHERE patient_id = $1", [patientId]);

        // Recalculate wait times for remaining patients
        const remainingPatients = await pool.query("SELECT * FROM patients ORDER BY arrival_time ASC");
        for (const patient of remainingPatients.rows) {
            const newWaitTime = await calculateWaitTime(patient.severity_of_injuries, patient.arrival_time);
            await pool.query("UPDATE patients SET estimated_wait_time = $1 WHERE patient_id = $2", [newWaitTime, patient.patient_id]);
        }

        res.status(200).send("Patient deleted and wait times updated");
    } catch (error) {
        console.error("Error deleting patient:", error);
        res.status(500).send("Error deleting patient");
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
