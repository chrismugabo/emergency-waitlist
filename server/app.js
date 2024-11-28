const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files directly from the root directory
app.use(express.static(path.join(__dirname, "../")));

// Serve index.html as the default route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
