# AI-based Drop-out Prediction and Counseling System 

## 📌 Background

By the time term-end marks reveal failures, many struggling students have disengaged beyond recovery. Counsellors and mentors require an early-warning system that surfaces **risk indicators** such as:

* Falling attendance
* Multiple failed attempts in a subject
* Declining test scores

Currently, this data is scattered across different spreadsheets (attendance, test results, and fee payment data), making it difficult to identify students slipping across multiple areas simultaneously.

Commercial analytics platforms exist but are expensive and require maintenance—beyond the reach of public institutes. A **simpler, transparent, and impactful approach** is needed.

## 🎯 Objective

The goal is to create a **digital dashboard** that:

* **Consolidates student data** from multiple XLSX spreadsheets (attendance, assessments, fee records, etc.)
* **Applies rule-based thresholds** and ML models to flag at-risk students
* **Highlights insights visually** using an intuitive interface
* **Notifies mentors and guardians** regularly for early interventions
* Ensures **security and accountability** with mandatory mentor video uploads after sessions, supervised by authorities (especially for student safety)

This system empowers educators to intervene early and effectively **without replacing their judgment**.

## 🛠️ Features

* 📊 **Unified Dashboard**: Merge multiple Excel sheets (attendance, marks, and fee payment data) into a single view.
* 🚦 **Risk Indicators**: Color-coded signals for at-risk students (e.g., Red = High risk, Yellow = Moderate risk, Green = Safe).
* 🤖 **ML Integration**: Machine learning models enhance predictions by identifying hidden patterns beyond rule-based checks.
* 📩 **Automated Notifications**: Regular alerts sent to mentors and guardians.
* 🎥 **Security & Transparency**: Mentors must upload a session video after every counseling session. These are **supervised by authorities** to ensure safety and trust.
* ⚡ **Easy to Use**: Minimal training required, designed for educators with limited technical knowledge.

## 🚀 Expected Impact

* Early identification of at-risk students
* Timely counseling and intervention
* Reduced drop-out rates
* Improved trust and safety for both students and mentors
* Affordable and practical solution for institutes without extra budget requirements

## 📂 Tech Stack (Proposed)

* **Backend**: Python (Flask/FastAPI), Machine Learning (Scikit-learn, XGBoost, Pandas, NumPy, OpenPyXL)
* **Frontend**: React.js / HTML-CSS-JS for dashboard
* **Data Source**: XLSX files (Excel-based attendance, marks, and fee sheets)
* **Notifications**: Email/SMS API Integration
* **Storage**: Cloud / Local server for video uploads

## 🔒 Security & Compliance

* Mandatory **mentor session video uploads**
* Videos monitored by **authorized personnel**
* Ensures accountability, student safety, and transparency
* Role-based access control for mentors, authorities, and admins

## 📌 Hackathon Spirit

This project aligns with the hackathon vision: **using existing data, integrating it smartly, and generating meaningful impact**—without requiring heavy infrastructure or costs.

---

## ⚙️ Installation & Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/MaheshReddy-ML/AI-based-drop-out-prediction-and-counseling-system.git
   cd AI-based-drop-out-prediction-and-counseling-system
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Prepare your data:

   * Place attendance, marks, and fee records in **XLSX format** inside the `data/` folder.

4. Run the project:

   ```bash
   python app.py
   ```

---

### 👨‍💻 Contributors

* Team Name: The Debug Society. (TL)
* GitHub Repository: [AI-based-drop-out-prediction-and-counseling-system](https://github.com/MaheshReddy-ML/AI-based-drop-out-prediction-and-counseling-system)

## 📂 Project Structure

```bash
AI-based-drop-out-prediction-and-counseling-system/
│
├── login/               # Login related frontend + backend code
│   ├── login.html
│   ├── login.js
│   └── login.css
│
├── admin/               # Admin dashboard & controls
│   ├── admin.html
│   ├── admin.js
│   └── admin.css
│
├── mentor/              # Mentor dashboard, video upload, student tracking
│   ├── mentor.html
│   ├── mentor.js
│   └── mentor.css
│
├── student/             # Student dashboard (attendance, marks, fee insights)
│   ├── student.html
│   ├── student.js
│   └── student.css
│
├── app.py               # Main backend application (Flask/FastAPI)
├── model.py             # ML model for drop-out prediction
├── utils.py             # Helper functions (data loading, preprocessing, etc.)
├── requirements.txt     # Project dependencies
├── LICENSE              # MIT License
├── README.md            # Project documentation
└── .gitignore           # Ignore unnecessary files
