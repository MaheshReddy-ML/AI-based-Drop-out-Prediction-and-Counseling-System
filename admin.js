// =================================================================
// ===== admin.js — Complete dynamic admin frontend (updated + supervision)
// =================================================================
// This version:
//  - Uses API endpoints under API_BASE when available
//  - Falls back to local demo data if network fails
//  - Keeps all original UI behaviors (modals, drawer, sidebar)
//  - Integrates supervision module functionality
//  - Adds enhanced filtering and search capabilities
//  - Includes real-time updates and notifications
// =================================================================

// -----------------------------
// Demo fallback data (kept for offline/testing)
// -----------------------------
const DEMO_VALID_CREDENTIALS = {
    's0001': { name: 'John Doe' },
    's0002': { name: 'Jane Smith' },
    's0003': { name: 'Mike Johnson' },
    'm001': { name: 'Dr. Sarah Johnson' },
    'm002': { name: 'Prof. Robert Wilson' },
    'c010': { name: 'Dr. Maria Lopez' },
    'admin': { name: 'System Administrator' }
};

const DEMO_STUDENTS_DATA = {
    'S0001': { risk_score: 25, name: 'John Doe', email: 'john.doe@university.edu', grade: 'A-' },
    'S0002': { risk_score: 78, name: 'Jane Smith', email: 'jane.smith@university.edu', grade: 'C+' },
    'S0003': { risk_score: 52, name: 'Mike Johnson', email: 'mike.johnson@university.edu', grade: 'B' },
    'S0004': { risk_score: 89, name: 'Alice Brown', email: 'alice.brown@university.edu', grade: 'D+' },
    'S0005': { risk_score: 15, name: 'Bob Wilson', email: 'bob.wilson@university.edu', grade: 'A' }
};

const DEMO_AVAILABILITY_DATA = [
    { 
        id: 'M001', 
        name: 'Dr. Sarah Johnson', 
        role: 'mentor', 
        status: 'available', 
        skills: ['Academic Performance', 'Study Skills'], 
        next: 'Today 3:00 PM', 
        load: '8/12', 
        rating: '4.9/5.0',
        email: 'sarah.johnson@university.edu',
        specialization: 'Academic Performance'
    },
    { 
        id: 'M002', 
        name: 'Prof. Robert Wilson', 
        role: 'mentor', 
        status: 'busy', 
        skills: ['Career Guidance'], 
        next: 'Today 5:30 PM', 
        load: '12/12', 
        rating: '4.7/5.0',
        email: 'robert.wilson@university.edu',
        specialization: 'Career Guidance'
    },
    { 
        id: 'C010', 
        name: 'Dr. Maria Lopez', 
        role: 'counselor', 
        status: 'available', 
        skills: ['Mental Health'], 
        next: 'Available Now', 
        load: '5/12', 
        rating: '5.0/5.0',
        email: 'maria.lopez@university.edu',
        specialization: 'Mental Health'
    }
];

const DEMO_MENTOR_ASSIGNMENTS = {
    'M001': ['S0001', 'S0002'],
    'M002': ['S0003', 'S0004'],
    'C010': ['S0005']
};

// Demo supervision video data
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
let validCredentials = {};
let studentsData = {};
let availabilityData = [];
let mentorAssignments = {};
let supervisionVideos = [];
let currentVideoId = null;
let filteredVideos = [];

// Current user (can be overridden by sessionStorage)
let currentUser = { id: 'admin', name: 'Admin User', role: 'admin' };

// API base (update as needed)
const API_BASE = "http://127.0.0.1:8000/api/admin";
const SUPERVISION_API_BASE = `${API_BASE}/supervision`;

// -----------------------------
// Utility helpers
// -----------------------------
function safeUpper(str = "") {
    return String(str || "").toUpperCase();
}

// -----------------------------
// Report generation handlers
// -----------------------------
async function generateStudentPerformanceReport() {
    showToast('Generating Student Performance Report...');
    try {
        const jsPDF = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Student Performance Report', 14, 22);
        doc.setFontSize(12);
        doc.text('Comprehensive academic analysis', 14, 30);

        // Table headers
        const headers = ['Student ID', 'Name', 'Grade', 'Risk Score (%)'];
        const rows = [];

        for (const [id, student] of Object.entries(studentsData)) {
            rows.push([
                id,
                student.name || '',
                student.grade || 'N/A',
                student.risk_score !== undefined ? student.risk_score.toString() : 'N/A'
            ]);
        }

        // AutoTable plugin can be used if available, else simple text
        if (doc.autoTable) {
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 40,
                theme: 'grid',
                headStyles: { fillColor: [102, 126, 234] }
            });
        } else {
            let y = 40;
            doc.setFontSize(10);
            doc.text(headers.join(' | '), 14, y);
            y += 6;
            rows.forEach(row => {
                doc.text(row.join(' | '), 14, y);
                y += 6;
            });
        }

        doc.save('Student_Performance_Report.pdf');
        showToast('Student Performance Report generated successfully', 2500);
    } catch (error) {
        console.error('Error generating Student Performance Report:', error);
        showToast('Failed to generate Student Performance Report', 2500);
    }
}

