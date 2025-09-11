// ===== SCRIPT INITIALIZATION =====
// This code runs immediately when the script is loaded.

// 1. Check for a logged-in user in session storage.
const storedUser = sessionStorage.getItem('currentUser');
let currentUser = null;

if (storedUser) {
    // If user info is found, parse it
    currentUser = JSON.parse(storedUser);
} else {
    // If no user is found, redirect to the login page immediately.
    alert("You are not logged in. Redirecting to login page.");
    // Assuming login.html is in a parent directory or accessible path
    window.location.href = '../login/login.html';
}


// ===== STUDENT DATA =====
const studentsData = {
    'S0001': { attendance: 77, marks: 42, assignments: 39, backlogs: 5, risk_score: 23.6 },
    'S0002': { attendance: 58, marks: 61, assignments: 77, backlogs: 4, risk_score: 12.8 },
    'S0003': { attendance: 41, marks: 91, assignments: 79, backlogs: 0, risk_score: 9.6 },
    'S0004': { attendance: 49, marks: 49, assignments: 63, backlogs: 4, risk_score: 23.1 },
    'S0005': { attendance: 49, marks: 58, assignments: 89, backlogs: 5, risk_score: 16.4 },
    'S0006': { attendance: 86, marks: 27, assignments: 59, backlogs: 5, risk_score: 24.1 },
    'S0007': { attendance: 67, marks: 63, assignments: 34, backlogs: 2, risk_score: 12.2 },
    'S0008': { attendance: 49, marks: 55, assignments: 72, backlogs: 1, risk_score: 6.4 },
    'S0009': { attendance: 77, marks: 90, assignments: 35, backlogs: 0, risk_score: 7.0 },
    'S0010': { attendance: 92, marks: 100, assignments: 64, backlogs: 5, risk_score: 16.2 },
    'S0011': { attendance: 33, marks: 28, assignments: 86, backlogs: 2, risk_score: 24.4 },
    'S0012': { attendance: 98, marks: 55, assignments: 93, backlogs: 0, risk_score: 5.0 },
    'S0013': { attendance: 82, marks: 96, assignments: 39, backlogs: 4, risk_score: 16.2 },
    'S0014': { attendance: 76, marks: 53, assignments: 90, backlogs: 5, risk_score: 15.0 },
    'S0015': { attendance: 41, marks: 41, assignments: 41, backlogs: 4, risk_score: 33.1 },
    'S0016': { attendance: 39, marks: 69, assignments: 71, backlogs: 4, risk_score: 20.4 },
    'S0017': { attendance: 93, marks: 42, assignments: 82, backlogs: 2, risk_score: 7.4 },
    'S0018': { attendance: 30, marks: 51, assignments: 64, backlogs: 1, risk_score: 20.2 },
    'S0019': { attendance: 69, marks: 23, assignments: 75, backlogs: 3, risk_score: 13.1 }
};


// ===== PAGE INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initializeStudentDashboard();
    initializeSidebar('student'); // Initialize sidebar state based on screen size
    loadStudentAssignments(); // <--- ADD THIS LINE
    handlePageLoadRouting(); // Handle URL hash-based routing on page load

    // Set up event listener for assignment download buttons
    const assignmentTable = document.querySelector('#student-assignments .data-table tbody');
    if (assignmentTable) {
        assignmentTable.addEventListener('click', (event) => {
            const targetButton = event.target.closest('.btn-view');
            if (targetButton) {
                const filenameToDownload = targetButton.dataset.filename; // Safe filename for URL
                const originalFilename = targetButton.dataset.originalFilename; // Original filename for download
                if (filenameToDownload) {
                    downloadAssignment(filenameToDownload, originalFilename);
                } else {
                    console.warn("No 'data-filename' attribute found on this assignment's view button.");
                }
            }
        });
    }
});


