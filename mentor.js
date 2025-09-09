// =================================================================
// ===== GLOBAL CONSTANTS & DEMO DATA =====
// =================================================================

const validCredentials = {
    'M001': { name: 'Dr. Sarah Johnson', specialization: 'Academic Performance & Study Skills', email: 'sarah.johnson@example.com', officeHours: 'Mon-Fri, 9:00 AM - 5:00 PM' },
    'M002': { name: 'Prof. Robert Wilson', specialization: 'Career Guidance', email: 'robert.wilson@example.com', officeHours: 'By Appointment' },
};

const studentsData = {
    'S0001': { name: 'Tyler Anderson', risk_score: 23.6 },
    'S0002': { name: 'Victor Hobbs', risk_score: 60.8 },
    'S0003': { name: 'Stacey Mccann', risk_score: 40.6 },
    'S0004': { name: 'Allison Mcdaniel', risk_score: 23.1 },
    'S0005': { name: 'Lisa Martin', risk_score: 16.4 },
    'S0006': { name: 'Katherine Rodriguez', risk_score: 24.1 },
    'S0007': { name: 'Yvonne Sims', risk_score: 12.2 },
    'S0008': { name: 'Rebecca Reyes', risk_score: 6.4 },
    'S0009': { name: 'David Jimenez', risk_score: 70.0 },
    'S0010': { name: 'Brent Parker', risk_score: 16.2 },
    'S0011': { name: 'Patricia Walker', risk_score: 24.4 },
    'S0012': { name: 'Robert Mccarty', risk_score: 5.0 },
    'S0013': { name: 'Ian Cardenas', risk_score: 16.2 },
    'S0014': { name: 'Alison Hobbs', risk_score: 15.0 },
    'S0015': { name: 'Jason Garcia', risk_score: 33.1 },
    'S0016': { name: 'Travis Strickland', risk_score: 20.4 },
    'S0017': { name: 'Craig Flores', risk_score: 7.4 },
    'S0018': { name: 'Mrs. April Acosta', risk_score: 20.2 },
    'S0019': { name: 'John Wood', risk_score: 13.1 },
};

const mentorAssignments = {
    'M001': ['S0001', 'S0002'],
    'M002': ['S0003']
};

// Mock availability data - replace with actual API call
const availabilityData = [
    { name: 'Dr. Sarah Johnson', status: 'available', skills: ['Academic Support', 'Study Skills'] },
    { name: 'Prof. Robert Wilson', status: 'busy', skills: ['Career Guidance', 'Job Search'] },
    { name: 'Dr. Emily Davis', status: 'available', skills: ['Mental Health', 'Stress Management'] }
];

// For this demo, we'll hardcode the current user as Dr. Sarah Johnson.
let currentUser = { id: 'M001', ...validCredentials['M001'] };
let currentSessionData = null; // To keep track of which session is being completed.

// =================================================================
// ===== API FUNCTIONS =====
// =================================================================

async function loadMentorSchedule() {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/mentor-schedule");
        const data = await response.json();
        if (data.ok) {
            renderMentorSchedule(data.schedule);
        }
    } catch (error) {
        console.error('Error loading mentor schedule:', error);
        // Fallback to mock data
        renderMentorSchedule([
            { sessionId: 'session1', studentId: 'S0001', studentName: 'John Doe', time: '2:00 PM - 3:00 PM', topic: 'Study Skills' },
            { sessionId: 'session2', studentId: 'S0002', studentName: 'Jane Smith', time: '3:30 PM - 4:30 PM', topic: 'Academic Planning' }
        ]);
    }
}

async function loadAvailability() {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/availability");
        const data = await response.json();
        if (data.ok) {
            renderAvailability(data.availability);
        }
    } catch (error) {
        console.error('Error loading availability:', error);
        // Fallback to mock data
        renderAvailability(availabilityData);
    }
}

function renderMentorSchedule(schedule) {
    const container = document.getElementById("mentorScheduleContainer");
    if (!container) return;

    container.innerHTML = "";
    schedule.forEach(session => {
        container.innerHTML += `
            <div class="session-card">
                <h3>${session.studentName}</h3>
                <p><strong>Time:</strong> ${session.time}</p>
                <p><strong>Topic:</strong> ${session.topic}</p>
                <button class="action-btn" onclick="completeSession('${session.sessionId}', '${session.studentId}', '${session.studentName}')">Complete Session</button>
            </div>
        `;
    });
}

function renderAvailability(list) {
    const container = document.getElementById("availabilityContainer");
    if (!container) return;
    
    container.innerHTML = "";
    list.forEach(person => {
        container.innerHTML += `
            <div class="availability-card ${person.status}">
                <h4>${person.name}</h4>
                <p><strong>Status:</strong> ${person.status}</p>
                <p><strong>Skills:</strong> ${person.skills.join(", ")}</p>
            </div>
        `;
    });
}

// =================================================================
// ===== APPLICATION INITIALIZATION =====
// =================================================================

/**
 * Main entry point for the mentor dashboard.
 */