async function exportStudentPerformanceToExcel() {
    showToast('Exporting Student Performance to Excel...');
    try {
        const data = [
            ['Student ID', 'Name', 'Email', 'Grade', 'Risk Score (%)', 'Risk Level', 'Assigned Mentor']
        ];

        for (const [id, student] of Object.entries(studentsData)) {
            let riskLevel = 'Low';
            const score = Number(student.risk_score || 0);
            if (score > 70) riskLevel = 'High';
            else if (score > 40) riskLevel = 'Moderate';

            // Find assigned mentor
            let assignedMentor = 'Not Assigned';
            for (const mentorId in mentorAssignments) {
                const arr = mentorAssignments[mentorId] || [];
                if (arr.includes(id)) {
                    assignedMentor = (validCredentials[mentorId.toLowerCase()] && validCredentials[mentorId.toLowerCase()].name) ||
                                     (validCredentials[mentorId] && validCredentials[mentorId].name) ||
                                     mentorId;
                    break;
                }
            }

            data.push([
                id,
                student.name || '',
                student.email || '',
                student.grade || 'N/A',
                score,
                riskLevel,
                assignedMentor
            ]);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Student Performance');

        // Auto-size columns
        const colWidths = [
            { wch: 12 }, // Student ID
            { wch: 20 }, // Name
            { wch: 25 }, // Email
            { wch: 8 },  // Grade
            { wch: 12 }, // Risk Score
            { wch: 10 }, // Risk Level
            { wch: 20 }  // Assigned Mentor
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, 'Student_Performance_Report.xlsx');
        showToast('Student Performance Report exported to Excel successfully', 2500);
    } catch (error) {
        console.error('Error exporting Student Performance to Excel:', error);
        showToast('Failed to export Student Performance to Excel', 2500);
    }
}

async function generateRiskAssessmentReport() {
    showToast('Generating Risk Assessment Report...');
    try {
        const jsPDF = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Risk Assessment Report', 14, 22);
        doc.setFontSize(12);
        doc.text('Detailed dropout risk analysis', 14, 30);

        // Table headers
        const headers = ['Student ID', 'Name', 'Risk Score (%)', 'Risk Level'];
        const rows = [];

        for (const [id, student] of Object.entries(studentsData)) {
            let riskLevel = 'Low';
            const score = student.risk_score || 0;
            if (score > 70) riskLevel = 'High';
            else if (score > 40) riskLevel = 'Moderate';

            rows.push([
                id,
                student.name || '',
                score.toString(),
                riskLevel
            ]);
        }

        if (doc.autoTable) {
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 40,
                theme: 'grid',
                headStyles: { fillColor: [229, 62, 62] }
            });
        } else {
            let y = 40;
            doc.setFontSize(10);
            doc.text(headers.join(' | '), 14, y);
            y += 6;
            rows.forEach(row => {
                doc.text(row.join(' | '), 14, y);
                y += 6;
            });
        }

        doc.save('Risk_Assessment_Report.pdf');
        showToast('Risk Assessment Report generated successfully', 2500);
    } catch (error) {
        console.error('Error generating Risk Assessment Report:', error);
        showToast('Failed to generate Risk Assessment Report', 2500);
    }
}

async function generateCounselingEffectivenessReport() {
    showToast('Generating Counseling Effectiveness Report...');
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Counseling Effectiveness Report', 14, 22);
        doc.setFontSize(12);
        doc.text('Mentoring success metrics', 14, 30);

        // For demo, summarize number of assignments per mentor
        const headers = ['Mentor ID', 'Mentor Name', 'Number of Assigned Students'];
        const rows = [];

        for (const [mentorId, students] of Object.entries(mentorAssignments)) {
            const mentorName = (validCredentials[mentorId.toLowerCase()] && validCredentials[mentorId.toLowerCase()].name) ||
                               (validCredentials[mentorId] && validCredentials[mentorId].name) ||
                               mentorId;
            rows.push([
                mentorId,
                mentorName,
                students.length.toString()
            ]);
        }

        if (doc.autoTable) {
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 40,
                theme: 'grid',
                headStyles: { fillColor: [102, 126, 234] }
            });
        } else {
            let y = 40;
            doc.setFontSize(10);
            doc.text(headers.join(' | '), 14, y);
            y += 6;
            rows.forEach(row => {
                doc.text(row.join(' | '), 14, y);
                y += 6;
            });
        }

        doc.save('Counseling_Effectiveness_Report.pdf');
        showToast('Counseling Effectiveness Report generated successfully', 2500);
    } catch (error) {
        console.error('Error generating Counseling Effectiveness Report:', error);
        showToast('Failed to generate Counseling Effectiveness Report', 2500);
    }
}

