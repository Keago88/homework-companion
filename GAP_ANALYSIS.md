# Gap Analysis: Homework Companion vs Academic Risk & Performance Intelligence Platform

This document maps each requirement from the Product & Technical Scope (DOCUMENT 1) to the current Homework Companion app implementation.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully implemented / aligned |
| ⚠️ | Partially implemented / needs extension |
| ❌ | Not implemented / missing |

---

## 1. PRODUCT DEFINITION

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Does NOT replace LMS | ✅ | HWC is additive; manual/add-your-own assignments |
| Integrates with existing LMS | ❌ | No Google Classroom or LMS integration |
| Consolidated cross-subject risk scoring | ❌ | No risk score; only basic completion stats |
| Behaviour-based academic forecasting | ❌ | No forecasting; basic analytics only |
| Early-warning alerts | ❌ | No alert system |
| Structured intervention workflows | ❌ | No interventions |
| Parent-facing performance dashboards | ⚠️ | Parent role exists; no dedicated parent dashboard or child linking |

---

## 2. CORE PRODUCT OBJECTIVE

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Track assignment behaviour patterns | ⚠️ | Completions logged; no late/missing timestamps, submission-time tracking |
| Detect risk shifts | ❌ | No risk model |
| Forecast grade trajectory | ❌ | No grades or trajectory |
| Trigger structured corrective intervention | ❌ | No intervention engine |

---

## 3. USER ROLES

### 3.1 Admin (School Level)

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Admin role | ❌ | No Admin role; only Student, Parent, Teacher |
| Manage school account | ❌ | No school entity |
| Add/remove teachers | ❌ | No org management |
| Manage student roster | ❌ | No roster; single-user focus |
| Configure risk model thresholds | ❌ | No risk model |
| School-wide analytics dashboard | ❌ | No school dashboard |

### 3.2 Teacher

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Teacher role | ✅ | Role exists |
| View class-level risk overview | ❌ | No class view; no risk |
| View individual student risk profile | ❌ | No student risk; no class/student linkage |
| Log interventions | ❌ | Teacher can add comments on assignments only |
| Adjust assignment weighting | ❌ | No weighting system |
| View trend graphs | ❌ | Teacher sees same app; no class trends |

### 3.3 Parent

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Parent role | ✅ | Role exists |
| View child risk score | ❌ | No child linking; no risk score |
| View grade trajectory forecast | ❌ | No grades, no forecast |
| Receive early-warning alerts | ❌ | No alerts |
| View recovery plan | ❌ | No recovery plan |
| View weekly performance summary | ⚠️ | Analytics tab has weekly completion; no parent-child link |

### 3.4 Student

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Student role | ✅ | Role exists |
| View risk score | ❌ | No risk score |
| View performance trends | ⚠️ | Pro analytics: streak, completion rate, subject breakdown |
| View recovery targets | ❌ | No recovery targets |
| View streak progress | ✅ | Streak shown on Overview |
| Gamification rewards | ⚠️ | Streak only; no badges, leaderboards, age-configurable gamification |

---

## 4. CORE SYSTEM COMPONENTS

### 4.1 Data Integration Layer

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Google Classroom API integration | ❌ | None |
| CSV import | ❌ | None |
| Manual grade/assignment input | ⚠️ | Manual assignment add; no grades |
| Scheduled data sync (min 12h) | ❌ | No sync; local / in-memory state |
| Pull: assignments, due dates, submissions, grades, missing, roster | ❌ | None of these from LMS |
| POPIA compliance | ❌ | No compliance framework |
| OAuth authentication | ⚠️ | Firebase Auth available; demo uses email/password |
| Encrypted storage (at rest & transit) | ⚠️ | Depends on Firebase/hosting; not explicitly implemented |

### 4.2 Risk Scoring Engine

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Student Risk Score (0–100) | ❌ | None |
| Assignment Completion Rate (30%) | ⚠️ | Completion rate exists; not used for risk |
| Late Submission Frequency (20%) | ❌ | No late-submission tracking |
| Grade Trend Slope (25%) | ❌ | No grades |
| Engagement Consistency (15%) | ⚠️ | Streak exists; not formalized |
| Recovery Responsiveness (10%) | ❌ | No recovery model |
| Risk bands (80–100 Low, 60–79 Moderate, 40–59 High, <40 Critical) | ❌ | None |
| Daily / trigger-based recalculation | ❌ | None |

### 4.3 Forecasting Engine

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Projected term grade | ❌ | No grades |
| Risk of failing subject (%) | ❌ | None |
| Probability of late submission (14 days) | ❌ | None |
| Trend direction (Upward/Stable/Downward) | ❌ | None |
| Rolling average, trend slope, behaviour weighting | ❌ | None |

### 4.4 Early-Warning System

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Trigger conditions | ❌ | None |
| Risk drop ≥10 in 7 days | ❌ | No risk |
| Risk band change | ❌ | No bands |
| Grade slope decline ≥10% | ❌ | No grades |
| Consecutive late streak ≥3 | ❌ | No late tracking |
| Alert recipients (Teacher, Parent, Student) | ❌ | No alerts |
| Alert types | ❌ | None |

### 4.5 Intervention Engine

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Auto-generate recovery targets | ❌ | None |
| Parent dashboard corrective checklist | ❌ | None |
| Teacher logs intervention action | ❌ | Teacher comments only |
| Student streak protection goals | ❌ | None |
| Risk recalc after recovery window | ❌ | No risk model |