document.addEventListener('DOMContentLoaded', async function() {
    if (currentUser) {
        // Load mentor assignments from API first
        await loadMentorAssignments();

        initializeMentorDashboard();
        handlePageLoadRouting();

        // Connect forms to their handler functions with error handling
        const officeHoursForm = document.getElementById('officeHoursForm');
        if (officeHoursForm) {
            officeHoursForm.addEventListener('submit', saveOfficeHours);
        }

        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', saveProfile);
        }

        const photoUploadInput = document.getElementById('photoUploadInput');
        if (photoUploadInput) {
            photoUploadInput.addEventListener('change', handlePhotoUpload);
        }

        const assignmentUploadForm = document.getElementById('assignmentUploadForm');
        if (assignmentUploadForm) {
            assignmentUploadForm.addEventListener('submit', handleAssignmentUpload);
        }

        const sessionCompletionForm = document.getElementById('sessionCompletionForm');
        const videoFileInput = document.getElementById('videoFile');
        const submitSessionBtn = document.getElementById('submitSessionBtn');
        const submitBtnText = document.getElementById('submitBtnText');

        if (videoFileInput && submitSessionBtn && submitBtnText && sessionCompletionForm) {
            // Disable submit button initially
            submitSessionBtn.disabled = true;
            submitBtnText.textContent = '🔹 Upload Video Required';

            // Initialize drag & drop functionality
            initializeDragDrop();

            // Enable submit button when a video file is selected
            videoFileInput.addEventListener('change', function() {
                if (videoFileInput.files.length > 0) {
                    const file = videoFileInput.files[0];
                    if (validateVideoFile(file)) {
                        submitSessionBtn.disabled = false;
                        submitBtnText.textContent = '🔹 Submit Session';
                        showVideoPreview(file);
                    }
                } else {
                    submitSessionBtn.disabled = true;
                    submitBtnText.textContent = '🔹 Upload Video Required';
                    hideVideoPreview();
                }
            });

            // Add a clear/remove button handler to allow changing the selected video file
            const clearVideoBtn = document.getElementById('clearVideoBtn');
            if (clearVideoBtn) {
                clearVideoBtn.addEventListener('click', function() {
                    hideVideoPreview();
                    // Disable submit button and update text
                    if (submitSessionBtn && submitBtnText) {
                        submitSessionBtn.disabled = true;
                        submitBtnText.textContent = '🔹 Upload Video Required';
                    }
                });
            }

            // Handle form submission with video upload
            sessionCompletionForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                if (!currentSessionData) {
                    alert('No session data available.');
                    return;
                }
                if (videoFileInput.files.length === 0) {
                    alert('Please select a video file to upload.');
                    return;
                }

                submitSessionBtn.disabled = true;
                submitBtnText.textContent = '⏳ Uploading...';
                updateUploadProgress(0);

                try {
                    const file = videoFileInput.files[0];
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('uploader_id', currentUser.id);
                    formData.append('role', 'mentor');
                    formData.append('session_id', currentSessionData.sessionId);
                    formData.append('student_id', currentSessionData.studentId);

                    // Use XMLHttpRequest for progress tracking
                    const xhr = new XMLHttpRequest();

                    xhr.upload.addEventListener('progress', function(e) {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 100;
                            updateUploadProgress(Math.round(percentComplete));
                        }
                    });

                    const uploadPromise = new Promise((resolve, reject) => {
                        xhr.onload = function() {
                            if (xhr.status === 200) {
                                try {
                                    const result = JSON.parse(xhr.responseText);
                                    resolve(result);
                                } catch (e) {
                                    reject(new Error('Invalid response format'));
                                }
                            } else {
                                reject(new Error(`Upload failed with status ${xhr.status}`));
                            }
                        };
                        xhr.onerror = function() {
                            reject(new Error('Network error during upload'));
                        };
                    });

                    xhr.open('POST', `http://127.0.0.1:8000/api/upload-session?role=mentor`);
                    xhr.send(formData);

                    const uploadResult = await uploadPromise;

                    if (!uploadResult.ok) {
                        throw new Error(uploadResult.message || 'Upload failed');
                    }

                    // After successful upload, submit session summary
                    const sessionSummary = document.getElementById('sessionSummary').value.trim();
                    const sessionOutcomes = document.getElementById('sessionOutcomes').value.trim();
                    const studentFeeling = document.getElementById('studentFeeling').value;

                    const completeResponse = await fetch('http://127.0.0.1:8000/api/complete-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            upload_id: uploadResult.upload_id,
                            session_summary: sessionSummary,
                            session_outcomes: sessionOutcomes,
                            student_feeling: studentFeeling
                        })
                    });

                    if (!completeResponse.ok) {
                        throw new Error(`Session completion failed with status ${completeResponse.status}`);
                    }

                    const completeResult = await completeResponse.json();

                    if (!completeResult.ok) {
                        throw new Error(completeResult.message || 'Session completion failed');
                    }

                    showToast(`Session for ${currentSessionData.studentName} has been marked as complete!`);

                    // Reset form and progress
                    submitSessionBtn.disabled = true;
                    submitBtnText.textContent = '🔹 Upload Video Required';
                    hideUploadProgress();
                    hideVideoPreview();

                } catch (error) {
                    showToast('Error during upload: ' + error.message);
                    submitSessionBtn.disabled = false;
                    submitBtnText.textContent = '🔹 Submit Session';
                    hideUploadProgress();
                }
            });
        }
        else if (sessionCompletionForm) {
            // Fallback: existing simple submit handler
            sessionCompletionForm.addEventListener('submit', function(e) {
                e.preventDefault();
                if (currentSessionData) {
                    alert('Session for ' + currentSessionData.studentName + ' has been marked as complete!');
                    closeModal('sessionCompletionModal');
                }
            });
        }

        // Load initial data
        loadMentorSchedule();
        loadAvailability();

        // Set up periodic refresh of mentor assignments (every 30 seconds)
        setInterval(async () => {
            await loadMentorAssignments();
            // Refresh mentees display if currently on mentees section
            const menteesSection = document.getElementById('mentor-mentees');
            if (menteesSection && menteesSection.classList.contains('active')) {
                loadMentorMentees();
            }
        }, 30000);

    } else {
        showToast("No user is logged in!");
        document.body.innerHTML = "<h1>Access Denied</h1>";
    }
});

/**
 * Populates the mentor dashboard with all dynamic data.
 */
function initializeMentorDashboard() {
    // Safely populate user info in navbar, sidebar, and welcome card
    const elements = {
        'mentorName': currentUser.name,
        'mentorSidebarName': currentUser.name,
        'mentorWelcome': `👋 Welcome back, ${currentUser.name}!`
    };

    Object.entries(elements).forEach(([id, content]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'mentorWelcome') {
                element.innerHTML = content;
            } else {
                element.textContent = content;
            }
        }
    });
    
    const menteeCount = mentorAssignments[currentUser.id]?.length || 0;
    const menteeCountElement = document.getElementById('mentor-mentee-count');
    if (menteeCountElement) {
        menteeCountElement.textContent = menteeCount;
    }

    // Populate the profile section with detailed user info
    const profileFields = {
        'profileName': currentUser.name,
        'profileId': currentUser.id,
        'profileSpecialization': currentUser.specialization,
        'profileEmail': currentUser.email,
        'profileHours': currentUser.officeHours
    };

    Object.entries(profileFields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        }
    });

    // Set avatar photo if it exists, otherwise set initials
    const savedPhoto = sessionStorage.getItem('mentorPhoto');
    if (savedPhoto) {
        setAvatarPhoto(savedPhoto);
    } else {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('');
        const mentorAvatar = document.getElementById('mentorAvatar');
        const profileAvatar = document.getElementById('profileAvatar');
        
        if (mentorAvatar) mentorAvatar.textContent = initials;
        if (profileAvatar) profileAvatar.textContent = initials;
    }

    // Populate dynamic sections
    populateMenteesDropdown();
}

// =================================================================
// ===== CORE FEATURES & DATA HANDLERS =====
// =================================================================

/**
 * Loads mentor assignments from the API and updates local data
 */