async function exportRiskAssessmentToExcel() {
    showToast('Exporting Risk Assessment to Excel...');
    try {
        const data = [
            ['Student ID', 'Name', 'Risk Score (%)', 'Risk Level', 'Assigned Mentor', 'Email', 'Grade']
        ];

        for (const [id, student] of Object.entries(studentsData)) {
            let riskLevel = 'Low';
            const score = Number(student.risk_score || 0);
            if (score > 70) riskLevel = 'High';
            else if (score > 40) riskLevel = 'Moderate';

            // Find assigned mentor
            let assignedMentor = 'Not Assigned';
            for (const mentorId in mentorAssignments) {
                const arr = mentorAssignments[mentorId] || [];
                if (arr.includes(id)) {
                    assignedMentor = (validCredentials[mentorId.toLowerCase()] && validCredentials[mentorId.toLowerCase()].name) ||
                                     (validCredentials[mentorId] && validCredentials[mentorId].name) ||
                                     mentorId;
                    break;
                }
            }

            data.push([
                id,
                student.name || '',
                score,
                riskLevel,
                assignedMentor,
                student.email || '',
                student.grade || 'N/A'
            ]);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Risk Assessment');

        // Auto-size columns
        const colWidths = [
            { wch: 12 }, // Student ID
            { wch: 20 }, // Name
            { wch: 12 }, // Risk Score
            { wch: 10 }, // Risk Level
            { wch: 20 }, // Assigned Mentor
            { wch: 25 }, // Email
            { wch: 8 }   // Grade
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, 'Risk_Assessment_Report.xlsx');
        showToast('Risk Assessment Report exported to Excel successfully', 2500);
    } catch (error) {
        console.error('Error exporting Risk Assessment to Excel:', error);
        showToast('Failed to export Risk Assessment to Excel', 2500);
    }
}

async function exportCounselingEffectivenessToExcel() {
    showToast('Exporting Counseling Effectiveness to Excel...');
    try {
        const data = [
            ['Mentor ID', 'Mentor Name', 'Number of Assigned Students', 'Success Rate', 'Specialization', 'Email']
        ];

        for (const [mentorId, students] of Object.entries(mentorAssignments)) {
            const mentorName = (validCredentials[mentorId.toLowerCase()] && validCredentials[mentorId.toLowerCase()].name) ||
                               (validCredentials[mentorId] && validCredentials[mentorId].name) ||
                               mentorId;

            // Find mentor details from availability data
            const mentorDetails = availabilityData.find(m => m.id === mentorId);
            const successRate = mentorDetails ? mentorDetails.rating || 'N/A' : 'N/A';
            const specialization = mentorDetails ? mentorDetails.specialization || 'N/A' : 'N/A';
            const email = mentorDetails ? mentorDetails.email || 'N/A' : 'N/A';

            data.push([
                mentorId,
                mentorName,
                students.length,
                successRate,
                specialization,
                email
            ]);
        }

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Counseling Effectiveness');

        // Auto-size columns
        const colWidths = [
            { wch: 12 }, // Mentor ID
            { wch: 20 }, // Mentor Name
            { wch: 25 }, // Number of Assigned Students
            { wch: 12 }, // Success Rate
            { wch: 20 }, // Specialization
            { wch: 25 }  // Email
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, 'Counseling_Effectiveness_Report.xlsx');
        showToast('Counseling Effectiveness Report exported to Excel successfully', 2500);
    } catch (error) {
        console.error('Error exporting Counseling Effectiveness to Excel:', error);
        showToast('Failed to export Counseling Effectiveness to Excel', 2500);
    }
}

function normalizeStudentId(raw) {
    if (!raw) return raw;
    raw = String(raw).trim().toUpperCase();
    if (/^S\d+$/i.test(raw)) {
        const num = raw.slice(1).padStart(4, '0');
        return `S${num}`;
    }
    if (/^S0*\d+$/i.test(raw)) return raw;
    if (/^\d+$/.test(raw)) return `S${String(raw).padStart(4, '0')}`;
    return raw;
}

function normalizeMentorId(raw) {
    if (!raw) return raw;
    raw = String(raw).trim().toUpperCase();
    if (/^M\d+$/i.test(raw)) {
        const num = raw.slice(1).padStart(3, '0');
        return `M${num}`;
    }
    if (/^M0*\d+$/i.test(raw)) return raw;
    return raw;
}

function parseLoad(loadStr) {
    if (!loadStr) return { current: 0, capacity: 0 };
    const m = loadStr.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) return { current: Number(m[1]), capacity: Number(m[2]) };
    const n = parseInt(loadStr, 10);
    if (!isNaN(n)) return { current: n, capacity: n };
    return { current: 0, capacity: 0 };
}

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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// -----------------------------
// Initialization & page wiring
// -----------------------------
document.addEventListener('DOMContentLoaded', () => {
    try {
        const saved = sessionStorage.getItem('currentUser');
        if (saved) currentUser = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    if (currentUser && currentUser.role === 'admin') {
        initializeAdminDashboard();
        handlePageLoadRouting();

        // Add event listeners for report generation buttons
        const btnStudentPerformance = document.getElementById('btnGenerateStudentPerformance');
        if (btnStudentPerformance) {
            btnStudentPerformance.addEventListener('click', () => {
                generateStudentPerformanceReport();
            });
        }

        const btnRiskAssessment = document.getElementById('btnGenerateRiskAssessment');
        if (btnRiskAssessment) {
            btnRiskAssessment.addEventListener('click', () => {
                generateRiskAssessmentReport();
            });
        }

        const btnCounselingEffectiveness = document.getElementById('btnGenerateCounselingEffectiveness');
        if (btnCounselingEffectiveness) {
            btnCounselingEffectiveness.addEventListener('click', () => {
                generateCounselingEffectivenessReport();
            });
        }

        // Add event listeners for Excel export buttons
        const btnExportStudentPerformanceExcel = document.getElementById('btnExportStudentPerformanceExcel');
        if (btnExportStudentPerformanceExcel) {
            btnExportStudentPerformanceExcel.addEventListener('click', () => {
                exportStudentPerformanceToExcel();
            });
        }

        const btnExportRiskAssessmentExcel = document.getElementById('btnExportRiskAssessmentExcel');
        if (btnExportRiskAssessmentExcel) {
            btnExportRiskAssessmentExcel.addEventListener('click', () => {
                exportRiskAssessmentToExcel();
            });
        }

        const btnExportCounselingEffectivenessExcel = document.getElementById('btnExportCounselingEffectivenessExcel');
        if (btnExportCounselingEffectivenessExcel) {
            btnExportCounselingEffectivenessExcel.addEventListener('click', () => {
                exportCounselingEffectivenessToExcel();
            });
        }
    } else {
        alert("Access Denied. Admins only.");
        document.body.innerHTML = "<h1>Access Denied</h1>";
        return;
    }

    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('adminSidebar');
        const mainContent = document.getElementById('adminMainContent');
        const toggleBtn = document.querySelector('#adminMainContent .sidebar-toggle');
        if (!sidebar || !mainContent) return;

        if (window.innerWidth <= 768 && !sidebar.classList.contains('collapsed')) {
            if (!sidebar.contains(event.target) && !(toggleBtn && toggleBtn.contains(event.target))) {
                sidebar.classList.add('collapsed');
                mainContent.classList.remove('expanded');
            }
        }
    });

    // Initialize supervision module
    if (typeof initializeSupervisionModule === 'function') {
        initializeSupervisionModule();
    } else {
        setTimeout(initializeSupervisionFromAdmin, 100);
    }
});

function initializeAdminDashboard() {
    fetchData();
    
    const sInput = document.getElementById('studentSearchInput');
    if (sInput) {
        sInput.addEventListener('input', (e) => {
            const q = e.target.value.trim().toLowerCase();
            filterStudentsTable(q);
        });
    }

    updateDashboardStats();
}