// ===== STUDENT DASHBOARD LOGIC =====
function initializeStudentDashboard() {
    if (!currentUser || !currentUser.id) {
        console.error("No current user found.");
        window.location.href = '../login/login.html'; // Safety redirect
        return;
    }
    const studentId = currentUser.id.toUpperCase();
    const studentData = studentsData[studentId];

    // Populate user info in the navbar and sidebar
    document.getElementById('studentName').textContent = currentUser.name;
    document.getElementById('studentId').textContent = `Student ID: ${studentId}`;
    document.getElementById('studentSidebarName').textContent = currentUser.name;
    document.getElementById('studentWelcome').textContent = `👋 Welcome back, ${currentUser.name.split(' ')[0]}!`;
    const firstInitial = currentUser.name ? currentUser.name.charAt(0) : 'S';
    document.getElementById('studentAvatar').textContent = firstInitial;

    if (!studentData) {
        console.warn(`Student data not found for ID: ${studentId}. Displaying default values.`);
        // Optionally, disable or show N/A for metrics if data is missing
        document.getElementById('attendanceValue').textContent = '--%';
        document.getElementById('marksValue').textContent = '--';
        document.getElementById('assignmentsValue').textContent = '--%';
        document.getElementById('backlogsValue').textContent = '--';
        document.getElementById('riskScore').textContent = '--%';
        document.getElementById('riskLabel').textContent = 'No Data';
        document.getElementById('riskDescription').textContent = 'Student data not available for assessment.';
        document.getElementById('riskCircle').style.stroke = '#ccc'; // Grey out circle
        return;
    }

    // Populate overview metrics
    document.getElementById('attendanceValue').textContent = studentData.attendance + '%';
    document.getElementById('marksValue').textContent = studentData.marks;
    document.getElementById('assignmentsValue').textContent = studentData.assignments + '%';
    document.getElementById('backlogsValue').textContent = studentData.backlogs;

    // Populate and animate risk assessment ring
    const riskScore = studentData.risk_score;
    const riskCircle = document.getElementById('riskCircle');
    const riskScoreElement = document.getElementById('riskScore');
    const riskLabelElement = document.getElementById('riskLabel');
    const riskDescriptionElement = document.getElementById('riskDescription');

    const radius = riskCircle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    // Revert to original offset calculation for accurate progress representation
    const offset = circumference - (riskScore / 100) * circumference;

    riskCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    riskCircle.style.strokeDashoffset = offset;

    let riskColor = '#38a169'; // Low risk
    let riskText = 'Low Risk';
    let description = 'Great job! Keep maintaining your performance.';

    if (riskScore > 70) {
        riskColor = '#e53e3e'; // High risk
        riskText = 'High Risk';
        description = 'Needs immediate attention and support.';
    } else if (riskScore > 40) {
        riskColor = '#ed8936'; // Moderate risk
        riskText = 'Moderate Risk';
        description = 'Some areas need improvement.';
    }

    riskScoreElement.textContent = riskScore + '%';
    riskScoreElement.style.color = riskColor;
    riskLabelElement.textContent = riskText;
    riskLabelElement.style.color = riskColor;
    riskCircle.style.stroke = riskColor;
    riskDescriptionElement.textContent = description;
}

