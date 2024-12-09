document.addEventListener("DOMContentLoaded", function () {
    const roleSelector = document.getElementById("role-selector");
    const adminLogin = document.getElementById("admin-login");
    const adminView = document.getElementById("admin-view");
    const patientView = document.getElementById("patient-view");
    const patientTableBody = document.querySelector("#patient-table tbody");
    const waitTimeDisplay = document.getElementById("wait-time-display");
    const patientForm = document.getElementById("user-form");

    let selectedInjury = null;
    let selectedPainLevel = null;

    /**
     * Reset the landing page to hide all views
     */
    function resetLandingPage() {
        adminLogin.style.display = "none";
        adminView.style.display = "none";
        patientView.style.display = "none";
    }

    // Reset landing page on initial load
    resetLandingPage();

    /**
     * Handle role selection and toggle views
     */
    roleSelector.addEventListener("change", function () {
        resetLandingPage(); // Hide all views first
        switch (this.value) {
            case "admin":
                adminLogin.style.display = "block";
                break;
            case "patient":
                patientView.style.display = "block";
                break;
            default:
                resetLandingPage(); // Go back to default view
        }
    });

    /**
     * Handle admin login form submission
     */
    document.getElementById("admin-login-form").addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("admin-username").value.trim();
        const password = document.getElementById("admin-password").value.trim();

        fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.authenticated) {
                    alert("Login successful!");
                    adminLogin.style.display = "none";
                    adminView.style.display = "block";
                    fetchPatients();
                } else {
                    alert("Invalid credentials");
                }
            })
            .catch((error) => {
                console.error("Error during login:", error);
            });
    });

    /**
     * Fetch all patients and populate the admin table
     */
    function fetchPatients() {
        fetch("/patients")
            .then((res) => res.json())
            .then((data) => {
                patientTableBody.innerHTML = ""; // Clear table before populating

                data.forEach((patient) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td>${patient.patient_id}</td>
                        <td>${patient.name}</td>
                        <td>${patient.injury_type}</td>
                        <td>${patient.pain_level}</td>
                        <td>${patient.necessary_attention}</td>
                        <td>${patient.estimated_wait_time || "N/A"} minutes</td>
                        <td>
                            <button class="increase-attention" data-id="${patient.patient_id}">Increase</button>
                            <button class="decrease-attention" data-id="${patient.patient_id}">Decrease</button>
                            <button class="delete-patient" data-id="${patient.patient_id}">Delete</button>
                        </td>
                    `;
                    patientTableBody.appendChild(row);
                });

                addActionListeners(); // Add event listeners to buttons
            })
            .catch((error) => {
                console.error("Error fetching patients:", error);
            });
    }

    /**
     * Add event listeners to admin action buttons
     */
    function addActionListeners() {
        document.querySelectorAll(".increase-attention").forEach((button) => {
            button.addEventListener("click", () => updateAttention(button.dataset.id, 1));
        });

        document.querySelectorAll(".decrease-attention").forEach((button) => {
            button.addEventListener("click", () => updateAttention(button.dataset.id, -1));
        });

        document.querySelectorAll(".delete-patient").forEach((button) => {
            button.addEventListener("click", () => deletePatient(button.dataset.id));
        });
    }

    /**
     * Update attention level for a patient
     */
    function updateAttention(patientId, change) {
        fetch(`/patients/${patientId}/attention`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ change }),
        })
            .then((res) => res.json())
            .then((data) => {
                alert("Attention updated successfully!");
                fetchPatients(); // Refresh the patient list
            })
            .catch((error) => {
                console.error("Error updating attention:", error);
            });
    }

    /**
     * Delete a patient and refresh the table
     */
    function deletePatient(patientId) {
        if (confirm("Are you sure you want to delete this patient?")) {
            fetch(`/patients/${patientId}`, { method: "DELETE" })
                .then(() => {
                    alert("Patient deleted successfully!");
                    fetchPatients(); // Refresh the patient list
                })
                .catch((error) => {
                    console.error("Error deleting patient:", error);
                });
        }
    }

    /**
     * Handle patient form submission
     */
    patientForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const name = document.getElementById("patient-name").value.trim();

        if (!selectedInjury || !selectedPainLevel) {
            alert("Select injury type and pain level.");
            return;
        }

        fetch("/patients", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, injuryType: selectedInjury, painLevel: selectedPainLevel }),
        })
            .then((res) => res.json())
            .then((data) => {
                alert("Patient added successfully!");
                waitTimeDisplay.textContent = `Estimated Wait Time: ${data.estimated_wait_time || "N/A"} minutes.`;
            })
            .catch((error) => {
                console.error("Error adding patient:", error);
            });
    });

    // Set injury selection with alert
    document.querySelectorAll(".injury-btn").forEach((button) => {
        button.addEventListener("click", function () {
            selectedInjury = this.value;
            alert(`Selected injury: ${selectedInjury}`);
        });
    });

    // Set pain level selection with alert
    document.querySelectorAll(".pain-btn").forEach((button) => {
        button.addEventListener("click", function () {
            selectedPainLevel = this.value;
            alert(`Selected pain level: ${selectedPainLevel}`);
        });
    });
});
