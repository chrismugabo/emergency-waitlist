 // Ensure the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", function () {
    // Get references to UI elements
    const roleSelector = document.getElementById("role-selector");
    const adminLogin = document.getElementById("admin-login");
    const adminLoginForm = document.getElementById("admin-login-form");
    const adminView = document.getElementById("admin-view");
    const patientView = document.getElementById("patient-view");
    const refreshButton = document.getElementById("refresh-queue");
    const patientTableBody = document.querySelector("#patient-table tbody");
    const addPatientForm = document.getElementById("add-patient-form");
    const patientForm = document.getElementById("patient-form");
    const waitTimeDisplay = document.getElementById("wait-time-display");

    /**
     * Handle role selection changes to toggle UI views
     */
    roleSelector.addEventListener("change", function () {
        switch (this.value) {
            case "admin":
                adminLogin.style.display = "block";
                adminView.style.display = "none";
                patientView.style.display = "none";
                break;
            case "patient":
                adminLogin.style.display = "none";
                adminView.style.display = "none";
                patientView.style.display = "block";
                break;
            default:
                adminLogin.style.display = "none";
                adminView.style.display = "none";
                patientView.style.display = "none";
        }
    });

    /**
     * Handle admin login form submission
     */
    adminLoginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("admin-username").value.trim();
        const password = document.getElementById("admin-password").value.trim();
        authenticateAdmin(username, password);
    });

    /**
     * Function to authenticate administrator credentials
     */
    function authenticateAdmin(username, password) {
        if (!username || !password) {
            alert("Please enter both username and password.");
            return;
        }
        fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.authenticated) {
                    adminLogin.style.display = "none";
                    adminView.style.display = "block";
                    fetchPatients();
                } else {
                    alert("Authentication failed. Please check your credentials.");
                }
            })
            .catch((error) => {
                console.error("Authentication error:", error);
                alert("Error logging in. Please try again later.");
            });
    }

    /**
     * Fetch all patients and populate the admin table
     */
    function fetchPatients() {
        fetch("/patients")
            .then((response) => response.json())
            .then((data) => {
                patientTableBody.innerHTML = "";
                data.forEach((patient) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${patient.patient_id}</td>
                        <td>${patient.name}</td>
                        <td>${patient.injury_type}</td>
                        <td>${patient.pain_level}</td>
                        <td>${patient.necessary_attention}</td>
                        <td>${patient.estimated_wait_time || "N/A"}</td>
                        <td>${new Date(patient.arrival_time).toLocaleString()}</td>
                        <td>
                            <button class="increase-attention" data-id="${patient.patient_id}">Increase</button>
                            <button class="decrease-attention" data-id="${patient.patient_id}">Decrease</button>
                            <button class="delete-patient" data-id="${patient.patient_id}">Delete</button>
                        </td>
                    `;
                    patientTableBody.appendChild(row);
                });
                addPatientActionListeners();
            })
            .catch((error) => console.error("Error fetching patients:", error));
    }

    /**
     * Handle "Add Patient" form submission
     */
    addPatientForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const name = document.getElementById("new-patient-name").value.trim();
        const injuryType = document.getElementById("new-patient-injury").value.trim();
        const painLevel = document.getElementById("new-patient-severity").value;

        if (!name || !injuryType || !painLevel) {
            alert("Please provide all required fields.");
            return;
        }

        fetch("/patients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, injuryType, painLevel }),
        })
            .then((response) => response.json())
            .then(() => {
                alert("Patient added successfully.");
                fetchPatients();
            })
            .catch((error) => {
                console.error("Error adding patient:", error);
                alert("Failed to add patient.");
            });
    });

    /**
     * Add action listeners for patient table buttons
     */
    function addPatientActionListeners() {
        document.querySelectorAll(".increase-attention").forEach((button) => {
            button.addEventListener("click", function () {
                const patientId = this.dataset.id;
                updateAttention(patientId, 1);
            });
        });

        document.querySelectorAll(".decrease-attention").forEach((button) => {
            button.addEventListener("click", function () {
                const patientId = this.dataset.id;
                updateAttention(patientId, -1);
            });
        });

        document.querySelectorAll(".delete-patient").forEach((button) => {
            button.addEventListener("click", function () {
                const patientId = this.dataset.id;
                deletePatient(patientId);
            });
        });
    }

    /**
     * Update necessary attention level
     */
    function updateAttention(patientId, change) {
        fetch(`/patients/${patientId}/attention`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ change }),
        })
            .then((response) => response.json())
            .then(() => fetchPatients())
            .catch((error) => {
                console.error("Error updating attention level:", error);
                alert("Failed to update attention level.");
            });
    }

    /**
     * Function to delete a patient
     */
    function deletePatient(patientId) {
        fetch(`/patients/${patientId}`, { method: "DELETE" })
            .then((response) => {
                if (response.ok) {
                    alert("Patient deleted successfully.");
                    fetchPatients();
                } else {
                    console.error(`Failed to delete patient with ID: ${patientId}`);
                    throw new Error("Error deleting patient");
                }
            })
            .catch((error) => {
                console.error("Error deleting patient:", error);
                alert("Failed to delete patient.");
            });
    }
});