### 4.6 Dashboards

#### School Dashboard

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Top 20 at-risk students | ❌ | None |
| Risk distribution heatmap | ❌ | None |
| Subject performance comparison | ❌ | None |
| Intervention effectiveness | ❌ | None |

#### Teacher Dashboard

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Class risk overview | ❌ | None |
| Student trend graphs | ❌ | None |
| Intervention history log | ❌ | None |
| Performance change since last alert | ❌ | None |

#### Parent Dashboard

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Risk score display | ❌ | None |
| Projected grade | ❌ | None |
| Missed assignment summary | ⚠️ | Overview shows “Late” count; not parent-child specific |
| Weekly consistency report | ⚠️ | Pro analytics has this-week counts; no parent view |
| Recovery progress tracker | ❌ | None |

#### Student Dashboard

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Risk score | ❌ | None |
| Streak tracker | ✅ | Overview shows streak |
| Reward badges | ❌ | None |
| Progress graph | ⚠️ | Pro: 7-day bar chart, subject breakdown |
| Performance projection | ❌ | None |

### 4.7 Gamification Layer

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Submission streak rewards | ⚠️ | Streak display only |
| Weekly completion badges | ❌ | None |
| Recovery bonus points | ❌ | None |
| Class achievement leaderboards | ❌ | None |
| Age-configurable gamification | ❌ | None |

---

## 5. DATA LIMITS & CONTROLS

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Max file upload 20MB | ✅ | 20MB check on assignment file upload |
| Storage retention 1 year | ❌ | No retention policy |
| Per-student storage cap (default 15GB) | ❌ | None |
| Admin override permissions | ❌ | No admin |

---

## 6. SECURITY & COMPLIANCE

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| POPIA compliant | ❌ | Not addressed |
| Role-based access control | ⚠️ | Roles exist; minimal RBAC enforcement |
| Encrypted database | ⚠️ | Firebase; not custom implementation |
| Audit logs for data access | ❌ | None |
| Parental consent tracking | ❌ | None |
| Data deletion automation | ❌ | None |

---

## 7. TECH STACK (RECOMMENDED)

| Spec Component | HWC Status | Notes |
|----------------|------------|-------|
| Backend: Firebase (Firestore + Cloud Functions) | ⚠️ | Firebase initialized; Firestore imported but not used; no Cloud Functions |
| Storage: Google Cloud Storage | ❌ | File uploads in memory/base64 |
| Auth: Firebase Auth (Google SSO) | ⚠️ | Email/password; no Google SSO |
| Frontend: React | ✅ | Vite + React |
| Hosting: Firebase Hosting | ⚠️ | Vercel config present; Firebase Hosting not configured |

---

## 8. PERFORMANCE REQUIREMENTS

| Spec Requirement | HWC Status | Notes |
|------------------|------------|-------|
| Risk recalc < 2 sec | N/A | No risk engine |
| Dashboard load < 3 sec | ⚠️ | Client-side; no formal SLA |
| 99% uptime target | ⚠️ | Depends on hosting |
| Scale to 5,000 students/school | ❌ | Single-user / small-scale architecture |

---

## 9. MVP VS PHASE 2

### MVP Must Include

| MVP Item | HWC Status |
|----------|------------|
| Google Classroom integration | ❌ |
| Risk score engine | ❌ |
| Parent dashboard | ⚠️ (role exists, no dedicated dashboard) |
| Teacher dashboard | ⚠️ (role exists, no class/risk view) |
| Alert triggers | ❌ |
| Basic forecasting | ❌ |

### Phase 2

| Phase 2 Item | HWC Status |
|--------------|------------|
| Advanced predictive modeling | ❌ |
| Cross-school benchmarking | ❌ |
| Behavioural AI personalization | ❌ |
| Mobile app | ❌ (web only) |
| Tutor integration | ❌ |
| Pro subscription | ✅ (Paygate flow present) |

---

## SUMMARY: WHAT HWC HAS TODAY

| Category | Implemented |
|----------|-------------|
| **Auth & Roles** | Student, Parent, Teacher; email/password; Firebase ready |
| **Assignments** | Create, complete, due dates, subjects, progress, filters |
| **Overview** | Late/To-do/Done counts, streak, session timer, focus task |
| **Homework Tab** | List/grid, calendar, subject filters |
| **Analytics (Pro)** | Completion rate, streak, 7-day chart, subject breakdown |
| **Teacher** | Comments on assignments |
| **Profile** | Name, grade, school, email, favorite subject |
| **Subscriptions** | Paygate + Supabase flow for Pro |
| **File Upload** | 20MB limit on assignment attachments |

---

## SUMMARY: MAJOR GAPS FOR SPEC ALIGNMENT

1. **No LMS integration** – Google Classroom, CSV import, sync
2. **No risk scoring** – 0–100 score, bands, weighted components
3. **No forecasting** – grade projection, late probability, trend direction
4. **No early-warning / alerts** – triggers, notifications to Teacher/Parent/Student
5. **No intervention engine** – recovery targets, corrective workflows
6. **No Admin role / school scope** – schools, teachers, roster management
7. **No parent–child linking** – pairing code unused; parents cannot view child data
8. **No class/roster model** – teachers have no class or student list
9. **No grades** – assignment grades not stored or used
10. **Limited gamification** – streak only; no badges, leaderboards, age config