async function loadMentorAssignments() {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/mentor/assignments/${currentUser.id}`);
        const data = await response.json();

        if (data.ok && data.data) {
            // Update local mentorAssignments with API data
            mentorAssignments[currentUser.id] = data.data.map(student => student.id);

            // Update local studentsData with API data
            data.data.forEach(student => {
                studentsData[student.id] = {
                    name: student.name,
                    risk_score: student.risk_score,
                    attendance: student.attendance,
                    marks: student.marks,
                    backlogs: student.backlogs,
                    assignments_submitted: student.assignments_submitted
                };
            });

            console.log('Mentor assignments loaded from API:', mentorAssignments[currentUser.id]);
            return true;
        } else {
            console.warn('Failed to load mentor assignments from API, using fallback data');
            return false;
        }
    } catch (error) {
        console.error('Error loading mentor assignments:', error);
        return false;
    }
}

/**
 * Asynchronously loads and displays the list of assigned mentees.
 */
async function loadMentorMentees() {
    const tbody = document.querySelector('#mentorMenteesTable tbody');
    const priorityList = document.getElementById('priorityMenteeList');

    if (!tbody) {
        console.error('Mentees table body not found');
        return;
    }

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Loading mentees...</td></tr>';
    if (priorityList) {
        priorityList.innerHTML = '<p style="text-align: center; color: #718096;">Loading...</p>';
    }

    // Load assignments from API first
    const apiLoaded = await loadMentorAssignments();
    if (!apiLoaded) {
        showToast('Using local data - changes may not be reflected', 3000);
    }

    const mentees = mentorAssignments[currentUser.id] || [];

    tbody.innerHTML = '';
    if (priorityList) {
        priorityList.innerHTML = '';
    }

    if (mentees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No mentees assigned yet.</td></tr>';
        if (priorityList) {
            priorityList.innerHTML = '<p style="text-align: center; color: #718096;">No priority mentees.</p>';
        }
        return;
    }

    let hasPriorityMentees = false;
    mentees.sort((a, b) => (studentsData[b]?.risk_score || 0) - (studentsData[a]?.risk_score || 0));

    mentees.forEach(studentId => {
        const student = studentsData[studentId];
        if (!student) return;

        const riskLevel = student.risk_score > 70 ? 'High' : (student.risk_score > 40 ? 'Moderate' : 'Low');
        const riskBadgeClass = `risk-${riskLevel.toLowerCase()}`;
        const row = `
            <tr>
                <td><strong>${student.name} (${studentId})</strong></td>
                <td><span class="risk-badge ${riskBadgeClass}">${riskLevel.toUpperCase()}</span></td>
                <td>${new Date().toLocaleDateString()}</td>
                <td>${student.risk_score > 50 ? 'Needs Attention' : 'On Track'}</td>
                <td>
                    <button class="action-btn" onclick="openMessageModal('${studentId}')">💬 Message</button>
                    <button class="action-btn btn-schedule" onclick="openScheduleModal('${studentId}')">📅 Schedule</button>
                </td>
            </tr>`;
        tbody.insertAdjacentHTML('beforeend', row);

        if (student.risk_score > 40) {
            hasPriorityMentees = true;
            if (priorityList) {
                priorityList.innerHTML += `
                    <div class="priority-mentee-card">
                        <div class="mentee-info">
                            <h4>${student.name}</h4>
                            <span class="risk-badge ${riskBadgeClass}">${riskLevel.toUpperCase()}</span>
                        </div>
                        <div class="mentee-actions">
                            <button class="btn-small btn-message" onclick="openMessageModal('${studentId}')">Message</button>
                            <button class="btn-small btn-schedule" onclick="openScheduleModal('${studentId}')">Schedule</button>
                        </div>
                    </div>
                `;
            }
        }
    });

    if (!hasPriorityMentees && priorityList) {
        priorityList.innerHTML = '<p style="text-align: center; color: #718096;">No priority mentees.</p>';
    }
}

/**
 * Loads the history of assignments sent by the current mentor into its table.
 */
function loadAssignmentHistory() {
    console.log("Loading assignment history...");
    
    const tableBody = document.getElementById('assignmentHistoryTableBody');
    if (!tableBody) {
        console.error("Assignment history table body not found!");
        return;
    }
    
    const allAssignments = JSON.parse(localStorage.getItem('assignments')) || [];
    console.log("All assignments from localStorage:", allAssignments);
    
    // Filter assignments by current mentor (check both mentorName and mentorId)
    const mySentAssignments = allAssignments.filter(asg => {
        const matchByName = asg.mentorName === currentUser.name;
        const matchById = asg.mentorId === currentUser.id;
        console.log(`Assignment ${asg.id}: mentorName=${asg.mentorName}, mentorId=${asg.mentorId}, matchByName=${matchByName}, matchById=${matchById}`);
        return matchByName || matchById;
    });
    
    console.log("Filtered assignments for current mentor:", mySentAssignments);

    tableBody.innerHTML = '';

    if (mySentAssignments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding: 2rem;">
                    <div style="color: #6b7280;">
                        <p>You have not assigned any tasks yet.</p>
                        <small>Current Mentor: ${currentUser.name} (${currentUser.id})</small><br>
                        <small>Total assignments in system: ${allAssignments.length}</small><br>
                        <button onclick="debugAssignments()" style="margin-top: 10px; padding: 5px 10px;">Debug Info</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by most recent first
    mySentAssignments.sort((a, b) => new Date(b.assignedOn) - new Date(a.assignedOn));

    mySentAssignments.forEach(asg => {
        // Find student name
        const student = studentsData[asg.studentId];
        const studentName = student ? student.name : `Unknown Student (${asg.studentId})`;
        
        // Format due date
        const dueDate = new Date(asg.dueDate).toLocaleDateString("en-IN", { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
        
        const row = `
            <tr>
                <td>${studentName}</td>
                <td><strong>${asg.title}</strong></td>
                <td>${dueDate}</td>
                <td><span class="assignment-status ${asg.status.toLowerCase()}">${asg.status}</span></td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
    
    console.log("Assignment history loaded successfully");
}

/**
 * Populates the mentee selection dropdown in the assignment form.
 */
function populateMenteesDropdown() {
    const selectElement = document.getElementById('assignmentMenteeSelect');
    if (!selectElement) return;

    // Clear existing options except first 2 (placeholders)
    while (selectElement.options.length > 2) {
        selectElement.remove(2);
    }
    
    const assignedMentees = mentorAssignments[currentUser.id] || [];
    assignedMentees.forEach(studentId => {
        const student = studentsData[studentId];
        if (student) {
            const option = new Option(`${student.name} (${studentId})`, studentId);
            selectElement.add(option);
        }
    });
}

/**
 * UPDATED handleAssignmentUpload function with proper video upload integration
 */