// ===== NEW FUNCTION: Load Student Assignments =====
async function loadStudentAssignments() {
    const studentId = currentUser.id.toUpperCase(); // Assuming currentUser is available and has an ID
    const assignmentsTableBody = document.querySelector('#student-assignments .data-table tbody');

    if (!assignmentsTableBody) {
        console.error("Assignments table body not found.");
        return;
    }

    // Clear existing hardcoded rows
    assignmentsTableBody.innerHTML = '';

    try {
        const response = await fetch(`/api/assignments/${studentId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();

        if (result.ok && result.data && result.data.length > 0) {
            // Filter assignments to include those for current student or for all students
            const filteredAssignments = result.data.filter(assignment => 
                assignment.Student_ID === studentId || assignment.Student_ID === "ALL"
            );

            if (filteredAssignments.length === 0) {
                const row = assignmentsTableBody.insertRow();
                row.innerHTML = `<td colspan="5" style="text-align: center; padding: 20px;">No assignments found.</td>`;
                return;
            }

            filteredAssignments.forEach(assignment => {
                const row = assignmentsTableBody.insertRow();

                // Determine status badge class
                let statusClass = '';
                if (assignment.Status === 'Pending') {
                    statusClass = 'risk-high';
                } else if (assignment.Status === 'In Progress') {
                    statusClass = 'risk-moderate';
                } else if (assignment.Status === 'Submitted' || assignment.Status === 'Completed') {
                    statusClass = 'risk-low';
                }

                row.innerHTML = `
                    <td><strong>${assignment.Title}</strong></td>
                    <td>${assignment.Description}</td>
                    <td>${assignment.Due_Date}</td>
                    <td><span class="risk-badge ${statusClass}">${assignment.Status}</span></td>
                    <td>
                        <button class="action-btn btn-view" data-filename="${assignment.File_Name}" data-original-filename="${assignment.Original_File_Name || assignment.File_Name}">📁 View</button>
                    </td>
                `;
            });
        } else {
            const row = assignmentsTableBody.insertRow();
            row.innerHTML = `<td colspan="5" style="text-align: center; padding: 20px;">No assignments found.</td>`;
        }
    } catch (error) {
        console.error("Error fetching student assignments:", error);
        const row = assignmentsTableBody.insertRow();
        row.innerHTML = `<td colspan="5" style="text-align: center; padding: 20px; color: red;">Failed to load assignments. Please try again.</td>`;
    }
}

// ===== UI INTERACTION FUNCTIONS =====

function toggleSidebar(dashboardType) {
    const sidebar = document.getElementById(`${dashboardType}Sidebar`);
    const mainContent = document.getElementById(`${dashboardType}MainContent`);
    const toggleBtn = mainContent.querySelector('.sidebar-toggle');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
    toggleBtn.setAttribute('aria-expanded', String(!sidebar.classList.contains('collapsed')));
}

function showSection(dashboardType, sectionName) {
    // Remove 'active' from all menu items
    document.querySelectorAll(`#${dashboardType}Sidebar .menu-item`).forEach(item => {
        item.classList.remove('active');
    });
    // Add 'active' to the clicked menu item
    // 'event.currentTarget' refers to the element on which the event listener was placed (the menu-item div)
    event.currentTarget.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.container .section').forEach(section => {
        section.classList.remove('active');
    });

    // Show the target section
    const targetSection = document.getElementById(`${dashboardType}-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update the page title in the navbar
    const pageTitleElement = document.getElementById(`${dashboardType}PageTitle`);
    const menuItemText = event.currentTarget.querySelector('.menu-item-text').textContent;
    if (pageTitleElement) {
        pageTitleElement.textContent = menuItemText;
    }

    // Update URL hash for bookmarking and refresh persistence
    window.location.hash = sectionName;
}

/**
 * Checks the URL hash on page load and navigates to the correct section.
 */
function handlePageLoadRouting() {
    const sectionNameFromHash = window.location.hash.substring(1);
    if (sectionNameFromHash) {
        const targetMenuItem = document.querySelector(`.sidebar-menu .menu-item[onclick*="'${sectionNameFromHash}'"]`);
        if (targetMenuItem) {
            targetMenuItem.click();
        }
    }
}

/**
 * UPDATED LOGOUT FUNCTION
 * Clears the session and redirects to the login page.
 */
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear saved session data
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('mentorPhoto'); // Assuming this might be stored for mentors

        // Redirect to backend-served login page
        // Adjust path if login.html is not in a sibling directory
        window.location.href = '../login/login.html';
    }
}

// Function to handle assignment download
function downloadAssignment(filename, originalFilename) {
    const downloadUrl = `/assignments/${encodeURIComponent(filename)}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalFilename || filename; // Use original filename for download, fallback to safe filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log(`Attempting to download: ${originalFilename || filename} from ${downloadUrl}`);
}





// ===== RESPONSIVE HANDLING =====
function initializeSidebar(dashboardType) {
    const sidebar = document.getElementById(`${dashboardType}Sidebar`);
    const mainContent = document.getElementById(`${dashboardType}MainContent`);
    if (!sidebar || !mainContent) return;

    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    } else {
        sidebar.classList.remove('collapsed');
        mainContent.classList.remove('expanded');
    }
}

window.addEventListener('resize', () => initializeSidebar('student'));

// ===== MESSAGE MODAL HANDLING =====
document.addEventListener('DOMContentLoaded', () => {
    const messageModal = document.getElementById('messageModal');
    const messageForm = document.getElementById('messageForm');
    const messageMentorBtn = document.querySelector('.btn-message');

    if (messageMentorBtn) {
        messageMentorBtn.addEventListener('click', () => {
            openModal('messageModal');
        });
    }

    if (messageForm) {
        messageForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const subjectInput = document.getElementById('messageSubject');
            const bodyInput = document.getElementById('messageBody');

            const subject = subjectInput.value.trim();
            const body = bodyInput.value.trim();

            if (!subject || !body) {
                alert('Please fill in both subject and message body.');
                return;
            }

            // Prepare message payload
            const formData = new FormData();
            formData.append('studentId', currentUser.id);
            formData.append('studentName', currentUser.name);
            formData.append('mentorId', 'm001'); // Use default mentor ID for demo
            formData.append('subject', subject);
            formData.append('message', body);

            try {
                const response = await fetch('/api/messages/send', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    alert('Message sent successfully!');
                    closeModal('messageModal');
                    messageForm.reset();
                } else {
                    const errorData = await response.json();
                    alert('Failed to send message: ' + (errorData.message || 'Unknown error'));
                }
            } catch (error) {
                console.error('Error sending message:', error);
                alert('An error occurred while sending the message. Please try again later.');
            }
        });
    }
});

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}
