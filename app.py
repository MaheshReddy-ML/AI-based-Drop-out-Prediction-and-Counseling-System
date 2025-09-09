import os
import logging
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel

# ==========================
# Pydantic Models for API Requests/Responses
# ==========================
class SessionRequest(BaseModel):
    student_id: str
    mentor_id: str
    topic: str
    date: str
    time: str
    duration: int = 60  # minutes

class SessionUpdateRequest(BaseModel):
    topic: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[int] = None

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class SettingsUpdateRequest(BaseModel):
    risk_threshold: Optional[float] = None
    session_duration_default: Optional[int] = None
    max_sessions_per_day: Optional[int] = None
    notification_enabled: Optional[bool] = None

class ResourceRequest(BaseModel):
    resource_type: str  # "video", "document", "link"
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    file_path: Optional[str] = None

import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, Form, File, HTTPException, Query, Depends
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sklearn.model_selection import train_test_split

# ==========================
# Optional: XGBoost check
# ==========================
try:
    import xgboost as xgb
except Exception as e:
    xgb = None
    logging.warning("xgboost not available: %s. Using heuristic fallback.", e)

# ==========================
# Config
# ==========================
UPLOAD_FOLDER = "uploads"
ASSIGNMENTS_FOLDER = "assignments"
ALLOWED_EXT = {"mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "ogv", "3gp", "mpg", "mpeg", "m4v", "f4v", "asf", "vob", "mts", "m2ts", "ts", "divx", "xvid"}
ALLOWED_ASSIGNMENT_EXT = {"pdf", "doc", "docx", "xlsx", "xls", "txt"}
UPLOAD_EXCEL_FILE = "upload.xlsx"  # Excel file to track uploads
ASSIGNMENTS_EXCEL_FILE = "assignments.xlsx"  # Excel file to track assignments

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(ASSIGNMENTS_FOLDER, exist_ok=True)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="Prediction Portal API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================
# Demo Credentials
# ==========================
VALID_CREDENTIALS = {
    "s0001": {"password": "student123", "role": "student", "name": "John Doe", "email": "john.doe@example.com"},
    "s0002": {"password": "student123", "role": "student", "name": "Jane Smith", "email": "jane.smith@example.com"},
    "s0003": {"password": "student123", "role": "student", "name": "Mike Johnson", "email": "mike.johnson@example.com"},
    "m001": {"password": "mentor123", "role": "mentor", "name": "Dr. Sarah Johnson", "email": "sarah.johnson@example.com"},
    "m002": {"password": "mentor123", "role": "mentor", "name": "Prof. Robert Wilson", "email": "robert.wilson@example.com"},
    "admin": {"password": "admin123", "role": "admin", "name": "System Administrator", "email": "admin@example.com"},
    "a001": {"password": "admin123", "role": "admin", "name": "Academic Director", "email": "director@example.com"},
}

# ==========================
# Excel Upload Tracking Functions
# ==========================
def initialize_upload_excel():
    """Initialize the upload tracking Excel file if it doesn't exist"""
    if not os.path.exists(UPLOAD_EXCEL_FILE):
        df = pd.DataFrame(columns=[
            'Upload_ID', 'Filename', 'Original_Filename', 'Uploaded_By', 'Uploader_ID', 'Uploader_Role',
            'Upload_Date', 'File_Size_MB', 'File_Path', 'Status', 'Session_ID', 'Student_ID',
            'Session_Summary', 'Session_Outcomes', 'Student_Feeling',
            'Review_Date', 'Reviewed_By', 'Review_Notes'
        ])
        try:
            df.to_excel(UPLOAD_EXCEL_FILE, index=False, engine='openpyxl')
            logging.info(f"Created new upload tracking file: {UPLOAD_EXCEL_FILE}")
        except Exception as e:
            logging.error(f"Error creating upload Excel file: {e}")

def add_upload_to_excel(filename: str, uploaded_by: str, uploader_role: str, file_path: str, file_size_mb: float,
                        session_id: Optional[str] = None, student_id: Optional[str] = None):
    """Add upload record to Excel file"""
    try:
        # Read existing data or create new DataFrame
        if os.path.exists(UPLOAD_EXCEL_FILE):
            try:
                if UPLOAD_EXCEL_FILE.endswith('.xlsx'):
                    df = pd.read_excel(UPLOAD_EXCEL_FILE, engine='openpyxl')
                else:
                    df = pd.read_excel(UPLOAD_EXCEL_FILE, engine='xlrd')
            except Exception as read_e:
                logging.warning(f"Error reading existing upload Excel file: {read_e}. Recreating file.")
                df = pd.DataFrame(columns=[
                    'Upload_ID', 'Filename', 'Original_Filename', 'Uploaded_By', 'Uploader_ID', 'Uploader_Role',
                    'Upload_Date', 'File_Size_MB', 'File_Path', 'Status', 'Session_ID', 'Student_ID',
                    'Session_Summary', 'Session_Outcomes', 'Student_Feeling',
                    'Review_Date', 'Reviewed_By', 'Review_Notes'
                ])
        else:
            # This should ideally not happen if initialize_upload_excel is called
            df = pd.DataFrame(columns=[
                'Upload_ID', 'Filename', 'Uploaded_By', 'Uploader_Role',
                'Upload_Date', 'File_Size_MB', 'File_Path', 'Status', 'Session_ID', 'Student_ID'
            ])

        # Generate new upload ID
        upload_id = f"UP_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}" # Added microsecond for uniqueness

        # Create new record
        new_record = {
            'Upload_ID': upload_id,
            'Filename': filename,
            'Uploaded_By': uploaded_by,
            'Uploader_Role': uploader_role,
            'Upload_Date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'File_Size_MB': round(file_size_mb, 2),
            'File_Path': file_path,
            'Status': 'Pending Review', # Initial status for new uploads
            'Session_ID': session_id,
            'Student_ID': student_id,
            'Session_Summary': None,
            'Session_Outcomes': None,
            'Student_Feeling': None,
            'Review_Date': None,
            'Reviewed_By': None,
            'Review_Notes': None
        }

        # Add new record to DataFrame
        new_df = pd.DataFrame([new_record])
        df = pd.concat([df, new_df], ignore_index=True)

        # Save to Excel
        if UPLOAD_EXCEL_FILE.endswith('.xlsx'):
            df.to_excel(UPLOAD_EXCEL_FILE, index=False, engine='openpyxl')
        else:
            df.to_excel(UPLOAD_EXCEL_FILE, index=False, engine='xlwt')
        logging.info(f"Added upload record: {upload_id} - {filename}")

        return upload_id

    except Exception as e:
        logging.error(f"Error adding upload to Excel: {e}")
        return None

def get_uploads_from_excel():
    """Get all upload records from Excel file"""
    try:
        if os.path.exists(UPLOAD_EXCEL_FILE):
            # Determine engine based on file extension
            if UPLOAD_EXCEL_FILE.endswith('.xlsx'):
                engine = 'openpyxl'
            else:  # .xls files
                engine = 'xlrd'
            df = pd.read_excel(UPLOAD_EXCEL_FILE, engine=engine)
            # Convert to dict for API response
            uploads = df.replace({np.nan: None}).to_dict('records') # Replace NaN with None for JSON
            return uploads
        else:
            return []
    except Exception as e:
        logging.error(f"Error reading uploads from Excel: {e}")
        return []

def update_upload_record(upload_id: str, updates: Dict):
    """Update specific fields of an upload record in Excel file"""
    try:
        if os.path.exists(UPLOAD_EXCEL_FILE):
            # Determine engine based on file extension
            if UPLOAD_EXCEL_FILE.endswith('.xlsx'):
                engine = 'openpyxl'
            else:  # .xls files
                engine = 'xlrd'
            df = pd.read_excel(UPLOAD_EXCEL_FILE, engine=engine)

            # Find the row to update
            idx = df[df['Upload_ID'] == upload_id].index
            if idx.empty:
                return False # Record not found

            # Apply updates
            for key, value in updates.items():
                if key in df.columns: # Only update if column exists
                    df.loc[idx, key] = value

            # Determine write engine based on file extension
            if UPLOAD_EXCEL_FILE.endswith('.xlsx'):
                write_engine = 'openpyxl'
            else:  # .xls files
                write_engine = 'xlwt'
            df.to_excel(UPLOAD_EXCEL_FILE, index=False, engine=write_engine)
            logging.info(f"Updated upload record: {upload_id} with {updates}")
            return True
        return False
    except Exception as e:
        logging.error(f"Error updating upload record: {e}")
        return False

# ==========================
# Assignment Tracking Functions
# ==========================
def initialize_assignments_excel():
    """Initialize the assignments tracking Excel file if it doesn't exist"""
    if not os.path.exists(ASSIGNMENTS_EXCEL_FILE):
        df = pd.DataFrame(columns=[
            'Assignment_ID', 'Title', 'Description', 'Mentor_ID', 'Mentor_Name',
            'Student_ID', 'Student_Name', 'Due_Date', 'Assigned_Date',
            'File_Path', 'File_Name', 'File_Size_MB', 'Status'
        ])
        try:
            # Determine engine based on file extension
            if ASSIGNMENTS_EXCEL_FILE.endswith('.xlsx'):
                engine = 'openpyxl'
            else:  # .xls files
                engine = 'xlwt'
            df.to_excel(ASSIGNMENTS_EXCEL_FILE, index=False, engine=engine)
            logging.info(f"Created new assignments tracking file: {ASSIGNMENTS_EXCEL_FILE}")
        except Exception as e:
            logging.error(f"Error creating assignments Excel file: {e}")

def add_assignment_to_excel(assignment_data: dict):
    """Add assignment record to Excel file"""
    try:
        # Read existing data or create new DataFrame
        if os.path.exists(ASSIGNMENTS_EXCEL_FILE):
            # Determine engine based on file extension
            if ASSIGNMENTS_EXCEL_FILE.endswith('.xlsx'):
                engine = 'openpyxl'
            else:  # .xls files
                engine = 'xlrd'
            try:
                df = pd.read_excel(ASSIGNMENTS_EXCEL_FILE, engine=engine)
            except Exception as read_e:
                logging.warning(f"Error reading existing Excel file: {read_e}. Recreating file.")
                df = pd.DataFrame(columns=[
                    'Assignment_ID', 'Title', 'Description', 'Mentor_ID', 'Mentor_Name',
                    'Student_ID', 'Student_Name', 'Due_Date', 'Assigned_Date',
                    'File_Path', 'File_Name', 'File_Size_MB', 'Status'
                ])
        else:
            df = pd.DataFrame(columns=[
                'Assignment_ID', 'Title', 'Description', 'Mentor_ID', 'Mentor_Name',
                'Student_ID', 'Student_Name', 'Due_Date', 'Assigned_Date',
                'File_Path', 'File_Name', 'File_Size_MB', 'Status'
            ])

        # Add new record to DataFrame
        new_df = pd.DataFrame([assignment_data])
        df = pd.concat([df, new_df], ignore_index=True)

        # Save to Excel
        # Determine write engine based on file extension
        if ASSIGNMENTS_EXCEL_FILE.endswith('.xlsx'):
            write_engine = 'openpyxl'
        else:  # .xls files
            write_engine = 'xlwt'
        df.to_excel(ASSIGNMENTS_EXCEL_FILE, index=False, engine=write_engine)
        logging.info(f"Added assignment record: {assignment_data['Assignment_ID']} - {assignment_data['Title']}")

        return True

    except Exception as e:
        logging.error(f"Error adding assignment to Excel: {e}")
        return False

def get_assignments_from_excel():
    """Get all assignment records from Excel file"""
    try:
        if os.path.exists(ASSIGNMENTS_EXCEL_FILE):
            # Determine engine based on file extension
            if ASSIGNMENTS_EXCEL_FILE.endswith('.xlsx'):
                engine = 'openpyxl'
            else:  # .xls files
                engine = 'xlrd'
            df = pd.read_excel(ASSIGNMENTS_EXCEL_FILE, engine=engine)
            # Convert to dict for API response
            assignments = df.replace({np.nan: None}).to_dict('records') # Replace NaN with None for JSON
            return assignments
        else:
            return []
    except Exception as e:
        logging.error(f"Error reading assignments from Excel: {e}")
        return []

def get_student_assignments(student_id: str):
    """Get assignments for a specific student"""
    try:
        assignments = get_assignments_from_excel()
        student_assignments = [a for a in assignments if a.get('Student_ID') == student_id.upper() or a.get('Student_ID') == "ALL"]
        return student_assignments
    except Exception as e:
        logging.error(f"Error getting student assignments: {e}")
        return []

def get_mentor_assignments(mentor_id: str):
    """Get assignments created by a specific mentor"""
    try:
        assignments = get_assignments_from_excel()
        mentor_assignments = [a for a in assignments if a.get('Mentor_ID') == mentor_id.upper()]
        return mentor_assignments
    except Exception as e:
        logging.error(f"Error getting mentor assignments: {e}")
        return []

def clear_all_assignments():
    """Clear all assignments from the Excel file"""
    try:
        # Create an empty DataFrame with the same columns
        df = pd.DataFrame(columns=[
            'Assignment_ID', 'Title', 'Description', 'Mentor_ID', 'Mentor_Name',
            'Student_ID', 'Student_Name', 'Due_Date', 'Assigned_Date',
            'File_Path', 'File_Name', 'File_Size_MB', 'Status'
        ])
        # Determine write engine based on file extension
        if ASSIGNMENTS_EXCEL_FILE.endswith('.xlsx'):
            write_engine = 'openpyxl'
        else:  # .xls files
            write_engine = 'xlwt'
        df.to_excel(ASSIGNMENTS_EXCEL_FILE, index=False, engine=write_engine)
        logging.info("All assignments cleared from Excel file")
        return True
    except Exception as e:
        logging.error(f"Error clearing assignments: {e}")
        return False

# Initialize Excel files on startup
initialize_upload_excel()
initialize_assignments_excel()

# ==========================
# Mentor Schedule & Availability
# ==========================
mentor_schedule = [
    {"sessionId": "session1", "studentId": "S0002", "studentName": "Jane Smith", "time": "Today, 2:00 PM", "topic": "Academic Recovery Plan"},
    {"sessionId": "session3", "studentId": "S0001", "studentName": "John Doe", "time": "Tomorrow, 11:00 AM", "topic": "Study Skills"},
    {"sessionId": "session4", "studentId": "S0002", "studentName": "Jane Smith", "time": "Next Wednesday, 4:00 PM", "topic": "Follow-up"},
]

availability_data = [
    {"id": "M001", "name": "Dr. Sarah Johnson", "role": "mentor", "status": "available",
     "skills": ["Academic Performance", "Study Skills"], "next": "Today 3:00 PM",
     "load": "8/12 students", "rating": "4.9/5.0"},
    {"id": "M002", "name": "Prof. Robert Wilson", "role": "mentor", "status": "busy",
     "skills": ["Career Guidance"], "next": "Today 5:30 PM",
     "load": "12/12 students", "rating": "4.7/5.0"},
    {"id": "C010", "name": "Dr. Maria Lopez", "role": "counselor", "status": "available",
     "skills": ["Mental Health", "Stress Management"], "next": "Available Now",
     "load": "5/12 students", "rating": "5.0/5.0"},
    {"id": "C011", "name": "Prof. David Chen", "role": "counselor", "status": "away",
     "skills": ["Learning Disabilities"], "next": "Tomorrow 10:00 AM",
     "load": "4/12 students", "rating": "4.8/5.0"},
]

# ==========================
# Load Dataset or Dummy
# ==========================
DATA_PATH = "student_dt.csv"

def _build_minimal_dummy_df():
    cols = ["Student_ID", "Name", "Attendance%", "Avg_Marks", "Assignments_Submitted%", "Backlogs", "payment_status"]
    return pd.DataFrame([
        ["s0001", "John Doe", 85.0, 78.0, 90.0, 1, 0],
        ["s0002", "Jane Smith", 72.0, 65.0, 80.0, 2, 1],
        ["s0003", "Mike Johnson", 60.0, 55.0, 68.0, 2, 0],
    ], columns=cols)

if not os.path.exists(DATA_PATH):
    logging.warning("Dataset %s not found. Using dummy dataset.", DATA_PATH)
    data = _build_minimal_dummy_df()
else:
    data = pd.read_csv(DATA_PATH)
    data.columns = data.columns.str.strip()

required_cols = {"Student_ID", "Name", "Attendance%", "Avg_Marks", "Assignments_Submitted%", "Backlogs", "payment_status"}
for c in required_cols:
    if c not in data.columns:
        data[c] = 0

# Risk Score + Dropout (Risk Score as percentage)
data["risk_score"] = (
    ((100 - data["Avg_Marks"]).clip(lower=0) / 100 * 30) +
    ((100 - data["Attendance%"]).clip(lower=0) / 100 * 40) +
    ((100 - data["Assignments_Submitted%"]).clip(lower=0) / 100 * 20) +
    (data["Backlogs"] > 3).astype(int) * 5 +
    (data["payment_status"] == 1).astype(int) * 5
)
data["Dropout"] = np.where(data["risk_score"] > 50, 1, 0)

# ==========================
# Helpers
# ==========================
def std_student_id(raw: str) -> str:
    raw = str(raw).strip()
    r = raw.upper()
    if r.startswith("S"):
        return "S" + r[1:].zfill(4)
    return r

def std_mentor_id(raw: str) -> str:
    raw = str(raw).strip()
    r = raw.upper()
    if r.startswith("M"):
        return "M" + r[1:].zfill(3)
    return r

def build_admin_students_dict() -> Dict[str, Dict[str, object]]:
    out: Dict[str, Dict[str, object]] = {}
    for _, row in data.iterrows():
        sid = std_student_id(row["Student_ID"])
        out[sid] = {
            "name": str(row.get("Name", "")),
            "risk_score": float(row.get("risk_score", 0.0)),
            "email": "",  # No email in CSV, set to empty
            "grade": str(row.get("Year", "N/A")),  # Use Year as grade
        }
    return out

mentor_assignments: Dict[str, List[str]] = {
    "M001": ["S0001", "S0002"],
    "M002": ["S0003"],
}

# ==========================
# Counseling Logic
# ==========================
def get_friendly_counseling(student_row):
    avg_marks = float(student_row.get("Avg_Marks", 0))
    attendance = float(student_row.get("Attendance%", 0))
    backlogs = int(student_row.get("Backlogs", 0))
    assignments_pct = float(student_row.get("Assignments_Submitted%", 0))

    if avg_marks > 70 and attendance > 75:
        return "High Achiever", "Encourage advanced projects, leadership, and mentorship."
    elif avg_marks < 50 and attendance < 60 and backlogs > 2:
        return "High Risk Student", "Immediate tutoring, backlog clearance, and financial support."
    elif avg_marks < 50 and attendance >= 60:
        return "Struggling but Committed", "Subject-specific tutoring and study skills mentoring."
    elif attendance < 60 and avg_marks >= 50:
        return "Disengaged Student", "Engagement improvement and attendance counseling."
    elif assignments_pct < 70:
        return "Assignment Struggler", "Time management training and structured study plans."
    else:
        return "Moderate Student", "Individual counseling based on academic, engagement, and financial needs."

# ==========================
# Train XGBoost Model
# ==========================
def train_dropout_model(df):
    if xgb is None:
        return None, ["Attendance%", "Avg_Marks", "Assignments_Submitted%", "Backlogs", "payment_status"]

    X = df[['Attendance%', 'Avg_Marks', 'Assignments_Submitted%', 'Backlogs', 'payment_status']]
    y = df['Dropout']

    if y.nunique() < 2 or len(df) < 10:
        return None, X.columns

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = xgb.XGBClassifier(
        eval_metric='logloss',
        random_state=42,
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=(len(y) - sum(y)) / max(sum(y), 1)
    )
    model.fit(X_train, y_train)
    return model, X_train.columns

xgb_model, feature_columns = train_dropout_model(data)

# ==========================
# Prediction Function
# ==========================
def predict_and_counsel(student_id: str, student_override: Optional[pd.Series] = None):
    if not student_id or not isinstance(student_id, str):
        return {
            "Student ID": student_id or "Unknown",
            "Dropout Probability (%)": None,
            "Risk Score": None,
            "Urgency Tag": "Not Found",
            "Cluster Name": "Not Found",
            "Counseling Strategy": "Student not found.",
            "Feature Contribution": {}
        }

    student_df = data[data["Student_ID"].astype(str).str.lower() == str(student_id).lower()]
    if student_df.empty and student_override is None:
        return {
            "Student ID": student_id,
            "Dropout Probability (%)": None,
            "Risk Score": None,
            "Urgency Tag": "Not Found",
            "Cluster Name": "Not Found",
            "Counseling Strategy": "Student not found.",
            "Feature Contribution": {}
        }

    student_row = student_override if student_override is not None else student_df.iloc[0]

    if xgb_model is not None:
        X_student = pd.DataFrame([[float(student_row["Attendance%"]), float(student_row["Avg_Marks"]),
                                    float(student_row["Assignments_Submitted%"]), int(student_row["Backlogs"]),
                                    int(student_row["payment_status"])]], columns=feature_columns)
        dropout_prob = float(xgb_model.predict_proba(X_student)[0][1] * 100)
    else:
        dropout_prob = float(student_row.get("risk_score", 0.0))

    attendance_impact = max(0.0, 100.0 - float(student_row["Attendance%"])) * 0.4
    marks_impact = max(0.0, 100.0 - float(student_row["Avg_Marks"])) * 0.3
    backlog_impact = int(student_row["Backlogs"]) * 0.3
    total = attendance_impact + marks_impact + backlog_impact

    feature_contribution = {
        "Attendance% Impact": round((attendance_impact / total) * 100, 1) if total else 0,
        "Avg_Marks Impact": round((marks_impact / total) * 100, 1) if total else 0,
        "Backlogs Impact": round((backlog_impact / total) * 100, 1) if total else 0
    }

    urgency_tag = "High Risk" if dropout_prob > 50 else "Moderate Risk" if dropout_prob > 30 else "Low Risk"
    cluster_name, strategy = get_friendly_counseling(student_row)

    return {
        "Student ID": student_id,
        "Dropout Probability (%)": round(dropout_prob, 2),
        "Risk Score": round(float(student_row.get("risk_score", 0.0)), 1),
        "Urgency Tag": urgency_tag,
        "Cluster Name": cluster_name,
        "Counseling Strategy": strategy,
        "Feature Contribution": feature_contribution
    }

# ==========================
# Serve Frontend Files
# ==========================

# Mount static files for different roles
app.mount("/login", StaticFiles(directory="login", html=True), name="login")
app.mount("/student", StaticFiles(directory="student", html=True), name="student")
app.mount("/mentor", StaticFiles(directory="mentor", html=True), name="mentor")
app.mount("/admin", StaticFiles(directory="admin", html=True), name="admin")

@app.get("/")
async def home():
    return RedirectResponse(url="/login/index.html")

# Fallback routes for files that might not be caught by StaticFiles
@app.get("/{role}/{page}.html")
async def serve_role_page(role: str, page: str):
    file_path = os.path.join(BASE_DIR, role, f"{page}.html")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Page {page}.html not found in {role} folder")
    return FileResponse(file_path, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

@app.get("/{role}/{filename}")
async def serve_static_file(role: str, filename: str):
    file_path = os.path.join(BASE_DIR, role, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found in {role} folder")

    headers = {"Cache-Control": "no-cache, no-store, must-revalidate"}
    
    if filename.endswith(".css"):
        return FileResponse(file_path, media_type="text/css", headers=headers)
    elif filename.endswith(".js"):
        return FileResponse(file_path, media_type="application/javascript", headers=headers)
    else:
        return FileResponse(file_path, headers=headers)

# ==========================
# API Routes
# ==========================
@app.get("/api/health")
async def health_check():
    return {"ok": True, "status": "API is running"}

# ==========================
# Message Endpoints
# ==========================
@app.post("/api/messages/send")
async def send_student_message(
    studentId: str = Form(...),
    studentName: str = Form(...),
    mentorId: str = Form(...),
    subject: str = Form(...),
    message: str = Form(...)
):
    """
    Endpoint for students to send messages to mentors.
    """
    try:
        # For demo purposes, we'll just log the message
        # In a real app, you'd save this to a database
        message_data = {
            "studentId": studentId,
            "studentName": studentName,
            "mentorId": mentorId,
            "subject": subject,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "type": "student_to_mentor"
        }

        # Log the message (in production, save to database)
        logging.info(f"Student message sent: {message_data}")

        return {"ok": True, "message": "Message sent successfully"}

    except Exception as e:
        logging.error(f"Error sending student message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")

from fastapi import Body
from pydantic import BaseModel

class MentorMessage(BaseModel):
    toStudentId: str
    fromMentorId: str
    subject: str
    body: str

@app.post("/api/mentor/send-message")
async def send_mentor_message(message: MentorMessage = Body(...)):
    """
    Endpoint for mentors to send messages to students.
    """
    try:
        message_data = {
            "toStudentId": message.toStudentId,
            "fromMentorId": message.fromMentorId,
            "subject": message.subject,
            "body": message.body,
            "timestamp": datetime.now().isoformat(),
            "type": "mentor_to_student"
        }

        # Log the message (in production, save to database)
        logging.info(f"Mentor message sent: {message_data}")

        return {"ok": True, "message": "Message sent successfully"}

    except Exception as e:
        logging.error(f"Error sending mentor message: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")

# NEW: Dummy endpoint for the base /api/admin path to prevent 404s from frontend
@app.get("/api/admin")
async def admin_base_endpoint():
    """Dummy endpoint for /api/admin to prevent 404 errors if frontend requests it."""
    return {"ok": True, "message": "Admin API base endpoint reached."}


@app.post("/api/login")
async def api_login(username: str = Form(...), password: str = Form(...), role: str = Form(...)):
    lookup = username.lower() if username else ""
    user_key = next((k for k, v in VALID_CREDENTIALS.items()
                     if (v.get("email", "").lower() == lookup if v.get("email") else False) or (k.lower() == lookup if k else False)), None)
    if not user_key:
        raise HTTPException(status_code=404, detail="User not found")
    user = VALID_CREDENTIALS[user_key]
    if user["password"] != password:
        raise HTTPException(status_code=403, detail="Incorrect password")
    if user["role"] != role:
        raise HTTPException(status_code=403, detail="Incorrect role")

    if role == "student":
        redirect_url = "/student/student.html"
    elif role == "mentor":
        redirect_url = "/mentor/mentor.html"
    elif role == "admin":
        redirect_url = "/admin/admin.html"
    else:
        redirect_url = "/login/login.html"

    return {
        "ok": True,
        "redirect": redirect_url,
        "user": {"id": user_key, "name": user["name"], "email": user["email"], "role": user["role"]}
    }

@app.get("/api/student/{student_id}")
async def api_student(student_id: str):
    if not student_id or not isinstance(student_id, str):
        raise HTTPException(status_code=400, detail="Invalid student ID")

    return {"ok": True, "data": predict_and_counsel(student_id)}

@app.get("/api/predict/{student_id}")
async def api_predict(student_id: str):
    if not student_id or not isinstance(student_id, str):
        raise HTTPException(status_code=400, detail="Invalid student ID")

    return {"ok": True, "prediction": predict_and_counsel(student_id)}

@app.get("/api/whatif/{student_id}")
async def api_whatif(student_id: str, attendance: Optional[float] = Query(None),
                     marks: Optional[float] = Query(None), backlogs: Optional[int] = Query(None),
                     assignments: Optional[float] = Query(None)):
    if not student_id or not isinstance(student_id, str):
        raise HTTPException(status_code=400, detail="Invalid student ID")

    student = data[data["Student_ID"].astype(str).str.lower() == str(student_id).lower()]
    if student.empty:
        raise HTTPException(status_code=404, detail="Student not found")

    student_row = student.iloc[0].copy()
    if attendance is not None: student_row["Attendance%"] = attendance
    if marks is not None: student_row["Avg_Marks"] = marks
    if backlogs is not None: student_row["Backlogs"] = backlogs
    if assignments is not None: student_row["Assignments_Submitted%"] = assignments

    return {
        "ok": True,
        "student": student_id,
        "actual": predict_and_counsel(student_id),
        "simulated": predict_and_counsel(student_id, student_override=student_row),
        "changes": {"attendance": attendance, "marks": marks, "backlogs": backlogs, "assignments": assignments}
    }

# ==========================
# Role-Based Upload (Admin/Mentor only) - UPDATED
# ==========================
def check_role(role: str = Query(...)):
    if role not in ["admin", "mentor"]:
        raise HTTPException(status_code=403, detail="Only admin or mentor can upload")
    return role

@app.post("/api/upload-session")
async def api_upload_session(
    role: str = Depends(check_role),
    uploader_id: str = Form(...),
    file: UploadFile = File(...),
    session_id: Optional[str] = Form(None), # New: Optional session ID
    student_id: Optional[str] = Form(None)  # New: Optional student ID
):
    ext = file.filename.rsplit(".", 1)[1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXT)}")
    
    # Get file size
    file_content = await file.read()
    file_size_mb = len(file_content) / (1024 * 1024)
    
    # Save file
    # Use a more unique filename to prevent collisions
    unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{os.path.basename(file.filename)}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
    
    # Get uploader name from credentials
    uploader_name = VALID_CREDENTIALS.get(uploader_id.lower(), {}).get("name", uploader_id)
    
    # Add to Excel tracking
    upload_id = add_upload_to_excel(
        filename=unique_filename,
        uploaded_by=uploader_name,
        uploader_role=role,
        file_path=file_path,
        file_size_mb=file_size_mb,
        session_id=session_id, # Pass new parameters
        student_id=student_id  # Pass new parameters
    )
    
    if not upload_id:
        raise HTTPException(status_code=500, detail="Failed to record upload in Excel.")

    return {
        "ok": True, 
        "filename": unique_filename, 
        "path": file_path,
        "upload_id": upload_id,
        "message": f"File uploaded successfully and tracked in {UPLOAD_EXCEL_FILE}"
    }

@app.post("/api/complete-session")
async def api_complete_session(
    upload_id: str = Form(...),
    session_summary: str = Form(...),
    session_outcomes: str = Form(...),
    student_feeling: str = Form(...)
):
    """
    Endpoint to finalize a session record after video upload and form submission.
    Updates the existing upload record with session details.
    """
    updates = {
        'Session_Summary': session_summary,
        'Session_Outcomes': session_outcomes,
        'Student_Feeling': student_feeling,
        'Status': 'Completed', # Mark as completed
        'Review_Date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'Reviewed_By': 'System' # Or actual reviewer if applicable
    }
    
    success = update_upload_record(upload_id, updates)
    
    if success:
        return {"ok": True, "message": f"Session details for upload {upload_id} updated successfully."}
    else:
        raise HTTPException(status_code=404, detail=f"Upload record with ID {upload_id} not found or failed to update.")


@app.get("/uploads/{filename}")
async def uploaded_file(filename: str):
    file_path = os.path.join(UPLOAD_FOLDER, os.path.basename(filename))
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# ==========================
# Assignment Upload and Management
# ==========================
@app.post("/api/upload-assignment")
async def api_upload_assignment(
    mentor_id: str = Form(...),
    student_id: str = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    due_date: str = Form(...),
    file: UploadFile = File(...)
):
    # Validate file extension
    ext = file.filename.rsplit(".", 1)[1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_ASSIGNMENT_EXT:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' not allowed. Allowed: {', '.join(ALLOWED_ASSIGNMENT_EXT)}")
    
    # Get file size
    file_content = await file.read()
    file_size_mb = len(file_content) / (1024 * 1024)
    
    # Generate safe filename
    safe_name = f"assignment_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{os.path.basename(file.filename)}"
    file_path = os.path.join(ASSIGNMENTS_FOLDER, safe_name)

    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)

    # Get mentor and student info
    mentor_info = VALID_CREDENTIALS.get(mentor_id.lower(), {})
    student_info = VALID_CREDENTIALS.get(student_id.lower(), {})

    # Create assignment record
    assignment_id = f"ASG_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
    assignment_data = {
        'Assignment_ID': assignment_id,
        'Title': title,
        'Description': description,
        'Mentor_ID': mentor_id.upper(),
        'Mentor_Name': mentor_info.get('name', 'Unknown Mentor'),
        'Student_ID': student_id.upper(),
        'Student_Name': student_info.get('name', 'Unknown Student'),
        'Due_Date': due_date,
        'Assigned_Date': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'File_Path': file_path,
        'File_Name': safe_name,  # Store the actual filename on disk
        'Original_File_Name': file.filename,  # Store original filename for display
        'File_Size_MB': round(file_size_mb, 2),
        'Status': 'Pending' # Initial status for assignments
    }
    
    # Add to Excel tracking
    success = add_assignment_to_excel(assignment_data)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save assignment record")
    
    return {
        "ok": True,
        "assignment_id": assignment_id,
        "message": f"Assignment '{title}' uploaded successfully for student {student_id}"
    }

@app.get("/api/assignments/{student_id}")
async def api_get_student_assignments(student_id: str):
    assignments = get_student_assignments(student_id)
    return {"ok": True, "data": assignments}


# ==========================
# Mentor Assignments API
# ==========================
@app.get("/api/mentor-assignments/{mentor_id}")
async def api_get_mentor_assignments(mentor_id: str):
    assignments = get_mentor_assignments(mentor_id)
    return {"ok": True, "data": assignments}

# ==========================
# Assignment File Download
# ==========================
@app.get("/assignments/{filename}")
async def download_assignment(filename: str):
    # Sanitize filename to prevent directory traversal attacks
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(ASSIGNMENTS_FOLDER, safe_filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Assignment file not found")
    
    # Return file as attachment to force download in browser
    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={safe_filename}"}
    )

# ==========================
# Mentor Schedule (Admin manages availability)
# ==========================
@app.get("/api/mentor-schedule")
async def get_mentor_schedule():
    return {"ok": True, "schedule": mentor_schedule}

# ==========================
# Admin APIs - UPDATED WITH UPLOAD SUPERVISION
# ==========================
@app.get("/api/admin/credentials")
async def admin_credentials():
    return {
        "ok": True,
        "data": {k: {"name": v["name"]} for k, v in VALID_CREDENTIALS.items()}
    }

@app.get("/api/availability")
async def api_availability():
    """Get availability data for frontend"""
    return {"ok": True, "data": availability_data}

@app.get("/favicon.ico")
async def favicon():
    """Return 204 No Content for favicon requests to avoid 404 errors"""
    from fastapi.responses import Response
    return Response(status_code=204)

@app.get("/api/admin/students")
async def admin_students():
    return {"ok": True, "data": build_admin_students_dict()}

@app.get("/api/admin/availability")
async def admin_availability():
    """Get availability data for admin dashboard"""
    return {"ok": True, "data": availability_data}

@app.get("/api/admin/assignments")
async def admin_assignments():
    assignments = get_assignments_from_excel()
    return {"ok": True, "data": assignments}

@app.get("/api/mentor/assignments/{mentor_id}")
async def get_mentor_assignments_api(mentor_id: str):
    """Get students assigned to a specific mentor"""
    mentor_id_upper = mentor_id.upper()
    if mentor_id_upper not in mentor_assignments:
        return {"ok": True, "data": []}

    assigned_students = mentor_assignments[mentor_id_upper]
    students_info = []

    for student_id in assigned_students:
        # Find student in data
        student_row = data[data["Student_ID"].astype(str).str.upper() == student_id.upper()]
        if not student_row.empty:
            row = student_row.iloc[0]
            students_info.append({
                "id": student_id.upper(),
                "name": str(row.get("Name", "Unknown")),
                "risk_score": float(row.get("risk_score", 0.0)),
                "attendance": float(row.get("Attendance%", 0.0)),
                "marks": float(row.get("Avg_Marks", 0.0)),
                "backlogs": int(row.get("Backlogs", 0)),
                "assignments_submitted": float(row.get("Assignments_Submitted%", 0.0))
            })

    return {"ok": True, "data": students_info}

@app.get("/api/mentor/assignments/simple/{mentor_id}")
async def get_mentor_assignments_simple(mentor_id: str):
    """Get simple list of student IDs assigned to a mentor"""
    mentor_id_upper = mentor_id.upper()
    if mentor_id_upper not in mentor_assignments:
        return {"ok": True, "data": []}

    return {"ok": True, "data": mentor_assignments[mentor_id_upper]}

@app.get("/api/students")
async def get_all_students():
    """Get all students from CSV for admin assignment"""
    students_list = []
    for _, row in data.iterrows():
        student_id = std_student_id(str(row["Student_ID"]))
        students_list.append({
            "id": student_id,
            "name": str(row.get("Name", "Unknown")),
            "risk_score": float(row.get("risk_score", 0.0)),
            "attendance": float(row.get("Attendance%", 0.0)),
            "marks": float(row.get("Avg_Marks", 0.0)),
            "backlogs": int(row.get("Backlogs", 0)),
            "assignments_submitted": float(row.get("Assignments_Submitted%", 0.0))
        })
    return {"ok": True, "data": students_list}

# This route seems to be a duplicate of the one above, and returns mentor_assignments which is a dict, not a list of assignments.
# Keeping the one that calls get_assignments_from_excel() as it's more robust.
# @app.get("/api/admin/assignments")
# async def admin_assignments():
#     return {"ok": True, "data": mentor_assignments}

@app.post("/api/admin/assign")
async def admin_assign(student_id: str = Query(...), mentor_id: str = Query(...)):
    s_id = std_student_id(student_id)
    m_id = std_mentor_id(mentor_id)
    if m_id not in mentor_assignments:
        mentor_assignments[m_id] = []
    if s_id not in mentor_assignments[m_id]:
        mentor_assignments[m_id].append(s_id)
    return {"ok": True, "message": f"Assigned {s_id} to {m_id}"}

# NEW: Admin Upload Supervision Endpoints
@app.get("/api/admin/uploads")
async def admin_get_uploads():
    """Get all upload records for admin supervision"""
    uploads = get_uploads_from_excel()
    return {"ok": True, "data": uploads}

@app.post("/api/admin/update-upload-status")
async def admin_update_upload_status(upload_id: str = Query(...), status: str = Query(...)):
    """Update upload status (Active, Reviewed, Archived, etc.)"""
    valid_statuses = ["Pending Review", "Completed", "Reviewed", "Approved", "Rejected", "Archived"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    
    updates = {'Status': status}
    success = update_upload_record(upload_id, updates) # Use the more general update function
    
    if success:
        return {"ok": True, "message": f"Upload {upload_id} status updated to {status}"}
    else:
        raise HTTPException(status_code=404, detail="Upload record not found or failed to update.")

@app.get("/api/admin/upload-stats")
async def admin_upload_stats():
    """Get upload statistics for admin dashboard"""
    uploads = get_uploads_from_excel()
    
    total_uploads = len(uploads)
    active_uploads = len([u for u in uploads if u.get('Status') == 'Active']) # This might need adjustment based on new statuses
    completed_uploads = len([u for u in uploads if u.get('Status') == 'Completed'])
    pending_review_uploads = len([u for u in uploads if u.get('Status') == 'Pending Review'])
    
    # Calculate total file size
    total_size_mb = sum([float(u.get('File_Size_MB', 0)) for u in uploads])
    
    # Recent uploads (last 7 days)
    from datetime import datetime, timedelta
    recent_date = datetime.now() - timedelta(days=7)
    recent_uploads = []
    
    for upload in uploads:
        try:
            upload_date_str = upload.get('Upload_Date', '')
            if upload_date_str: # Ensure string is not empty
                upload_date = datetime.strptime(upload_date_str, '%Y-%m-%d %H:%M:%S')
                if upload_date >= recent_date:
                    recent_uploads.append(upload)
        except ValueError:
            logging.warning(f"Could not parse Upload_Date: {upload.get('Upload_Date')}")
            continue
    
    return {
        "ok": True,
        "stats": {
            "total_uploads": total_uploads,
            "active_uploads": active_uploads, # Consider renaming or redefining based on new statuses
            "completed_uploads": completed_uploads,
            "pending_review_uploads": pending_review_uploads,
            "recent_uploads": len(recent_uploads),
            "total_size_gb": round(total_size_mb / 1024, 2),
            "avg_file_size_mb": round(total_size_mb / max(total_uploads, 1), 2)
        }
    }

# Additional admin endpoints for better functionality
@app.get("/api/admin/overview")
async def admin_overview():
    """Get dashboard overview stats"""
    total_students = len(data)
    high_risk_students = len(data[data['risk_score'] > 50])
    total_mentors = len([k for k, v in VALID_CREDENTIALS.items() if v['role'] == 'mentor'])
    available_mentors = len([person for person in availability_data if person['status'] == 'available'])
    uploads = get_uploads_from_excel()
    assignments = get_assignments_from_excel()
    
    return {
        "ok": True,
        "stats": {
            "total_students": total_students,
            "high_risk_students": high_risk_students,
            "total_mentors": total_mentors,
            "available_mentors": available_mentors,
            "total_sessions": len(mentor_schedule), # This is mock data, should be dynamic
            "total_uploads": len(uploads),
            "pending_assignments": len([a for a in assignments if a.get('Status') == 'Pending'])
        }
    }

@app.post("/api/admin/update-availability")
async def update_availability(person_id: str = Query(...), status: str = Query(...)):
    """Update availability status for mentors/counselors"""
    valid_statuses = ["available", "busy", "away"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")
    
    for person in availability_data:
        if person['id'] == person_id:
            person['status'] = status
            return {"ok": True, "message": f"Updated {person['name']} status to {status}"}
    
    raise HTTPException(status_code=404, detail="Person not found")

@app.get("/api/admin/full-student-data")
async def admin_full_student_data():
    try:
        # Convert DataFrame to list of dicts, replacing NaN with None
        records = data.replace({np.nan: None}).to_dict(orient='records')
        return {"ok": True, "data": records}
    except Exception as e:
        logging.error(f"Error returning full student data: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve student data")

@app.post("/api/admin/clear-assignments")
async def api_clear_all_assignments():
    """Clear all assignments from the Excel file"""
    success = clear_all_assignments()
    if success:
        return {"ok": True, "message": "All assignments have been cleared from the system"}
    else:
        raise HTTPException(status_code=500, detail="Failed to clear assignments")

# ==========================
# Supervision Endpoints for Admin Video Review
# ==========================
@app.get("/api/admin/supervision/videos")
async def get_supervision_videos():
    """Get all uploaded videos for supervision in the format expected by admin.js"""
    try:
        uploads = get_uploads_from_excel()

        supervision_videos = []
        for upload in uploads:
            # Safely get values, handling None values
            student_id = upload.get("Student_ID") or ""
            status = upload.get("Status") or "Pending Review"
            filename = upload.get("Filename") or ""
            session_id = upload.get("Session_ID") or "General Session"
            session_summary = upload.get("Session_Summary") or ""
            review_notes = upload.get("Review_Notes") or ""

            # Map upload record to supervision video format
            video = {
                "id": upload.get("Upload_ID", ""),
                "mentorId": upload.get("Uploader_ID", ""),
                "mentorName": upload.get("Uploaded_By", ""),
                "studentId": student_id,
                "studentName": get_student_name(student_id),
                "uploadDate": upload.get("Upload_Date", ""),
                "duration": "N/A",  # Duration not stored in upload record
                "status": map_upload_status_to_supervision_status(status),
                "priority": determine_priority(upload),
                "sessionType": session_id,
                "notes": session_summary,
                "videoUrl": f"/uploads/{filename}",
                "thumbnailUrl": None,
                "reviewNotes": review_notes
            }
            supervision_videos.append(video)

        return {"ok": True, "data": supervision_videos}

    except Exception as e:
        logging.error(f"Error getting supervision videos: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve supervision videos")

def get_student_name(student_id: str) -> str:
    """Get student name from student data"""
    if not student_id or student_id is None:
        return "Unknown Student"

    # Ensure student_id is a string before calling .lower()
    student_id_str = str(student_id).strip()
    if not student_id_str:
        return "Unknown Student"

    # Try to find in VALID_CREDENTIALS first
    student_key = next((k for k, v in VALID_CREDENTIALS.items()
                       if k.lower() == student_id_str.lower() and v.get("role") == "student"), None)
    if student_key:
        return VALID_CREDENTIALS[student_key].get("name", student_id_str)

    # Try to find in data.csv
    try:
        student_row = data[data["Student_ID"].astype(str).str.lower() == student_id_str.lower()]
        if not student_row.empty:
            return student_row.iloc[0].get("Name", student_id_str)
    except Exception as e:
        logging.warning(f"Error searching for student {student_id_str}: {e}")

    return student_id_str

def map_upload_status_to_supervision_status(upload_status: str) -> str:
    """Map upload status to supervision status"""
    status_mapping = {
        "Pending Review": "pending",
        "Completed": "reviewed",
        "Reviewed": "reviewed",
        "Approved": "reviewed",
        "Rejected": "flagged",
        "Archived": "reviewed"
    }
    return status_mapping.get(upload_status, "pending")

def determine_priority(upload: dict) -> str:
    """Determine priority based on upload data"""
    # High priority if flagged or has review notes indicating issues
    if upload.get("Status") == "Rejected":
        return "high"
    if str(upload.get("Review_Notes") or "").lower().find("flag") >= 0:
        return "high"
    if upload.get("Status") == "Pending Review":
        return "medium"
    return "low"

@app.post("/api/admin/supervision/videos/{video_id}/flag")
async def flag_supervision_video(video_id: str):
    """Flag a supervision video for review"""
    try:
        updates = {
            "Status": "Rejected",
            "Review_Date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "Reviewed_By": "Admin",
            "Review_Notes": "Flagged for review"
        }

        success = update_upload_record(video_id, updates)
        if success:
            return {"ok": True, "message": f"Video {video_id} flagged successfully"}
        else:
            raise HTTPException(status_code=404, detail="Video not found")

    except Exception as e:
        logging.error(f"Error flagging video {video_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to flag video")

@app.post("/api/admin/supervision/videos/{video_id}/review")
async def mark_supervision_video_reviewed(video_id: str):
    """Mark a supervision video as reviewed"""
    try:
        updates = {
            "Status": "Reviewed",
            "Review_Date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "Reviewed_By": "Admin"
        }

        success = update_upload_record(video_id, updates)
        if success:
            return {"ok": True, "message": f"Video {video_id} marked as reviewed"}
        else:
            raise HTTPException(status_code=404, detail="Video not found")

    except Exception as e:
        logging.error(f"Error marking video {video_id} as reviewed: {e}")
        raise HTTPException(status_code=500, detail="Failed to mark video as reviewed")

@app.post("/api/admin/supervision/videos/{video_id}/notes")
async def save_supervision_video_notes(video_id: str, notes: str = Form(...)):
    """Save review notes for a supervision video"""
    try:
        updates = {
            "Review_Notes": notes,
            "Review_Date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            "Reviewed_By": "Admin"
        }

        success = update_upload_record(video_id, updates)
        if success:
            return {"ok": True, "message": f"Notes saved for video {video_id}"}
        else:
            raise HTTPException(status_code=404, detail="Video not found")

    except Exception as e:
        logging.error(f"Error saving notes for video {video_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to save notes")

@app.post("/api/admin/supervision/videos/bulk-review")
async def bulk_mark_supervision_videos_reviewed(video_ids: List[str] = Form(...)):
    """Mark multiple supervision videos as reviewed"""
    try:
        success_count = 0
        for video_id in video_ids:
            updates = {
                "Status": "Reviewed",
                "Review_Date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                "Reviewed_By": "Admin"
            }
            if update_upload_record(video_id, updates):
                success_count += 1

        return {"ok": True, "message": f"{success_count}/{len(video_ids)} videos marked as reviewed"}

    except Exception as e:
        logging.error(f"Error in bulk review: {e}")
        raise HTTPException(status_code=500, detail="Failed to bulk mark videos as reviewed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