// -----------------------------
// Data loading with improved error handling
// -----------------------------
async function fetchData() {
    const loadingStates = {
        students: false,
        availability: false,
        assignments: false,
        credentials: false,
        supervision: false
    };

    try {
        showLoadingState();

        const [
            studentsRes,
            availabilityRes,
            assignmentsRes,
            credentialsRes,
            supervisionRes
        ] = await Promise.allSettled([
            fetch(`${API_BASE}/students`),
            fetch(`${API_BASE}/availability`),
            fetch(`${API_BASE}/assignments`),
            fetch(`${API_BASE}/credentials`),
            fetch(`${SUPERVISION_API_BASE}/videos`)
        ]);

        // Process each response
        if (studentsRes.status === 'fulfilled' && studentsRes.value.ok) {
            const data = await studentsRes.value.json();
            console.log("API /students response data:", data);
            studentsData = processStudentsData(data);
            console.log("Processed studentsData:", studentsData);
            // Fallback to demo data if studentsData is empty after processing API response
            if (!studentsData || Object.keys(studentsData).length === 0) {
                console.warn('API students data empty, falling back to demo data');
                studentsData = Object.assign({}, DEMO_STUDENTS_DATA);
            }
            loadingStates.students = true;
        }

        if (availabilityRes.status === 'fulfilled' && availabilityRes.value.ok) {
            const data = await availabilityRes.value.json();
            availabilityData = processAvailabilityData(data);
            loadingStates.availability = true;
        }

        if (assignmentsRes.status === 'fulfilled' && assignmentsRes.value.ok) {
            const data = await assignmentsRes.value.json();
            mentorAssignments = processAssignmentsData(data);
            loadingStates.assignments = true;
        }

        if (credentialsRes.status === 'fulfilled' && credentialsRes.value.ok) {
            const data = await credentialsRes.value.json();
            validCredentials = processCredentialsData(data);
            loadingStates.credentials = true;
        }

        if (supervisionRes.status === 'fulfilled' && supervisionRes.value.ok) {
            const data = await supervisionRes.value.json();
            supervisionVideos = processSupervisionData(data);
            filteredVideos = [...supervisionVideos];
            loadingStates.supervision = true;
        }

        const loadedCount = Object.values(loadingStates).filter(Boolean).length;
        
        if (loadedCount > 0) {
            showToast(`Loaded ${loadedCount}/5 data sources from server`, 1800);
        } else {
            throw new Error('No data sources loaded successfully');
        }

    } catch (err) {
        console.warn('Failed to load admin API data, using fallback:', err);
        loadFallbackData();
        showToast('Using local demo data (offline mode)', 2200);
    }

    hideLoadingState();
    loadStudentsTable();
    updateMentorLoadCounts();
    updateDashboardStats();
    
    if (typeof renderSupervisionVideos === 'function') {
        renderSupervisionVideos();
    }
}

function processStudentsData(data) {
    const students = (data && data.ok && data.data) ? data.data : (data.data || data);
    if (Array.isArray(students)) {
        const map = {};
        students.forEach(s => {
            const id = normalizeStudentId(s.id || s.Student_ID || s.student_id || s.StudentId || '');
            if (id) {
                map[id] = {
                    name: s.name || s.Name || '',
                    risk_score: Number(s.risk_score || s.riskScore || 0),
                    email: s.email || s.Email || '',
                    grade: s.grade || s.Grade || 'N/A'
                };
            }
        });
        return map;
    }
    return students || {};
}

function processAvailabilityData(data) {
    const availability = (data && data.ok && data.data) ? data.data : (data.data || data);
    return Array.isArray(availability) ? availability : [];
}

function processAssignmentsData(data) {
    const assignments = (data && data.ok && data.data) ? data.data : (data.data || data);
    if (Array.isArray(assignments)) {
        // Transform list of assignments into mentorId -> [studentId, ...] map
        const map = {};
        assignments.forEach(a => {
            const mentorId = a.Mentor_ID || a.mentor_id || a.mentorId || '';
            const studentId = a.Student_ID || a.student_id || a.studentId || '';
            if (mentorId && studentId) {
                if (!map[mentorId]) map[mentorId] = [];
                if (!map[mentorId].includes(studentId)) map[mentorId].push(studentId);
            }
        });
        return map;
    }
    return assignments || {};
}

function processCredentialsData(data) {
    const credentials = (data && data.ok && data.data) ? data.data : (data.data || data);
    return credentials || {};
}

function processSupervisionData(data) {
    const videos = (data && data.ok && data.data) ? data.data : (data.data || data);
    return Array.isArray(videos) ? videos : [];
}

function loadFallbackData() {
    validCredentials = Object.assign({}, DEMO_VALID_CREDENTIALS);
    studentsData = Object.assign({}, DEMO_STUDENTS_DATA);
    availabilityData = DEMO_AVAILABILITY_DATA.slice();
    mentorAssignments = Object.assign({}, DEMO_MENTOR_ASSIGNMENTS);
    supervisionVideos = [...DEMO_SUPERVISION_VIDEOS];
    filteredVideos = [...supervisionVideos];
}

function showLoadingState() {
    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = '0.7';
        container.style.pointerEvents = 'none';
    }
}

function hideLoadingState() {
    const container = document.querySelector('.container');
    if (container) {
        container.style.opacity = '1';
        container.style.pointerEvents = 'auto';
    }
}

// -----------------------------
// Dashboard Statistics
// -----------------------------
function updateDashboardStats() {
    console.log("Updating dashboard stats with studentsData:", studentsData);
    const totalStudents = Object.keys(studentsData).length;
    let highRisk = 0, moderateRisk = 0, lowRisk = 0;

    Object.values(studentsData).forEach(student => {
        const risk = Number(student.risk_score || 0);
        if (risk > 70) highRisk++;
        else if (risk > 40) moderateRisk++;
        else lowRisk++;
    });

    // Update stat cards if they exist
    updateStatCard('total', totalStudents);
    updateStatCard('high-risk', highRisk);
    updateStatCard('moderate-risk', moderateRisk);
    updateStatCard('low-risk', lowRisk);
}

function updateStatCard(type, value) {
    const card = document.querySelector(`.stat-card.${type} .stat-value`);
    if (card) {
        card.textContent = value.toLocaleString();
    }
}

// -----------------------------
// Students table & filtering
// -----------------------------

function getRiskPercentage(riskScore) {
    if (typeof riskScore !== 'number' || isNaN(riskScore)) return 0;
    if (riskScore > 1) return Math.min(riskScore, 100);
    return Math.min(riskScore * 100, 100);
}

