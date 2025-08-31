import os
import pandas as pd
import numpy as np
from fastapi import FastAPI, Request, UploadFile, Form, File, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sklearn.model_selection import train_test_split
import xgboost as xgb

# ==========================
# Config
# ==========================
UPLOAD_FOLDER = "uploads"
ALLOWED_EXT = {"mp4", "mov", "avi", "mkv"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Templates (no static since everything is inline in index.html)
templates = Jinja2Templates(directory="templates")

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
# Load Dataset + Compute Risk
# ==========================
DATA_PATH = "student_dt.csv"
if not os.path.exists(DATA_PATH):
    raise FileNotFoundError("Dataset student_dt.csv not found!")

data = pd.read_csv(DATA_PATH)
data.columns = data.columns.str.strip()

data["risk_score"] = (
    ((50 - data["Avg_Marks"]).clip(0)) * 0.3 +
    ((65 - data["Attendance%"]).clip(0)) * 0.4 +
    ((70 - data["Assignments_Submitted%"]).clip(0)) * 0.2 +
    (data["Backlogs"] > 3).astype(int) * 10 +
    (data["payment_status"] == 1).astype(int) * 5
)
data["Dropout"] = np.where(data["risk_score"] > 20, 1, 0)

# ==========================
# Counseling Logic
# ==========================
def get_friendly_counseling(student):
    avg_marks = float(student["Avg_Marks"])
    attendance = float(student["Attendance%"])
    backlogs = int(student["Backlogs"])
    assignment_issues = int(student["Assignments_Submitted%"] < 70) * 100

    if avg_marks > 70 and attendance > 75:
        return "🌟 High Achiever", "Encourage advanced projects, leadership, and mentorship."
    elif avg_marks < 50 and attendance < 60 and backlogs > 2:
        return "🚨 High Risk Student", "Immediate tutoring, backlog clearance, and financial support."
    elif avg_marks < 50 and attendance >= 60:
        return "📚 Struggling but Committed", "Subject-specific tutoring and study skills mentoring."
    elif attendance < 60 and avg_marks >= 50:
        return "⚠️ Disengaged Student", "Engagement improvement and attendance counseling."
    elif assignment_issues > 50:
        return "✍️ Assignment Struggler", "Time management training and structured study plans."
    else:
        return "📊 Moderate Student", "Individual counseling based on academic, engagement, and financial needs."

# ==========================
# Train XGBoost Model
# ==========================
def train_dropout_model(data):
    X = data[["Attendance%", "Avg_Marks", "Assignments_Submitted%", "Backlogs", "payment_status"]]
    y = data["Dropout"]

    if y.nunique() < 2:  # avoid training if all labels same
        return None, X.columns

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = xgb.XGBClassifier(
        eval_metric="logloss",
        random_state=42,
        n_estimators=300,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=(len(y) - sum(y)) / max(sum(y), 1)
    )
    model.fit(X_train, y_train)
    return model, X.columns

xgb_model, feature_columns = train_dropout_model(data)

# ==========================
# Unified Prediction Function
# ==========================
def predict_and_counsel(student_id):
    student = data[data["Student_ID"].astype(str).str.lower() == student_id.lower()]

    if student.empty:
        return {
            "Student ID": student_id,
            "Dropout Probability (%)": None,
            "Risk Score": None,
            "Urgency Tag": "❌ Not Found",
            "Cluster Name": "Not Found",
            "Counseling Strategy": "Student not found.",
            "Feature Contribution": {}
        }

    student_row = student.iloc[0]

    if xgb_model:
        X_student = student[feature_columns]
        dropout_prob = float(xgb_model.predict_proba(X_student)[0][1] * 100)
    else:
        dropout_prob = float(student_row["risk_score"])

    attendance_impact = max(0, 100 - float(student_row["Attendance%"])) * 0.4
    marks_impact = max(0, 100 - float(student_row["Avg_Marks"])) * 0.3
    backlog_impact = int(student_row["Backlogs"]) * 0.3
    risk_score = attendance_impact + marks_impact + backlog_impact

    total = attendance_impact + marks_impact + backlog_impact
    feature_contribution = {
        "Attendance% Impact": round((attendance_impact / total) * 100, 1) if total else 0,
        "Avg_Marks Impact": round((marks_impact / total) * 100, 1) if total else 0,
        "Backlogs Impact": round((backlog_impact / total) * 100, 1) if total else 0,
    }

    urgency_tag = "🚨 High Risk" if dropout_prob > 70 else "⚠️ Moderate Risk" if dropout_prob > 40 else "✅ Low Risk"
    cluster_name, strategy = get_friendly_counseling(student_row)

    return {
        "Student ID": student_id,
        "Dropout Probability (%)": round(dropout_prob, 2),
        "Risk Score": round(risk_score, 1),
        "Urgency Tag": urgency_tag,
        "Cluster Name": cluster_name,
        "Counseling Strategy": strategy,
        "Feature Contribution": feature_contribution
    }

# ==========================
# Routes
# ==========================
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/api/login")
async def api_login(username: str = Form(...), password: str = Form(...), role: str = Form(...)):
    lookup = username.lower()
    user_key = next((k for k,v in VALID_CREDENTIALS.items() if v.get("email","").lower()==lookup or k.lower()==lookup), None)
    if not user_key:
        raise HTTPException(status_code=404, detail="User not found")
    user = VALID_CREDENTIALS[user_key]
    if user["password"] != password:
        raise HTTPException(status_code=403, detail="Incorrect password")
    if user["role"] != role:
        raise HTTPException(status_code=403, detail="Incorrect role")
    return {"ok": True, "user": {"id": user_key, "name": user["name"], "role": user["role"]}}

@app.get("/api/student/{student_id}")
async def api_student(student_id: str):
    result = predict_and_counsel(student_id)
    if not result or not result["Dropout Probability (%)"]:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"ok": True, "data": result}

@app.get("/api/predict/{student_id}")
async def api_predict(student_id: str):
    result = predict_and_counsel(student_id)
    if not result or not result["Dropout Probability (%)"]:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"ok": True, "prediction": result}

@app.post("/api/upload-session")
async def api_upload_session(file: UploadFile = File(...)):
    ext = file.filename.rsplit(".", 1)[1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Extension not allowed")
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    return {"ok": True, "filename": file.filename, "path": file_path}

@app.get("/uploads/{filename}")
async def uploaded_file(filename: str):
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)