async function handleAssignmentUpload(event) {
    event.preventDefault();
    console.log("Assignment form submitted...");

    const menteeId = document.getElementById('assignmentMenteeSelect')?.value;
    const title = document.getElementById('assignmentTitle')?.value;
    const instructions = document.getElementById('assignmentInstructions')?.value;
    const dueDate = document.getElementById('assignmentDueDate')?.value;
    const fileInput = document.getElementById('assignmentFile');
    const file = fileInput?.files[0];

    // --- Validation ---
    if (!menteeId) {
    showToast('Please select a mentee.');
    return;
    }
    if (!title || !title.trim()) {
    showToast('Please provide an assignment title.');
    return;
    }
    if (!dueDate) {
    showToast('Please set a due date.');
    return;
    }
    if (!file) {
    showToast('Please select a file to assign.');
    return;
    }

    try {
        console.log("Processing file:", file.name, "Size:", file.size, "bytes");

        // Get file extension to determine file type
        const fileExt = file.name.split('.').pop().toLowerCase();
        const videoExtensions = ['mp4', 'mov', 'avi', 'mkv'];
        const assignmentExtensions = ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'txt'];

        // Check if file type is supported
        if (!videoExtensions.includes(fileExt) && !assignmentExtensions.includes(fileExt)) {
            showToast('Unsupported file type. Please upload videos (mp4, mov, avi, mkv) or documents (pdf, doc, docx, xlsx, xls, txt).');
            return;
        }

        let success = false;
        let uploadResponse = null;

        if (videoExtensions.includes(fileExt)) {
            // Handle video file upload using the session upload API
            console.log("Video file detected, uploading to session endpoint");
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('uploader_id', currentUser.id);

            try {
                const response = await fetch(`http://127.0.0.1:8000/api/upload-session?role=mentor`, {
                    method: 'POST',
                    body: formData
                });

                uploadResponse = await response.json();
                
                if (uploadResponse.ok) {
                    console.log("Video uploaded successfully:", uploadResponse);
                    
                    // Create a local assignment record that references the uploaded video
                    const localAssignment = {
                        id: `VID_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        studentId: menteeId.toUpperCase().trim(),
                        mentorName: currentUser.name,
                        mentorId: currentUser.id,
                        title: title.trim(),
                        instructions: instructions.trim(),
                        dueDate: dueDate,
                        assignedOn: new Date().toISOString(),
                        status: 'Pending',
                        fileName: file.name,
                        fileType: 'video',
                        uploadId: uploadResponse.upload_id,
                        filePath: uploadResponse.path
                    };

                    // Save to localStorage for local tracking
                    let allAssignments = JSON.parse(localStorage.getItem('assignments')) || [];
                    allAssignments.push(localAssignment);
                    localStorage.setItem('assignments', JSON.stringify(allAssignments));
                    
                    success = true;
                    
                } else {
                    throw new Error(uploadResponse.message || 'Video upload failed');
                }
                
            } catch (error) {
                console.error('Video upload error:', error);
                showToast('Failed to upload video: ' + error.message);
                return;
            }
            
        } else {
            // Handle document file upload using the assignment upload API
            console.log("Document file detected, uploading to assignment endpoint");
            
            const formData = new FormData();
            formData.append('mentor_id', currentUser.id);
            formData.append('student_id', menteeId);
            formData.append('title', title.trim());
            formData.append('description', instructions.trim());
            formData.append('due_date', dueDate);
            formData.append('file', file);

            try {
                const response = await fetch('http://127.0.0.1:8000/api/upload-assignment', {
                    method: 'POST',
                    body: formData
                });

                uploadResponse = await response.json();
                
                if (uploadResponse.ok) {
                    console.log("Assignment uploaded successfully:", uploadResponse);
                    
                    // Create a local assignment record that references the uploaded assignment
                    const localAssignment = {
                        id: uploadResponse.assignment_id,
                        studentId: menteeId.toUpperCase().trim(),
                        mentorName: currentUser.name,
                        mentorId: currentUser.id,
                        title: title.trim(),
                        instructions: instructions.trim(),
                        dueDate: dueDate,
                        assignedOn: new Date().toISOString(),
                        status: 'Pending',
                        fileName: file.name,
                        fileType: 'document',
                        assignmentId: uploadResponse.assignment_id
                    };

                    // Save to localStorage for local tracking
                    let allAssignments = JSON.parse(localStorage.getItem('assignments')) || [];
                    allAssignments.push(localAssignment);
                    localStorage.setItem('assignments', JSON.stringify(allAssignments));
                    
                    success = true;
                    
                } else {
                    throw new Error(uploadResponse.message || 'Assignment upload failed');
                }
                
            } catch (error) {
                console.error('Assignment upload error:', error);
                showToast('Failed to upload assignment: ' + error.message);
                return;
            }
        }

        if (success) {
            const fileTypeText = videoExtensions.includes(fileExt) ? 'video session' : 'assignment document';
            showToast(`✅ ${fileTypeText.charAt(0).toUpperCase() + fileTypeText.slice(1)} "${title}" uploaded successfully and tracked in the system!`);
            event.target.reset(); // Clear the form
            loadAssignmentHistory(); // Refresh the history table
        }

    } catch (error) {
        console.error('Error processing file upload:', error);
        alert('There was an error processing the file. Please try again.');
    }
}

function saveProfile(event) {
    event.preventDefault();
    
    const newSpecialization = document.getElementById('profileSpecialization')?.value;
    const newEmail = document.getElementById('profileEmail')?.value;
    const newHours = document.getElementById('profileHours')?.value;

    if (newSpecialization !== undefined) currentUser.specialization = newSpecialization;
    if (newEmail !== undefined) currentUser.email = newEmail;
    if (newHours !== undefined) currentUser.officeHours = newHours;

    // Update the global credentials object
    if (validCredentials[currentUser.id]) {
        if (newSpecialization !== undefined) validCredentials[currentUser.id].specialization = newSpecialization;
        if (newEmail !== undefined) validCredentials[currentUser.id].email = newEmail;
        if (newHours !== undefined) validCredentials[currentUser.id].officeHours = newHours;
    }

    showToast('Profile updated successfully!');
}

/**
 * Triggers the hidden file input for photo upload.
 */
function triggerPhotoUpload() {
    const photoInput = document.getElementById('photoUploadInput');
    if (photoInput) {
        photoInput.click();
    }
}

/**
 * Handles the file selection, reads the image, and updates the avatars.
 */
function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file.');
        return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image file is too large. Please select an image smaller than 5MB.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const imageDataUrl = e.target.result;
        sessionStorage.setItem('mentorPhoto', imageDataUrl);
        setAvatarPhoto(imageDataUrl);
    };
    reader.onerror = function() {
        showToast('Error reading the image file. Please try again.');
    };
    reader.readAsDataURL(file);
}

/**
 * A helper function to apply a new photo to all avatar displays.
 */
function setAvatarPhoto(imageDataUrl) {
    const avatars = [document.getElementById('mentorAvatar'), document.getElementById('profileAvatar')];
    avatars.forEach(el => {
        if(el) {
            el.textContent = '';
            el.style.backgroundImage = `url(${imageDataUrl})`;
            el.style.backgroundSize = 'cover';
            el.style.backgroundPosition = 'center';
            el.classList.add('has-photo');
        }
    });
}

// =================================================================
// ===== SESSION & SCHEDULE MANAGEMENT =====
// =================================================================

/**
 * Opens the session completion modal with relevant details.
 */
function completeSession(sessionId, studentId, studentName) {
    currentSessionData = { sessionId, studentId, studentName };
    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const sessionDetails = document.getElementById('sessionDetails');
    if (sessionDetails) {
        sessionDetails.innerHTML = `
            <strong>Session ID:</strong> ${sessionId}<br>
            <strong>Student:</strong> ${studentName}<br>
            <strong>Date:</strong> ${formattedDate}<br>
            <strong>Time:</strong> ${formattedTime}`;
    }

    openModal('sessionCompletionModal');
}

/**
 * Opens the modal for managing the mentor's full schedule.
 */
function openManageScheduleModal() {
    openModal('manageScheduleModal');
}

/**
 * Opens the modal for updating office hours.
 */
function openUpdateHoursModal() {
    openModal('updateHoursModal');
}

/**
 * Saves the updated office hours.
 */
function saveOfficeHours(event) {
    event.preventDefault();
    const hoursInput = document.getElementById('officeHoursText');
    const hours = hoursInput?.value;
    
    if (hours) {
        currentUser.officeHours = hours;
        if (validCredentials[currentUser.id]) {
            validCredentials[currentUser.id].officeHours = hours;
        }
        showToast(`Your office hours have been updated to:\n"${hours}"`);
        closeModal('updateHoursModal');
    }
}

/**
 * Edit a session - opens modal to modify session details.
 */
function editSession(sessionId) {
    // Find session details from schedule data
    const session = findSessionById(sessionId);
    if (!session) {
        showToast('Session not found!');
        return;
    }

    // Pre-fill edit modal with current session data
    const editModal = document.getElementById('editSessionModal');
    if (!editModal) {
        createEditSessionModal();
    }

    document.getElementById('editSessionId').value = sessionId;
    document.getElementById('editStudentName').value = session.studentName;
    document.getElementById('editSessionTime').value = session.time;
    document.getElementById('editSessionTopic').value = session.topic;

    openModal('editSessionModal');
}

/**
 * Cancel a session with confirmation and API call.
 */
function cancelSession(sessionId) {
    if (confirm(`Are you sure you want to cancel session ${sessionId}? This action cannot be undone.`)) {
        // Call API to cancel session
        cancelSessionAPI(sessionId);
    }
}

/**
 * API call to cancel a session
 */
async function cancelSessionAPI(sessionId) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/mentor/cancel-session/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mentorId: currentUser.id })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            showToast(`Session ${sessionId} has been canceled successfully.`);
            closeModal('manageScheduleModal');
            // Refresh schedule
            loadMentorSchedule();
        } else {
            throw new Error(result.message || 'Failed to cancel session');
        }
    } catch (error) {
        console.error('Error canceling session:', error);
        showToast('Error canceling session: ' + error.message);
    }
}

/**
 * Find session by ID from current schedule
 */
function findSessionById(sessionId) {
    // This would typically come from your schedule data
    // For now, return mock data - replace with actual data source
    const mockSessions = [
        { sessionId: 'session1', studentId: 'S0001', studentName: 'John Doe', time: '2:00 PM - 3:00 PM', topic: 'Study Skills' },
        { sessionId: 'session2', studentId: 'S0002', studentName: 'Jane Smith', time: '3:30 PM - 4:30 PM', topic: 'Academic Planning' }
    ];

    return mockSessions.find(session => session.sessionId === sessionId);
}

/**
 * Create the edit session modal dynamically
 */
function createEditSessionModal() {
    const modalHTML = `
        <div id="editSessionModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Session</h3>
                    <span class="close" onclick="closeModal('editSessionModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="editSessionForm">
                        <input type="hidden" id="editSessionId" name="sessionId">

                        <div class="form-group">
                            <label for="editStudentName">Student Name:</label>
                            <input type="text" id="editStudentName" name="studentName" readonly>
                        </div>

                        <div class="form-group">
                            <label for="editSessionTime">Session Time:</label>
                            <input type="text" id="editSessionTime" name="sessionTime" required>
                        </div>

                        <div class="form-group">
                            <label for="editSessionTopic">Topic:</label>
                            <input type="text" id="editSessionTopic" name="sessionTopic" required>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="closeModal('editSessionModal')">Cancel</button>
                            <button type="submit" class="btn-primary">Update Session</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add form submit handler
    document.getElementById('editSessionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateSession();
    });
}

/**
 * Update session with new details
 */
async function updateSession() {
    const sessionId = document.getElementById('editSessionId').value;
    const sessionTime = document.getElementById('editSessionTime').value;
    const sessionTopic = document.getElementById('editSessionTopic').value;

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/mentor/update-session/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mentorId: currentUser.id,
                sessionTime: sessionTime,
                sessionTopic: sessionTopic
            })
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            showToast('Session updated successfully!');
            closeModal('editSessionModal');
            loadMentorSchedule(); // Refresh schedule
        } else {
            throw new Error(result.message || 'Failed to update session');
        }
    } catch (error) {
        console.error('Error updating session:', error);
        showToast('Error updating session: ' + error.message);
    }
}

