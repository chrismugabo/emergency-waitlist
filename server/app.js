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
app.use(express.static(path.join(__dirname, "../")));

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

// Helper function: Calculate wait time with logging
const calculateWaitTime = async (painLevel, arrivalTime) => {
    try {
        const result = await pool.query(
            "SELECT COUNT(*) AS count FROM patients WHERE pain_level >= $1 AND arrival_time <= $2",
            [painLevel, arrivalTime]
        );
        const patientsAhead = parseInt(result.rows[0].count, 10);
        const averageProcessingTime = 15; // Assume 15 minutes per patient
        const waitTime = patientsAhead * averageProcessingTime;
        console.log(`Calculated Wait Time: ${waitTime} minutes for Pain Level: ${painLevel}`);
        return waitTime;
    } catch (error) {
        console.error("Error calculating wait time:", error);
        return 0;
    }
};

// Helper function: Generate a unique 3-character patient code
const generatePatientCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 3; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
            "SELECT patient_id, name, injury_type, pain_level, necessary_attention, estimated_wait_time, arrival_time, code FROM patients ORDER BY arrival_time ASC"
        );
        console.log("Fetched patients:", result.rows);
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
        console.log("Incoming request to add patient:", { name, injuryType, painLevel });
        const estimatedWaitTime = await calculateWaitTime(painLevel, new Date());
        const patientCode = generatePatientCode();
        console.log(`Generated Code: ${patientCode}, Calculated Wait Time: ${estimatedWaitTime}`);

        const result = await pool.query(
            `INSERT INTO patients (name, injury_type, pain_level, necessary_attention, estimated_wait_time, arrival_time, code) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [name, injuryType, painLevel, 0, estimatedWaitTime, new Date(), patientCode]
        );
        console.log("Patient added successfully:", result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Error adding patient:", error);
        res.status(500).send("Error adding patient");
    }
});

// API: Update Necessary Attention
app.put("/patients/:id/attention", async (req, res) => {
    const patientId = req.params.id;
    const { change } = req.body;
    try {
        const result = await pool.query(
            "UPDATE patients SET necessary_attention = GREATEST(0, necessary_attention + $1) WHERE patient_id = $2 RETURNING *",
            [change, patientId]
        );
        if (result.rows.length === 0) {
            return res.status(404).send("Patient not found");
        }
        console.log("Attention level updated:", result.rows[0]);
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
        const patientResult = await pool.query("SELECT * FROM patients WHERE patient_id = $1", [patientId]);
        if (patientResult.rows.length === 0) {
            return res.status(404).send("Patient not found");
        }
        await pool.query("DELETE FROM patients WHERE patient_id = $1", [patientId]);
        const remainingPatients = await pool.query("SELECT * FROM patients ORDER BY arrival_time ASC");
        for (const patient of remainingPatients.rows) {
            const newWaitTime = await calculateWaitTime(patient.pain_level, patient.arrival_time);
            await pool.query("UPDATE patients SET estimated_wait_time = $1 WHERE patient_id = $2", [newWaitTime, patient.patient_id]);
        }
        console.log("Patient deleted successfully and wait times recalculated.");
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
        console.log("Admin action logged:", { adminId, patientId, action });
        res.status(201).send("Action logged successfully");
    } catch (error) {
        console.error("Error logging admin action:", error);
        res.status(500).send("Error logging admin action");
    }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
