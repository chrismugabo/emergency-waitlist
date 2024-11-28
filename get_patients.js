const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000;

// PostgreSQL connection configuration
const pool = new Pool({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',          // Replace with your PostgreSQL username
    password: 'your_password', // Replace with your PostgreSQL password
    database: 'emergency_waitlist'
});

// Endpoint to get the list of patients
app.get('/patients', async (req, res) => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM PATIENTS');
        res.json(result.rows); // Send data as JSON
        client.release();
    } catch (err) {
        console.error('Database error:', err.stack);
        res.status(500).send('Server error');
    }
});

// Start the API server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/patients`);
});