// =================================================================
// ===== AVAILABILITY DRAWER =====
// =================================================================

/**
 * Opens the availability drawer.
 */
function openAvailabilityDrawer() {
    const drawer = document.getElementById('availabilityDrawer');
    if (drawer) {
        drawer.classList.add('show');
        renderAvailabilityList();
    }
}

/**
 * Closes the availability drawer.
 */
function closeAvailabilityDrawer() {
    const drawer = document.getElementById('availabilityDrawer');
    if (drawer) {
        drawer.classList.remove('show');
    }
}

/**
 * Renders the list of counselors/mentors in the availability drawer.
 */
function renderAvailabilityList(filteredData = availabilityData) {
    const container = document.getElementById('availabilityList');
    if (!container) return;

    container.innerHTML = '';
    
    if (filteredData.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #718096;">No available counselors match your criteria.</p>';
        return;
    }

    filteredData.forEach(person => {
        const statusClass = person.status === 'available' ? 'available' : 'busy';
        const statusIcon = person.status === 'available' ? '🟢' : '🔴';
        
        container.innerHTML += `
            <div class="availability-card ${statusClass}">
                <div class="counselor-info">
                    <h4>${person.name} ${statusIcon}</h4>
                    <p><strong>Status:</strong> ${person.status}</p>
                    <p><strong>Skills:</strong> ${person.skills.join(", ")}</p>
                </div>
                <div class="counselor-actions">
                    <button class="btn-small" ${person.status !== 'available' ? 'disabled' : ''}>
                        Contact
                    </button>
                </div>
            </div>
        `;
    });
}

/**
 * Filters the availability list based on selected criteria.
 */
function filterAvailability() {
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const skillFilter = document.getElementById('skillFilter')?.value || 'all';
    
    let filteredData = [...availabilityData];
    
    if (statusFilter !== 'all') {
        filteredData = filteredData.filter(person => person.status === statusFilter);
    }
    
    if (skillFilter !== 'all') {
        filteredData = filteredData.filter(person => 
            person.skills.some(skill => skill.toLowerCase().includes(skillFilter.toLowerCase()))
        );
    }
    
    renderAvailabilityList(filteredData);
}

// =================================================================
// ===== GENERAL UI & NAVIGATION =====
// =================================================================

/**
 * Shows a specific section of the dashboard and hides others.
 */
