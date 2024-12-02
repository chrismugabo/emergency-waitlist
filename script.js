 // Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', function () {
    // Get references to UI elements
    const roleSelector = document.getElementById('role-selector');
    const adminLogin = document.getElementById('admin-login');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminView = document.getElementById('admin-view');
    const patientView = document.getElementById('patient-view');
    const refreshButton = document.getElementById('refresh-queue');
    const patientForm = document.getElementById('patient-form');
    const addPatientForm = document.getElementById('add-patient-form');
    const patientTableBody = document.querySelector('#patient-table tbody');

    /**
     * Handle role selection changes to toggle UI views
     */
    roleSelector.addEventListener('change', function () {
        // Conditional rendering based on the selected role
        switch (this.value) {
            case 'admin':
                adminLogin.style.display = 'block'; // Display admin login form
                adminView.style.display = 'none'; // Hide admin view until logged in
                patientView.style.display = 'none'; // Hide patient view
                break;
            case 'patient':
                adminLogin.style.display = 'none'; // Hide admin login form
                adminView.style.display = 'none'; // Hide admin view
                patientView.style.display = 'block'; // Display patient view
                break;
            default:
                adminLogin.style.display = 'none'; // Hide all views by default
                adminView.style.display = 'none';
                patientView.style.display = 'none';
        }
    });

    /**
     * Handle admin login form submission
     */
    adminLoginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value.trim();
        authenticateAdmin(username, password);
    });

    /**
     * Function to authenticate administrator credentials
     */
    function authenticateAdmin(username, password) {
        fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.authenticated) {
                    adminLogin.style.display = 'none';
                    adminView.style.display = 'block';
                    fetchPatients(); // Load patient data on successful login
                } else {
                    alert('Authentication failed. Please check your credentials.');
                }
            })
            .catch(error => {
                console.error('Authentication error:', error);
                alert('Error logging in. Please try again later.');
            });
    }

    /**
     * Fetch all patients and populate the admin table
     */
    function fetchPatients() {
        fetch('/patients')
            .then(response => response.json())
            .then(data => {
                patientTableBody.innerHTML = ''; // Clear previous rows
                data.forEach(patient => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${patient.code}</td>
                        <td>${patient.name}</td>
                        <td>${patient.severity}</td>
                        <td>${patient.wait_time}</td>
                        <td>${new Date(patient.arrival_time).toLocaleString()}</td>
                        <td>
                            <button class="edit-patient" data-id="${patient.id}">Edit</button>
                            <button class="delete-patient" data-id="${patient.id}">Delete</button>
                        </td>
                    `;
                    patientTableBody.appendChild(row);
                });
                addEventListenersToButtons(); // Add listeners to newly added buttons
            })
            .catch(error => {
                console.error('Error fetching patients:', error);
            });
    }

    /**
     * Handle "Add Patient" form submission
     */
    addPatientForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const name = document.getElementById('new-patient-name').value.trim();
        const severity = document.getElementById('new-patient-severity').value;
        const medicalIssue = document.getElementById('new-patient-issue').value.trim();

        fetch('/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, severity, medical_issue: medicalIssue })
        })
            .then(response => response.json())
            .then(data => {
                alert(`Patient added successfully with code: ${data.code}`);
                fetchPatients(); // Refresh the table
            })
            .catch(error => {
                console.error('Error adding patient:', error);
                alert('Failed to add patient.');
            });
    });

    /**
     * Add event listeners to edit and delete buttons
     */
    function addEventListenersToButtons() {
        document.querySelectorAll('.edit-patient').forEach(button => {
            button.addEventListener('click', function () {
                const patientId = this.dataset.id;
                editPatient(patientId);
            });
        });

        document.querySelectorAll('.delete-patient').forEach(button => {
            button.addEventListener('click', function () {
                const patientId = this.dataset.id;
                deletePatient(patientId);
            });
        });
    }

    /**
     * Function to delete a patient
     */
    function deletePatient(patientId) {
        fetch(`/patients/${patientId}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    alert('Patient deleted successfully.');
                    fetchPatients(); // Refresh the table
                } else {
                    alert('Failed to delete patient.');
                }
            })
            .catch(error => {
                console.error('Error deleting patient:', error);
            });
    }

    /**
     * Function to edit a patient (Placeholder for future implementation)
     */
    function editPatient(patientId) {
        alert(`Edit functionality for patient ID ${patientId} is under construction.`);
    }
});