function loadStudentsTable() {
    const tbody = document.querySelector('#adminStudentsTable tbody');
    if (!tbody) {
        console.warn('#adminStudentsTable tbody not found in DOM');
        return;
    }
    tbody.innerHTML = '';

    const ids = Object.keys(studentsData || {}).sort((a,b) => {
        const ra = (studentsData[a] && studentsData[a].risk_score) || 0;
        const rb = (studentsData[b] && studentsData[b].risk_score) || 0;
        return rb - ra;
    });

    ids.forEach(id => {
        const student = studentsData[id];
        const riskRaw = Number(student.risk_score || 0);
        const riskPercent = Math.round(getRiskPercentage(riskRaw));
        const riskLevel = riskPercent > 70 ? 'High' : (riskPercent > 40 ? 'Moderate' : 'Low');
        const riskBadgeClass = `risk-${riskLevel.toLowerCase()}`;

        let assignedMentorName = 'Not Assigned';
        for (const mentorId in mentorAssignments) {
            const arr = mentorAssignments[mentorId] || [];
            if (arr.includes(id)) {
                assignedMentorName = (validCredentials[mentorId.toLowerCase()] && validCredentials[mentorId.toLowerCase()].name) ||
                                     (validCredentials[mentorId] && validCredentials[mentorId].name) ||
                                     mentorId;
                break;
            }
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${escapeHtml(id)}</strong></td>
            <td>${escapeHtml(student.name || '')}</td>
            <td><span class="risk-badge ${riskBadgeClass}">${riskLevel}</span></td>
            <td><strong>${riskPercent}%</strong></td>
            <td>${escapeHtml(assignedMentorName)}</td>
            <td>
                <button class="action-btn btn-view" onclick="viewStudentDetails('${id}')">👁️ View</button>
                <button class="action-btn btn-counsel" onclick="openAssignModal('${id}')">👥 Assign</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterStudentsTable(query) {
    query = (query || '').trim().toLowerCase();
    const tbody = document.querySelector('#adminStudentsTable tbody');
    if (!tbody) return;
    
    Array.from(tbody.children).forEach(tr => {
        const text = tr.textContent.toLowerCase();
        tr.style.display = (query === '' || text.includes(query)) ? '' : 'none';
    });
}

// -----------------------------
// View student details modal
// -----------------------------
function viewStudentDetails(studentId) {
    const student = studentsData[studentId];
    if (!student) {
        alert('Student not found!');
        return;
    }

    let assignedMentorName = 'Not Assigned';
    for (const mentorId in mentorAssignments) {
        const arr = mentorAssignments[mentorId] || [];
        if (arr.includes(studentId)) {
            assignedMentorName = (validCredentials[mentorId.toLowerCase()] && validCredentials[mentorId.toLowerCase()].name) ||
                                 (validCredentials[mentorId] && validCredentials[mentorId].name) ||
                                 mentorId;
            break;
        }
    }

    const risk = Number(student.risk_score || 0);
    const riskLevel = risk > 70 ? 'High' : (risk > 40 ? 'Moderate' : 'Low');
    const strategy = risk > 70 ? "Immediate intervention required. Schedule weekly sessions and provide additional academic support." :
                    (risk > 40 ? "Monitor closely with bi-weekly check-ins and targeted assistance." : "Standard monthly check-in with preventive guidance.");

    const stratEl = document.getElementById('s-detail-strategy');
    if (stratEl) stratEl.textContent = strategy;

    openModal('studentDetailsModal');
}

// -----------------------------
// Assignment functionality
// -----------------------------
async function openAssignModal(studentId = null, mentorId = null) {
    createAssignModalIfMissing();

    const assignModal = document.getElementById('assignModal');
    if (!assignModal) {
        assignViaPrompt(studentId, mentorId);
        return;
    }

    const studentInput = document.getElementById('assign-student-id');
    const mentorInput = document.getElementById('assign-mentor-id');
    const assignMsg = document.getElementById('assign-result-msg');

    if (studentInput) studentInput.value = studentId || '';
    if (mentorInput) mentorInput.value = mentorId || '';
    if (assignMsg) assignMsg.textContent = '';

    populateMentorDropdown();
    assignModal.classList.add('show');

    const submitBtn = document.getElementById('assign-submit-btn');
    if (submitBtn) {
        const newBtn = submitBtn.cloneNode(true);
        submitBtn.parentNode.replaceChild(newBtn, submitBtn);
        newBtn.addEventListener('click', async () => {
            const sVal = (document.getElementById('assign-student-id').value || '').trim();
            const mVal = (document.getElementById('assign-mentor-id').value || '').trim();
            if (!sVal || !mVal) {
                if (assignMsg) assignMsg.textContent = 'Please enter both Student ID and Mentor ID.';
                return;
            }
            newBtn.disabled = true;
            newBtn.textContent = 'Assigning...';
            await performAssignment(sVal, mVal, assignMsg);
            newBtn.disabled = false;
            newBtn.textContent = 'Assign';
        });
    }
}

function populateMentorDropdown() {
    const mentorInput = document.getElementById('assign-mentor-id');
    if (!mentorInput || mentorInput.tagName !== 'SELECT') return;

    mentorInput.innerHTML = '<option value="">Select Mentor</option>';
    availabilityData.forEach(mentor => {
        const option = document.createElement('option');
        option.value = mentor.id;
        option.textContent = `${mentor.name} (${mentor.id}) - Load: ${mentor.load}`;
        mentorInput.appendChild(option);
    });
}

function assignViaPrompt(studentId = null, mentorId = null) {
    const s = studentId || prompt("Enter the Student ID to assign (e.g., S0001):");
    if (!s) return;
    const m = mentorId || prompt("Enter the Mentor ID to assign to (e.g., M001):");
    if (!m) return;ba
    performAssignment(s, m, null);
}

async function performAssignment(studentRaw, mentorRaw, resultNode = null) {
    const sId = normalizeStudentId(studentRaw);
    const mId = normalizeMentorId(mentorRaw);

    if (resultNode) resultNode.textContent = 'Assigning...';

    try {
        const res = await fetch(`${API_BASE}/assign?student_id=${encodeURIComponent(sId)}&mentor_id=${encodeURIComponent(mId)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.detail || payload?.message || 'API assign failed');

        if (payload && payload.data) {
            mentorAssignments = payload.data;
        } else {
            await fetchData();
        }

        if (resultNode) {
            resultNode.textContent = `Successfully assigned ${sId} → ${mId}`;
            resultNode.style.color = '#38a169';
        } else {
            showToast(`Assigned ${sId} → ${mId}`, 1800);
        }

        loadStudentsTable();
        updateMentorLoadCounts();
        
        const assignModal = document.getElementById('assignModal');
        if (assignModal) {
            setTimeout(() => assignModal.classList.remove('show'), 1500);
        }
        
    } catch (err) {
        console.warn('API assign failed, falling back to local update:', err);
        
        for (const key of Object.keys(mentorAssignments)) {
            mentorAssignments[key] = (mentorAssignments[key] || []).filter(x => x !== sId);
        }
        mentorAssignments[mId] = mentorAssignments[mId] || [];
        if (!mentorAssignments[mId].includes(sId)) mentorAssignments[mId].push(sId);

        if (resultNode) {
            resultNode.textContent = `Assigned locally ${sId} → ${mId}`;
            resultNode.style.color = '#ed8936';
        } else {
            showToast(`Assigned locally ${sId} → ${mId}`, 1800);
        }

        loadStudentsTable();
        updateMentorLoadCounts();
        
        const assignModal = document.getElementById('assignModal');
        if (assignModal) {
            setTimeout(() => assignModal.classList.remove('show'), 1500);
        }
    }
}

function createAssignModalIfMissing() {
    if (document.getElementById('assignModal')) return;

    const modal = document.createElement('div');
    modal.id = 'assignModal';
    modal.className = 'modal assign-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>👥 Assign Student to Mentor</h3>
                <button class="close-btn" onclick="document.getElementById('assignModal').classList.remove('show')">&times;</button>
            </div>
            <div style="padding: 1rem;">
                <div class="form-group">
                    <label for="assign-student-id">Student ID</label>
                    <input type="text" id="assign-student-id" placeholder="S0001" class="form-control">
                </div>
                <div class="form-group">
                    <label for="assign-mentor-id">Mentor ID</label>
                    <input type="text" id="assign-mentor-id" placeholder="M001" class="form-control">
                </div>
                <div id="assign-result-msg" style="min-height: 1.2rem; margin: 0.5rem 0; font-weight: 500;"></div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1rem;">
                    <button type="button" class="btn-secondary" onclick="document.getElementById('assignModal').classList.remove('show')">Cancel</button>
                    <button type="button" id="assign-submit-btn" class="btn-primary">Assign</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    window.addEventListener('click', (ev) => {
        if (ev.target === modal) modal.classList.remove('show');
    });
}

// -----------------------------
// Mentor load counts & availability
// -----------------------------
function updateMentorLoadCounts() {
    document.querySelectorAll('[id^="mentor-load-"]').forEach(el => {
        const parts = el.textContent.split('/');
        const capacity = parts[1] ? parts[1].trim() : '0';
        el.textContent = `0/${capacity}`;
    });

    for (const mentorId in mentorAssignments) {
        const count = (mentorAssignments[mentorId] || []).length;
        const loadEl = document.getElementById(`mentor-load-${mentorId.toUpperCase()}`);
        if (loadEl) {
            let capacity = '0';
            const av = availabilityData.find(a => (a.id || '').toUpperCase() === mentorId.toUpperCase());
            if (av && av.load) {
                const parsed = parseLoad(av.load);
                capacity = String(parsed.capacity || av.load || '0');
            } else {
                const parts = loadEl.textContent.split('/');
                capacity = parts[1] ? parts[1].trim() : '0';
            }
            loadEl.textContent = `${count}/${capacity}`;
        }
    }

    const drawer = document.getElementById('availabilityList');
    if (drawer) renderAvailabilityList();
}

function renderAvailabilityList(filteredData = availabilityData) {
    const listContainer = document.getElementById('availabilityList');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (!Array.isArray(filteredData) || filteredData.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding: 2rem; color: #718096;">No counselors match the criteria.</p>';
        return;
    }

    filteredData.forEach(counselor => {
        const statusClass = `status-${(counselor.status || '').toLowerCase()}`;
        const initials = (counselor.name || '').split(' ').map(n => n[0] || '').join('').slice(0,3);
        const parsed = parseLoad(counselor.load || '');
        const loadDisplay = counselor.load ? counselor.load : `${parsed.current}/${parsed.capacity}`;

        const card = document.createElement('div');
        card.className = 'counselor-card';
        card.innerHTML = `
            <div class="counselor-header" style="display:flex;gap:0.6rem;align-items:center;">
                <div class="counselor-avatar" style="width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);display:flex;align-items:center;justify-content:center;font-weight:600;color:white;">
                    ${escapeHtml(initials || '?')}
                </div>
                <div>
                    <h4 style="margin:0;">${escapeHtml(counselor.name || '')}</h4>
                    <p style="margin:0;font-size:0.85rem;"><span class="status-indicator ${statusClass}" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${counselor.status==='available' ? '#28a745' : (counselor.status==='busy' ? '#ff9800' : '#6c757d')};margin-right:6px;"></span>
                    ${escapeHtml((counselor.status || '').charAt(0).toUpperCase() + (counselor.status || '').slice(1))}</p>
                    <small style="color:#666;">${escapeHtml((counselor.role || '').charAt(0).toUpperCase() + (counselor.role || '').slice(1))}</small>
                </div>
            </div>
            <div class="counselor-details" style="margin-top:0.6rem;font-size:0.9rem;color:#333;">
                <p style="margin:0.15rem 0;"><strong>Skills:</strong> ${escapeHtml((counselor.skills || []).join(', '))}</p>
                <p style="margin:0.15rem 0;"><strong>Next:</strong> ${escapeHtml(counselor.next || '—')}</p>
                <p style="margin:0.15rem 0;"><strong>Load:</strong> ${escapeHtml(loadDisplay)}</p>
                <p style="margin:0.15rem 0;"><strong>Rating:</strong> ${escapeHtml(counselor.rating || '—')}</p>
            </div>
            <div class="counselor-actions" style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:0.6rem;">
                <button class="action-btn btn-message" onclick="openAssignModal(null, '${counselor.id}')">👥 Assign</button>
                <button class="action-btn btn-schedule" onclick="scheduleWithCounselor('${counselor.id}')">📅 Schedule</button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function filterAvailability() {
    const roleFilter = document.getElementById('roleFilter')?.value || '';
    const timeFilter = document.getElementById('timeFilter')?.value || '';
    const searchFilter = document.getElementById('searchFilter')?.value.toLowerCase() || '';

    const filtered = availabilityData.filter(counselor => {
        const roleMatch = !roleFilter || counselor.role === roleFilter;
        const timeMatch = !timeFilter || (
            timeFilter === 'today' && counselor.next && counselor.next.includes('Today')
        ) || (
            timeFilter === 'now' && counselor.status === 'available'
        );
        const searchMatch = !searchFilter || 
            counselor.name.toLowerCase().includes(searchFilter) ||
            (counselor.skills || []).some(skill => skill.toLowerCase().includes(searchFilter));

        return roleMatch && timeMatch && searchMatch;
    });

    renderAvailabilityList(filtered);
}

// -----------------------------
// Supervision Module Integration
// -----------------------------
function initializeSupervisionFromAdmin() {
    if (supervisionVideos.length === 0) {
        supervisionVideos = [...DEMO_SUPERVISION_VIDEOS];
        filteredVideos = [...supervisionVideos];
    }
    if (typeof renderSupervisionVideos === 'function') {
        renderSupervisionVideos();
    }
}

// Supervision video rendering
function renderSupervisionVideos(videos = filteredVideos) {
    const grid = document.getElementById('supervisionVideoGrid');
    if (!grid) return;

    if (!videos || videos.length === 0) {
        renderEmptySupervisionState(grid);
        return;
    }

    grid.innerHTML = '';
    
    videos.forEach(video => {
        const videoCard = createVideoCard(video);
        grid.appendChild(videoCard);
    });
}

function createVideoCard(video) {
    const card = document.createElement('div');
    card.className = `video-card ${video.status}`;
    card.onclick = () => openVideoModal(video.id);
    
    const priorityClass = `priority-${video.priority}`;
    const statusBadgeClass = `status-${video.status}`;
    const statusText = video.status.charAt(0).toUpperCase() + video.status.slice(1);
    
    card.innerHTML = `
        <div class="video-thumbnail">
            <div class="placeholder">📹</div>
            <div class="video-overlay">
                <div class="play-button">▶</div>
            </div>
            <div class="priority-indicator ${priorityClass}"></div>
        </div>
        
        <div class="video-info-header">
            <h4>${escapeHtml(video.mentorName)} → ${escapeHtml(video.studentName)}</h4>
            <div class="video-meta">
                <span class="status-badge ${statusBadgeClass}">${statusText}</span>
                <span>${video.duration}</span>
            </div>
        </div>
        
        <div class="video-details-section">
            <div class="video-details-grid">
                <div class="video-detail">
                    <label>Session Type</label>
                    <span>${escapeHtml(video.sessionType)}</span>
                </div>
                <div class="video-detail">
                    <label>Upload Date</label>
                    <span>${formatDate(video.uploadDate)}</span>
                </div>
                <div class="video-detail">
                    <label>Student ID</label>
                    <span>${escapeHtml(video.studentId)}</span>
                </div>
                <div class="video-detail">
                    <label>Priority</label>
                    <span class="priority-${video.priority}">${video.priority.toUpperCase()}</span>
                </div>
            </div>
            <div class="video-notes">
                <p style="font-size:0.85rem;color:#666;margin:0.5rem 0;">${escapeHtml(video.notes || 'No notes available')}</p>
            </div>
        </div>
        
        <div class="video-actions">
            <button class="action-btn btn-view" onclick="event.stopPropagation(); openVideoModal('${video.id}')">👁️ View</button>
            <button class="action-btn btn-secondary" onclick="event.stopPropagation(); flagVideo('${video.id}')">🚩 Flag</button>
            <button class="action-btn btn-primary" onclick="event.stopPropagation(); markAsReviewed('${video.id}')">✅ Review</button>
        </div>
    `;
    
    return card;
}

function renderEmptySupervisionState(container) {
    container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: #718096; grid-column: 1 / -1;">
            <div style="font-size: 4rem; margin-bottom: 1rem; opacity: 0.5;">📹</div>
            <h3 style="margin-bottom: 0.5rem; color: #4a5568;">No Supervision Videos</h3>
            <p style="font-size: 0.9rem; max-width: 400px; margin: 0 auto; line-height: 1.5;">No videos match your current filter criteria. Try adjusting the filters or check back later for new uploads.</p>
        </div>
    `;
}

// Video modal functions
function openVideoModal(videoId) {
    const video = supervisionVideos.find(v => v.id === videoId);
    if (!video) {
        showToast('Video not found', 2000);
        return;
    }
    
    currentVideoId = videoId;
    
    const titleEl = document.getElementById('videoModalTitle');
    const mentorEl = document.getElementById('videoMentor');
    const studentEl = document.getElementById('videoStudent');
    const dateEl = document.getElementById('videoDate');
    const durationEl = document.getElementById('videoDuration');
    const notesEl = document.getElementById('reviewNotes');
    
    if (titleEl) titleEl.textContent = `${video.mentorName} - ${video.sessionType}`;
    if (mentorEl) mentorEl.textContent = video.mentorName;
    if (studentEl) studentEl.textContent = `${video.studentName} (${video.studentId})`;
    if (dateEl) dateEl.textContent = formatDate(video.uploadDate);
    if (durationEl) durationEl.textContent = video.duration;
    if (notesEl) notesEl.value = video.reviewNotes || '';
    
    const videoPlayer = document.getElementById('supervisionVideo');
    if (videoPlayer) {
        if (video.videoUrl) {
            videoPlayer.src = video.videoUrl;
            videoPlayer.style.display = 'block';
        } else {
            videoPlayer.style.display = 'none';
            const container = videoPlayer.parentElement;
            if (container) {
                container.innerHTML = `
                    <div style="background: #f0f0f0; height: 300px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                        <div style="text-align: center; color: #666;">
                            <div style="font-size: 4rem; margin-bottom: 1rem;">📹</div>
                            <p>Video Preview Not Available</p>
                            <p><small>In production, the actual video would load here</small></p>
                        </div>
                    </div>
                `;
            }
        }
    }
    
    openModal('videoPlayerModal');
}

function closeVideoModal() {
    closeModal('videoPlayerModal');
    currentVideoId = null;
    
    const videoPlayer = document.getElementById('supervisionVideo');
    if (videoPlayer && !videoPlayer.paused) {
        videoPlayer.pause();
    }
}

// Video action functions
async function flagVideo(videoId = currentVideoId) {
    if (!videoId) return;
    
    try {
        const response = await fetch(`${SUPERVISION_API_BASE}/videos/${videoId}/flag`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showToast('Video flagged successfully', 1500);
        } else {
            throw new Error('API flag failed');
        }
    } catch (error) {
        console.warn('API flag failed, updating locally:', error);
        showToast('Video flagged locally', 1500);
    }
    
    const video = supervisionVideos.find(v => v.id === videoId);
    if (video) {
        video.status = 'flagged';
        video.priority = 'high';
    }
    
    renderSupervisionVideos();
    closeVideoModal();
}

async function markAsReviewed(videoId = currentVideoId) {
    if (!videoId) return;
    
    try {
        const response = await fetch(`${SUPERVISION_API_BASE}/videos/${videoId}/review`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showToast('Video marked as reviewed', 1500);
        } else {
            throw new Error('API review failed');
        }
    } catch (error) {
        console.warn('API review failed, updating locally:', error);
        showToast('Video marked as reviewed locally', 1500);
    }
    
    const video = supervisionVideos.find(v => v.id === videoId);
    if (video) {
        video.status = 'reviewed';
    }
    
    renderSupervisionVideos();
    closeVideoModal();
}

async function saveReviewNotes() {
    if (!currentVideoId) return;
    
    const notes = document.getElementById('reviewNotes')?.value.trim() || '';
    
    try {
        const response = await fetch(`${SUPERVISION_API_BASE}/videos/${currentVideoId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });
        
        if (response.ok) {
            showToast('Review notes saved', 1500);
        } else {
            throw new Error('API save notes failed');
        }
    } catch (error) {
        console.warn('API save notes failed, updating locally:', error);
        showToast('Review notes saved locally', 1500);
    }
    
    const video = supervisionVideos.find(v => v.id === currentVideoId);
    if (video) {
        video.reviewNotes = notes;
    }
}

function filterSupervisionVideos() {
    const mentorFilter = document.getElementById('mentorFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    const dateFilter = document.getElementById('dateFilter')?.value || '';
    
    filteredVideos = supervisionVideos.filter(video => {
        const mentorMatch = !mentorFilter || video.mentorId === mentorFilter;
        const statusMatch = !statusFilter || video.status === statusFilter;
        const dateMatch = !dateFilter || video.uploadDate === dateFilter;
        
        return mentorMatch && statusMatch && dateMatch;
    });
    
    renderSupervisionVideos();
}

async function markAllAsReviewed() {
    const pendingVideos = filteredVideos.filter(v => v.status === 'pending');
    
    if (pendingVideos.length === 0) {
        showToast('No pending videos to review', 1500);
        return;
    }
    
    if (!confirm(`Mark ${pendingVideos.length} videos as reviewed?`)) return;
    
    try {
        const response = await fetch(`${SUPERVISION_API_BASE}/videos/bulk-review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoIds: pendingVideos.map(v => v.id) })
        });
        
        if (response.ok) {
            showToast(`${pendingVideos.length} videos marked as reviewed`, 2000);
        } else {
            throw new Error('API bulk review failed');
        }
    } catch (error) {
        console.warn('API bulk review failed, updating locally:', error);
        showToast(`${pendingVideos.length} videos marked as reviewed locally`, 2000);
    }
    
    pendingVideos.forEach(video => {
        video.status = 'reviewed';
    });
    
    renderSupervisionVideos();
}

function exportSupervisionReport() {
    const csvContent = generateSupervisionCSV(filteredVideos);
    downloadCSV(csvContent, `supervision_report_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Supervision report exported', 1500);
}

function generateSupervisionCSV(videos) {
    const headers = ['Video ID', 'Mentor', 'Student', 'Upload Date', 'Duration', 'Status', 'Priority', 'Session Type', 'Notes'];
    const rows = videos.map(video => [
        video.id,
        video.mentorName,
        video.studentName,
        video.uploadDate,
        video.duration,
        video.status,
        video.priority,
        video.sessionType,
        `"${(video.notes || '').replace(/"/g, '""')}"`
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// -----------------------------
// Scheduling placeholder
// -----------------------------
function scheduleWithCounselor(counselorId) {
    showToast(`Scheduling feature for ${counselorId} coming soon`, 2000);
}

// -----------------------------
// UI: modals, sidebar, routing
// -----------------------------
function showSection(event, type, sectionName) {
    try {
        document.querySelectorAll(`#${type}Sidebar .menu-item`).forEach(item => item.classList.remove('active'));
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }
        
        document.querySelectorAll('.container .section').forEach(sec => sec.classList.remove('active'));

        const targetSection = document.getElementById(`${type}-${sectionName}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        const titleEl = document.getElementById(`${type}PageTitle`);
        if (titleEl && event && event.currentTarget) {
            const textEl = event.currentTarget.querySelector('.menu-item-text');
            if (textEl) {
                titleEl.textContent = textEl.textContent;
            }
        }
        
        window.location.hash = sectionName;

        // Load section-specific data if needed
        if (sectionName === 'supervision' && typeof renderSupervisionVideos === 'function') {
            setTimeout(renderSupervisionVideos, 100);
        }
    } catch (e) {
        console.warn('showSection error', e);
    }
}

function handlePageLoadRouting() {
    const sectionNameFromHash = window.location.hash.substring(1);
    if (sectionNameFromHash) {
        const targetMenuItem = document.querySelector(`.sidebar-menu .menu-item[onclick*="'${sectionNameFromHash}'"]`);
        if (targetMenuItem) {
            targetMenuItem.click();
        }
    }
}

function toggleSidebar(type) {
    const sidebar = document.getElementById(`${type}Sidebar`);
    const mainContent = document.getElementById(`${type}MainContent`);
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (mainContent) mainContent.classList.toggle('expanded');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

function openAvailabilityDrawer() {
    const drawer = document.getElementById('availabilityDrawer');
    if (drawer) drawer.classList.add('show');
    renderAvailabilityList();
}

function closeAvailabilityDrawer() {
    const drawer = document.getElementById('availabilityDrawer');
    if (drawer) drawer.classList.remove('show');
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        sessionStorage.removeItem('currentUser');
        window.location.href = '../login/login.html';
    }
}

// -----------------------------
// Event Listeners
// -----------------------------
window.addEventListener('click', (event) => {
    const videoModal = document.getElementById('videoPlayerModal');
    if (videoModal && event.target === videoModal) {
        closeVideoModal();
    }
    
    const assignModal = document.getElementById('assignModal');
    if (assignModal && event.target === assignModal) {
        assignModal.classList.remove('show');
    }
});

document.addEventListener('keydown', (event) => {
    const videoModal = document.getElementById('videoPlayerModal');
    if (videoModal && videoModal.classList.contains('show')) {
        switch (event.key) {
            case 'Escape':
                closeVideoModal();
                break;
            case 'f':
            case 'F':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    flagVideo();
                }
                break;
            case 'r':
            case 'R':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    markAsReviewed();
                }
                break;
        }
    }
});

// Auto-refresh data every 5 minutes
setInterval(() => {
    if (document.visibilityState === 'visible') {
        fetchData();
    }
}, 5 * 60 * 1000);

// =================================================================
// End of complete admin.js
// =================================================================