function showSection(event, type, sectionName) {
    // Update sidebar active state
    const sidebarItems = document.querySelectorAll(`#${type}Sidebar .menu-item`);
    sidebarItems.forEach(item => item.classList.remove('active'));
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // Update content sections
    const sections = document.querySelectorAll(`#${type}Dashboard .section`);
    sections.forEach(sec => sec.classList.remove('active'));
    
    const targetSection = document.getElementById(`${type}-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Update page title
    const pageTitle = document.getElementById(`${type}PageTitle`);
    if (pageTitle && event && event.currentTarget) {
        const menuText = event.currentTarget.querySelector('.menu-item-text');
        if (menuText) {
            pageTitle.textContent = menuText.textContent;
        }
    }
    
    // Run section-specific functions
    if (type === 'mentor' && sectionName === 'mentees') {
        loadMentorMentees();
        loadAssignmentHistory();
    }
    
    // Update URL hash
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
 * Toggles the sidebar between collapsed and expanded states.
 */
function toggleSidebar(type) {
    const sidebar = document.getElementById(`${type}Sidebar`);
    const mainContent = document.getElementById(`${type}MainContent`);
    
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (mainContent) mainContent.classList.toggle('expanded');
}

/**
 * Opens a modal dialog.
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.add('show');
        // Add escape key listener
        document.addEventListener('keydown', handleModalEscape);
    }
}

/**
 * Closes a modal dialog.
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if(modal) {
        modal.classList.remove('show');
        // Remove escape key listener
        document.removeEventListener('keydown', handleModalEscape);
    }
}

/**
 * Handle escape key to close modals
 */
function handleModalEscape(event) {
    if (event.key === 'Escape') {
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            openModal.classList.remove('show');
            document.removeEventListener('keydown', handleModalEscape);
        }
    }
}

/**
 * Opens the scheduling modal.
 */
function openScheduleModal(studentId) {
    const student = studentsData[studentId];
    if (student) {
        // Pre-fill any necessary information
        console.log(`Opening schedule modal for ${student.name}`);
    }
    openModal('scheduleModal');
}

/**
 * Opens the message modal.
 */
function openMessageModal(studentId) {
    const student = studentsData[studentId];
    const messageSubject = document.getElementById('messageSubject');
    const messageBody = document.getElementById('messageBody');
    const messageForm = document.getElementById('messageForm');

    if (student && messageSubject && messageBody && messageForm) {
        messageSubject.value = `Follow-up for ${student.name}`;
        messageBody.value = '';

        // Remove any existing submit event listeners to avoid duplicates
        const newForm = messageForm.cloneNode(true);
        messageForm.parentNode.replaceChild(newForm, messageForm);

        newForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const subject = messageSubject.value.trim();
            const body = messageBody.value.trim();

            if (!subject || !body) {
        showToast('Please fill in both subject and message body.');
        return;
            }

            // Prepare message payload
            const payload = {
                toStudentId: studentId,
                fromMentorId: currentUser.id,
                subject: subject,
                body: body,
                timestamp: new Date().toISOString()
            };

            try {
                // Send message to backend API
                const response = await fetch('http://127.0.0.1:8000/api/mentor/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();

                if (response.ok && result.ok) {
                    showToast('Message sent successfully.');
                    closeModal('messageModal');
                } else {
                    throw new Error(result.message || 'Failed to send message.');
                }
            } catch (error) {
                console.error('Error sending message:', error);
                showToast('Error sending message: ' + error.message + '\nMessage saved locally.');

                // Fallback: Save message locally in localStorage
                let localMessages = JSON.parse(localStorage.getItem('mentorMessages')) || [];
                localMessages.push(payload);
                localStorage.setItem('mentorMessages', JSON.stringify(localMessages));
                closeModal('messageModal');
            }
        });

        openModal('messageModal');
    }
}

/**
 * Logs the user out by clearing session storage and redirecting.
 */
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('mentorPhoto');
        // Clear any other session data
        sessionStorage.clear();
        window.location.href = '../login/login.html';
    }
}

// =================================================================
// ===== DEBUG AND TESTING FUNCTIONS =====
// =================================================================

/**
 * Debug function to check localStorage assignments
 */
function debugAssignments() {
    console.log("=== ASSIGNMENT DEBUG INFO ===");
    
    // Check current user
    console.log("Current User:", currentUser);
    
    // Check localStorage assignments
    const allAssignments = JSON.parse(localStorage.getItem('assignments')) || [];
    console.log("All assignments in localStorage:", allAssignments);
    console.log("Total assignments:", allAssignments.length);
    
    // Check assignments by current mentor
    const myAssignments = allAssignments.filter(asg => 
        asg.mentorName === currentUser.name || asg.mentorId === currentUser.id
    );
    console.log("My assignments:", myAssignments);
    console.log("My assignments count:", myAssignments.length);
    
    // Check mentor assignments mapping
    console.log("Mentor assignments mapping:", mentorAssignments);
    console.log("My mentees:", mentorAssignments[currentUser.id]);
    
    console.log("==============================");
    
    // Show in alert too
    alert(`Debug Info:
- Total assignments: ${allAssignments.length}
- Your assignments: ${myAssignments.length}
- Your mentees: ${mentorAssignments[currentUser.id]?.length || 0}
Check console for detailed info`);
}





/**
 * Create test assignments to verify the system
 */
function createTestAssignment() {
    console.log("Creating test assignments...");

    try {
        // --- Step 1: Create document assignment ---
        const testDocAssignment = {
            id: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            studentId: 'S0001', // John Doe
            mentorName: currentUser.name,
            mentorId: currentUser.id,
            title: 'Test Assignment - ' + new Date().toLocaleTimeString(),
            instructions: 'This is a test assignment for verification purposes.',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
            assignedOn: new Date().toISOString(),
            status: 'Pending',
            fileName: 'Test_Assignment.txt',
            fileType: 'document',
            fileDataBase64: null
        };

        // --- Step 2: Create test video assignment ---
        const testVideoAssignment = {
            id: `VID_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            studentId: 'S0001', 
            mentorName: currentUser.name,
            mentorId: currentUser.id,
            title: 'Test Video Session - ' + new Date().toLocaleTimeString(),
            instructions: 'This is a simulated video session upload.',
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            assignedOn: new Date().toISOString(),
            status: 'Pending',
            fileName: 'Test_Video.mp4',
            fileType: 'video',
            uploadId: `UPLOAD_${Date.now()}`,   // fake upload ID
            filePath: '/mock/path/Test_Video.mp4' // fake path
        };

        // --- Step 3: Save both assignments to localStorage ---
        let allAssignments = JSON.parse(localStorage.getItem('assignments')) || [];
        allAssignments.push(testDocAssignment, testVideoAssignment);
        localStorage.setItem('assignments', JSON.stringify(allAssignments));

        const studentName = studentsData['S0001']?.name || 'Unknown Student';
        alert(`✅ Test assignments created for student ${studentName}.\n- Document assignment\n- Video assignment\n\nCheck the assignment history to see them.`);
        loadAssignmentHistory(); // Refresh the history table

        console.log("Test document assignment saved:", testDocAssignment);
        console.log("Test video assignment saved:", testVideoAssignment);

    } catch (error) {
        console.error("Error creating test assignments:", error);
        alert('Failed to create test assignments: ' + error.message);
    }
}

/**
 * Clear all assignments from localStorage (for testing)
 */
