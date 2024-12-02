// Ensure the DOM is fully loaded before running the script
document.addEventListener('DOMContentLoaded', function () {
    // Get references to UI elements
    const roleSelector = document.getElementById('role-selector');
    const adminLogin = document.getElementById('admin-login');
    const adminLoginForm = document.getElementById('admin-login-form');
    const adminView = document.getElementById('admin-view');
    const patientView = document.getElementById('patient-view');
    const refreshButton = document.getElementById('refresh-queue');
    const patientTableBody = document.querySelector('#patient-table tbody');
    const addPatientForm = document.getElementById('add-patient-form');
    const patientForm = document.getElementById('patient-form');
    const waitTimeDisplay = document.getElementById('wait-time-display');

    // Severity mappings to match database values
    const severityMapping = { "High": 3, "Medium": 2, "Low": 1 };
    const severityReverseMapping = { 3: "High", 2: "Medium", 1: "Low" };

    /**
     * Handle role selection changes to toggle UI views
     */
    roleSelector.addEventListener('change', function () {
        switch (this.value) {
            case 'admin':
                adminLogin.style.display = 'block';
                adminView.style.display = 'none';
                patientView.style.display = 'none';
                break;
            case 'patient':
                adminLogin.style.display = 'none';
                adminView.style.display = 'none';
                patientView.style.display = 'block';
                break;
            default:
                adminLogin.style.display = 'none';
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
                    fetchPatients();
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
                patientTableBody.innerHTML = '';
                data.forEach(patient => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${patient.code}</td>
                        <td>${patient.name}</td>
                        <td>${severityReverseMapping[patient.severity_of_injuries]}</td>
                        <td>${patient.estimated_wait_time || 'N/A'}</td>
                        <td>${new Date(patient.arrival_time).toLocaleString()}</td>
                        <td>
                            <button class="delete-patient" data-id="${patient.patient_id}">Delete</button>
                        </td>
                    `;
                    patientTableBody.appendChild(row);
                });
                addDeletePatientListeners();
            })
            .catch(error => console.error('Error fetching patients:', error));
    }

    /**
     * Handle "Add Patient" form submission
     */
    addPatientForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const name = document.getElementById('new-patient-name').value.trim();
        const severity = severityMapping[document.getElementById('new-patient-severity').value];

        fetch('/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, severity })
        })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Error adding patient');
                }
            })
            .then(() => {
                alert('Patient added successfully.');
                fetchPatients();
            })
            .catch(error => {
                console.error('Error adding patient:', error);
                alert('Failed to add patient.');
            });
    }

    /**
     * Add delete functionality to patient rows
     */
    function addDeletePatientListeners() {
        document.querySelectorAll('.delete-patient').forEach(button => {
            button.addEventListener('click', function () {
                const patientId = this.dataset.id;
                console.log(`Delete button clicked for Patient ID: ${patientId}`); // Debugging
                deletePatient(patientId);
            });
        });
    }

    /**
     * Function to delete a patient
     */
    function deletePatient(patientId) {
        console.log(`Sending DELETE request for Patient ID: ${patientId}`); // Debugging
        fetch(`/patients/${patientId}`, { method: 'DELETE' })
            .then(response => {
                if (response.ok) {
                    alert('Patient deleted successfully.');
                    fetchPatients();
                } else {
                    console.error(`Failed to delete patient with ID: ${patientId}`);
                    throw new Error('Error deleting patient');
                }
            })
            .catch(error => {
                console.error('Error deleting patient:', error);
                alert('Failed to delete patient.');
            });
    }

    /**
     * Handle patient form submission to check wait time
     */
    patientForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const code = document.getElementById('patient-code').value.trim().toUpperCase();

        fetch(`/patients/${code}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Patient not found');
                }
            })
            .then(data => {
                waitTimeDisplay.textContent = `Estimated Wait Time: ${data.estimated_wait_time} minutes.`;
            })
            .catch(error => {
                console.error('Error fetching wait time:', error);
                waitTimeDisplay.textContent = 'Patient not found or an error occurred.';
            });
    });
});
 