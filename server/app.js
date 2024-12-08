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

// Helper function to calculate dynamic wait time
const calculateWaitTime = async (painLevel, arrivalTime) => {
    try {
        const result = await pool.query(
            "SELECT COUNT(*) AS count FROM patients WHERE pain_level >= $1 AND arrival_time <= $2",
            [painLevel, arrivalTime]
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
        const result = await pool.query(
            "SELECT patient_id, name, injury_type, pain_level, necessary_attention, estimated_wait_time, arrival_time FROM patients ORDER BY arrival_time ASC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching patients:", err);
        res.status(500).send("Error fetching patients");
    }
});

// API: Add New Patient
app.post("/patients", async (req, res) => {
    const { name, injuryType, painLevel } = req.body;

    try {
        const estimatedWaitTime = await calculateWaitTime(painLevel, new Date());

        const result = await pool.query(
            `INSERT INTO patients (name, injury_type, pain_level, necessary_attention, estimated_wait_time, arrival_time) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [name, injuryType, painLevel, 0, estimatedWaitTime, new Date()]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding patient:", error);
        res.status(500).send("Error adding patient");
    }
});

// API: Update Necessary Attention
app.put("/patients/:id/attention", async (req, res) => {
    const patientId = req.params.id;
    const { change } = req.body; // `change` should be +1 or -1

    try {
        const result = await pool.query(
            "UPDATE patients SET necessary_attention = GREATEST(0, necessary_attention + $1) WHERE patient_id = $2 RETURNING *",
            [change, patientId]
        );
        if (result.rows.length === 0) {
            return res.status(404).send("Patient not found");
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Error updating attention level:", error);
        res.status(500).send("Error updating attention level");
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

        // Delete the patient
        await pool.query("DELETE FROM patients WHERE patient_id = $1", [patientId]);

        // Recalculate wait times for remaining patients
        const remainingPatients = await pool.query("SELECT * FROM patients ORDER BY arrival_time ASC");
        for (const patient of remainingPatients.rows) {
            const newWaitTime = await calculateWaitTime(patient.pain_level, patient.arrival_time);
            await pool.query("UPDATE patients SET estimated_wait_time = $1 WHERE patient_id = $2", [newWaitTime, patient.patient_id]);
        }

        res.status(200).send("Patient deleted and wait times updated");
    } catch (error) {
        console.error("Error deleting patient:", error);
        res.status(500).send("Error deleting patient");
    }
});

// API: Log Admin Actions
app.post("/admin/actions", async (req, res) => {
    const { adminId, patientId, action } = req.body;

    try {
        await pool.query(
            `INSERT INTO admin_actions (admin_id, patient_id, action, action_time) VALUES ($1, $2, $3, NOW())`,
            [adminId, patientId, action]
        );
        res.status(201).send("Action logged successfully");
    } catch (error) {
        console.error("Error logging admin action:", error);
        res.status(500).send("Error logging admin action");
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