function clearAllAssignments() {
    if (confirm('Are you sure you want to clear ALL assignments? This cannot be undone.')) {
        localStorage.removeItem('assignments');
        alert('All assignments have been cleared.');
        loadAssignmentHistory();
    }
}

/**
 * Export assignments to JSON file
 */
function exportAssignments() {
    const assignments = JSON.parse(localStorage.getItem('assignments')) || [];
    const dataStr = JSON.stringify(assignments, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `assignments_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(link.href);
}

/**
 * Export assignments to Excel format
 */
function exportAssignmentsToExcel() {
    const assignments = JSON.parse(localStorage.getItem('assignments')) || [];

    if (assignments.length === 0) {
        alert('No assignments to export.');
        return;
    }

    // Filter assignments by current mentor
    const myAssignments = assignments.filter(asg =>
        asg.mentorName === currentUser.name || asg.mentorId === currentUser.id
    );

    if (myAssignments.length === 0) {
        alert('No assignments found for current mentor.');
        return;
    }

    // Prepare data for Excel
    const excelData = myAssignments.map(asg => ({
        'Assignment ID': asg.id,
        'Student Name': studentsData[asg.studentId]?.name || 'Unknown',
        'Student ID': asg.studentId,
        'Title': asg.title,
        'Instructions': asg.instructions,
        'Due Date': new Date(asg.dueDate).toLocaleDateString(),
        'Assigned On': new Date(asg.assignedOn).toLocaleDateString(),
        'Status': asg.status,
        'File Name': asg.fileName || 'N/A',
        'File Type': asg.fileType || 'N/A'
    }));

    // Create CSV content
    const headers = Object.keys(excelData[0]);
    const csvContent = [
        headers.join(','),
        ...excelData.map(row =>
            headers.map(header => `"${row[header]}"`).join(',')
        )
    ].join('\n');

    // Download as CSV (Excel compatible)
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mentor_assignments_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
    alert(`Exported ${myAssignments.length} assignments to Excel format.`);
}

/**
 * Export mentee data to Excel format
 */
function exportMenteesToExcel() {
    const mentees = mentorAssignments[currentUser.id] || [];

    if (mentees.length === 0) {
        showToast('No mentees assigned to export.');
        return;
    }

    // Prepare data for Excel
    const excelData = mentees.map(studentId => {
        const student = studentsData[studentId];
        if (!student) return null;

        return {
            'Student ID': studentId,
            'Name': student.name,
            'Risk Score': student.risk_score,
            'Risk Level': student.risk_score > 70 ? 'High' : (student.risk_score > 40 ? 'Moderate' : 'Low'),
            'Attendance': student.attendance || 'N/A',
            'Marks': student.marks || 'N/A',
            'Backlogs': student.backlogs || 'N/A',
            'Assignments Submitted': student.assignments_submitted || 'N/A',
            'Last Updated': new Date().toLocaleDateString()
        };
    }).filter(row => row !== null);

    if (excelData.length === 0) {
        showToast('No valid mentee data to export.');
        return;
    }

    // Create CSV content
    const headers = Object.keys(excelData[0]);
    const csvContent = [
        headers.join(','),
        ...excelData.map(row =>
            headers.map(header => `"${row[header]}"`).join(',')
        )
    ].join('\n');

    // Download as CSV (Excel compatible)
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mentor_mentees_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
    alert(`Exported ${excelData.length} mentees to Excel format.`);
}

/**
 * Export session data to Excel format
 */
function exportSessionsToExcel() {
    // This would typically come from API, but for now use mock data
    const mockSessions = [
        { sessionId: 'session1', studentId: 'S0001', studentName: 'John Doe', time: '2:00 PM - 3:00 PM', topic: 'Study Skills', date: '2024-03-15', status: 'Completed' },
        { sessionId: 'session2', studentId: 'S0002', studentName: 'Jane Smith', time: '3:30 PM - 4:30 PM', topic: 'Academic Planning', date: '2024-03-16', status: 'Scheduled' }
    ];

    if (mockSessions.length === 0) {
        showToast('No session data to export.');
        return;
    }

    // Prepare data for Excel
    const excelData = mockSessions.map(session => ({
        'Session ID': session.sessionId,
        'Student Name': session.studentName,
        'Student ID': session.studentId,
        'Date': session.date,
        'Time': session.time,
        'Topic': session.topic,
        'Status': session.status,
        'Mentor': currentUser.name
    }));

    // Create CSV content
    const headers = Object.keys(excelData[0]);
    const csvContent = [
        headers.join(','),
        ...excelData.map(row =>
            headers.map(header => `"${row[header]}"`).join(',')
        )
    ].join('\n');

    // Download as CSV (Excel compatible)
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `mentor_sessions_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
        showToast(`Exported ${excelData.length} sessions to Excel format.`);
}

// =================================================================
// ===== ENHANCED VIDEO UPLOAD FUNCTIONS =====
// =================================================================

/**
 * Initializes drag & drop functionality for video upload
 */
function initializeDragDrop() {
    const dropZone = document.getElementById('uploadDropZone');
    const fileInput = document.getElementById('videoFile');
    const uploadButton = document.getElementById('uploadButton');

    if (!dropZone || !fileInput) return;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);

    // Handle browse button click
    if (uploadButton) {
        uploadButton.addEventListener('click', () => fileInput.click());
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropZone.classList.add('drag-over');
    }

    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            const file = files[0];
            if (validateVideoFile(file)) {
                // Set the file to the input
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;

                // Trigger change event
                const event = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(event);
            }
        }
    }
}

/**
 * Validates video file type and size
 * @param {File} file - The file to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateVideoFile(file) {
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/mkv', 'video/quicktime'];
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (!allowedTypes.includes(file.type)) {
        showUploadError('Please select a valid video file (MP4, MOV, AVI, MKV).');
        return false;
    }

    if (file.size > maxSize) {
        showUploadError('File size must be less than 500MB.');
        return false;
    }

    return true;
}

/**
 * Shows upload error message
 * @param {string} message - Error message to display
 */
