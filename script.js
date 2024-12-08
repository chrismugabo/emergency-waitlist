// Ensure the DOM is fully loaded before running the script
document.addEventListener("DOMContentLoaded", function () {
    // Get references to UI elements
    const roleSelector = document.getElementById("role-selector");
    const adminLogin = document.getElementById("admin-login");
    const adminLoginForm = document.getElementById("admin-login-form");
    const adminView = document.getElementById("admin-view");
    const patientView = document.getElementById("patient-view");
    const patientTableBody = document.querySelector("#patient-table tbody");

    let selectedInjury = null;
    let selectedPainLevel = null;

    /**
     * Check if admin is already logged in
     */
    if (localStorage.getItem("adminLoggedIn") === "true") {
        showAdminView();
    }

    /**
     * Handle role selection changes to toggle UI views
     */
    roleSelector.addEventListener("change", function () {
        const pageTitle = document.getElementById("page-title");
        const pageDescription = document.getElementById("page-description");

        switch (this.value) {
            case "admin":
                pageTitle.textContent = "Hospital Triage - Admin";
                pageDescription.textContent = "Login to manage the triage queue, prioritize patients, and adjust necessary attention levels.";
                adminLogin.style.display = "block";
                adminView.style.display = "none";
                patientView.style.display = "none";
                break;
            case "patient":
                pageTitle.textContent = "Hospital Triage - User";
                pageDescription.textContent = "Select your type of injury and pain level, then submit your information to the triage system.";
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
                    localStorage.setItem("adminLoggedIn", "true"); // Store login state
                    showAdminView();
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
     * Display the admin view and fetch patient data
     */
    function showAdminView() {
        adminLogin.style.display = "none";
        adminView.style.display = "block";
        patientView.style.display = "none";
        fetchPatients();
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
     * Delete a patient
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