function showUploadError(message) {
    const errorElement = document.getElementById('uploadError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

/**
 * Shows the video preview section with file details after file selection.
 * @param {File} file - The selected video file.
 */
function showVideoPreview(file) {
    const uploadSection = document.getElementById('videoUploadSection');
    const previewSection = document.getElementById('videoPreviewSection');
    const uploadedFileName = document.getElementById('uploadedFileName');
    const uploadedFileSize = document.getElementById('uploadedFileSize');
    const uploadTimestamp = document.getElementById('uploadTimestamp');
    const videoSource = document.getElementById('videoSource');
    const uploadedVideoPlayer = document.getElementById('uploadedVideoPlayer');

    if (!uploadSection || !previewSection || !uploadedFileName || !uploadedFileSize || !uploadTimestamp || !videoSource || !uploadedVideoPlayer) {
        console.warn('Video preview elements not found');
        return;
    }

    // Hide upload prompt section
    uploadSection.style.display = 'none';

    // Show preview section
    previewSection.style.display = 'block';

    // Update file name and size
    uploadedFileName.textContent = file.name;
    uploadedFileSize.textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    // Update upload timestamp
    const now = new Date();
    uploadTimestamp.textContent = now.toLocaleString();

    // Set video source to selected file
    const fileURL = URL.createObjectURL(file);
    videoSource.src = fileURL;
    uploadedVideoPlayer.load();

    // Reset video duration and resolution display until metadata is loaded
    const videoDuration = document.getElementById('videoDuration');
    const videoResolution = document.getElementById('videoResolution');
    if (videoDuration) videoDuration.textContent = 'Duration: --:--';
    if (videoResolution) videoResolution.textContent = 'Resolution: ---';

    // Listen for metadata loaded to update duration and resolution
    uploadedVideoPlayer.onloadedmetadata = function() {
        if (videoDuration) {
            const duration = uploadedVideoPlayer.duration;
            const minutes = Math.floor(duration / 60);
            const seconds = Math.floor(duration % 60);
            videoDuration.textContent = `Duration: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        if (videoResolution) {
            videoResolution.textContent = `Resolution: ${uploadedVideoPlayer.videoWidth}x${uploadedVideoPlayer.videoHeight}`;
        }
    };
}

/**
 * Hides the video preview section and resets the upload UI.
 */
function hideVideoPreview() {
    const uploadSection = document.getElementById('videoUploadSection');
    const previewSection = document.getElementById('videoPreviewSection');
    const videoSource = document.getElementById('videoSource');
    const uploadedVideoPlayer = document.getElementById('uploadedVideoPlayer');
    const videoFileInput = document.getElementById('videoFile');

    if (!uploadSection || !previewSection || !videoSource || !uploadedVideoPlayer || !videoFileInput) {
        return;
    }

    // Clear the file input value to allow re-selection of the same file if needed
    videoFileInput.value = '';

    // Show upload prompt section
    uploadSection.style.display = 'block';

    // Hide preview section
    previewSection.style.display = 'none';

    // Clear video source
    videoSource.src = '';
    uploadedVideoPlayer.load();
}

/**
 * Updates upload progress display
 * @param {number} percent - Upload percentage (0-100)
 * @param {string} speed - Upload speed
 * @param {string} eta - Estimated time remaining
 */
function updateUploadProgress(percent, speed = '', eta = '') {
    const progressSection = document.getElementById('uploadProgressSection');
    const progressFill = document.getElementById('progressFill');
    const progressFilename = document.getElementById('progressFilename');
    const progressPercentage = document.getElementById('progressPercentage');
    const progressSpeed = document.getElementById('progressSpeed');
    const progressETA = document.getElementById('progressETA');

    if (progressSection) progressSection.style.display = 'block';
    if (progressFill) progressFill.style.width = percent + '%';
    if (progressPercentage) progressPercentage.textContent = percent + '%';

    const videoFileInput = document.getElementById('videoFile');
    if (progressFilename && videoFileInput && videoFileInput.files.length > 0) {
        progressFilename.textContent = videoFileInput.files[0].name;
    }

    if (progressSpeed && speed) progressSpeed.textContent = speed;
    if (progressETA && eta) progressETA.textContent = eta;
}

/**
 * Hides upload progress display
 */
function hideUploadProgress() {
    const progressSection = document.getElementById('uploadProgressSection');
    if (progressSection) progressSection.style.display = 'none';
}

// =================================================================
// ===== UTILITY FUNCTIONS =====
// =================================================================

/**
 * Format date for display
 */
function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

/**
 * Format time for display
 */
function formatTime(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Invalid Time';
    }
}

/**
 * Sanitize HTML to prevent XSS
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Show loading state
 */
function showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="loading-state">${message}</div>`;
    }
}

/**
 * Hide loading state and show content
 */
function hideLoading(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = content;
    }
}

// =================================================================
// ===== ERROR HANDLING =====
// =================================================================

/**
 * Global error handler
 */
window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    // You could send this to a logging service
});

/**
 * Handle unhandled promise rejections
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // You could send this to a logging service
});

// =================================================================
// ===== INITIALIZATION COMPLETE =====
// =================================================================

// -----------------------------
// Demo fallback data (kept for offline/testing)
// -----------------------------
const DEMO_SUPERVISION_VIDEOS = [
    {
        id: 'vid_001',
        mentorId: 'M001',
        mentorName: 'Dr. Sarah Johnson',
        studentId: 'S0001',
        studentName: 'John Doe',
        uploadDate: '2024-03-15',
        duration: '45:30',
        status: 'pending',
        priority: 'high',
        sessionType: 'Individual Counseling',
        notes: 'Student showing signs of academic stress. Discussed coping strategies.',
        videoUrl: null,
        thumbnailUrl: null,
        reviewNotes: ''
    },
    {
        id: 'vid_002',
        mentorId: 'M002',
        mentorName: 'Prof. Robert Wilson',
        studentId: 'S0002',
        studentName: 'Jane Smith',
        uploadDate: '2024-03-14',
        duration: '32:15',
        status: 'reviewed',
        priority: 'medium',
        sessionType: 'Career Guidance',
        notes: 'Great session on career path planning. Student very engaged.',
        videoUrl: null,
        thumbnailUrl: null,
        reviewNotes: 'Excellent mentoring approach. Student showed positive engagement.'
    },
    {
        id: 'vid_003',
        mentorId: 'C010',
        mentorName: 'Dr. Maria Lopez',
        studentId: 'S0003',
        studentName: 'Mike Johnson',
        uploadDate: '2024-03-13',
        duration: '28:45',
        status: 'flagged',
        priority: 'high',
        sessionType: 'Mental Health Support',
        notes: 'Student discussed anxiety issues. Follow-up required.',
        videoUrl: null,
        thumbnailUrl: null,
        reviewNotes: 'Flagged for review - requires supervisor attention.'
    }
];

// -----------------------------
// Runtime (dynamic) variables
// -----------------------------
let supervisionVideos = [];
let currentVideoId = null;
let filteredVideos = [];

// API base (update as needed)
const API_BASE = "http://127.0.0.1:8000/api/admin";
const SUPERVISION_API_BASE = `${API_BASE}/supervision`; // This base path is not explicitly defined in the Python code, but implied by the JS. For this extraction, we'll keep it as is.

// -----------------------------
// Utility helpers (re-included for self-containment, but ideally shared)
// -----------------------------
function showToast(msg, timeout = 2500) {
    try {
        let t = document.getElementById('admin-toast');
        if (!t) {
            t = document.createElement('div');
            t.id = 'admin-toast';
            t.style.cssText = `
                position: fixed;
                right: 1rem;
                bottom: 1rem;
                padding: 0.8rem 1.2rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 8px;
                z-index: 9999;
                font-weight: 500;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transform: translateY(100px);
                opacity: 0;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.transform = 'translateY(0)';
        t.style.opacity = '1';
        setTimeout(() => {
            t.style.transform = 'translateY(100px)';
            t.style.opacity = '0';
        }, timeout);
    } catch (e) {
        console.log('TOAST:', msg);
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
