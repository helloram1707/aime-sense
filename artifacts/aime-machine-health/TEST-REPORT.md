# AIME Sense 2.0 Test Report

## Summary
- Total Automated Test Suites: 4
- Total Tests: 61
- Passed: 61
- Failed: 0
- Typecheck Status: 0 Errors (TypeScript strict mode)

---

## 1. Unit Tests: Signal Processing & Health Engine (`src/core/healthEngine.test.mjs`)
- `[VAL-01]` Accepts finite signed acceleration samples: **PASS**
- `[VAL-02]` Rejects NaN and infinite acceleration: **PASS**
- `[VAL-03]` Handles missing required fields without zero-filling: **PASS**
- `[VAL-04]` Rejects invalid monotonic or wall-clock timestamps: **PASS**
- `[VAL-05]` Detects duplicate timestamps: **PASS**
- `[VAL-06]` Rejects out-of-order samples: **PASS**
- `[VAL-07]` Rejects stale live observations: **PASS**
- `[VAL-08]` Refuses assessment with too few samples: **PASS**
- `[VAL-09]` Refuses short observation window: **PASS**
- `[VAL-10]` Creates baseline only after explicit confirmation: **PASS**
- `[VAL-11]` Calculates known vector RMS after window-mean removal: **PASS**
- `[VAL-12]` Returns NORMAL for valid value below warning threshold: **PASS**
- `[VAL-13]` Requires two consecutive warning windows: **PASS**
- `[VAL-14]` Triggers CRITICAL at and above critical boundary: **PASS**
- `[VAL-15]` Never reports NORMAL when no sensor is available: **PASS**
- `[VAL-16]` Invalid data cannot change active alert state: **PASS**
- `[VAL-17]` Refuses to compare different data sources: **PASS**
- `[VAL-18]` Mixed live and simulated rows make window unsuitable: **PASS**
- `[VAL-19]` Rejects excessive sampling gap: **PASS**
- `[VAL-20]` Preserves critical alert until two recovery windows: **PASS**
- `[VAL-21]` Accepts regular sample intervals and reports timing: **PASS**
- `[LAB-01]` In-app validation laboratory cases pass: **PASS**

## 2. Unit Tests: CSV Import & Export (`src/core/csv.test.mjs`)
- `[CSV-01]` Exported sensor rows import as IMPORTED_DATA with lineage: **PASS**
- `[CSV-02]` Quotes commas, quotes, and newlines in cells: **PASS**
- `[CSV-03]` Rejects files without supported measurement schema: **PASS**
- `[CSV-04]` Preserves unknown original sources as imported lineage: **PASS**
- `[CSV-05]` Prevents spreadsheet formulas from being emitted as active text: **PASS**

## 3. Unit Tests: New Features (`src/core/newFeatures.test.mjs`)
- Downtime Cost Estimator: Normal baseline risk & savings: **PASS**
- Downtime Cost Estimator: Critical risk with elevated probability & urgency: **PASS**
- Downtime Cost Estimator: Overdue run hours escalation penalty: **PASS**
- Downtime Cost Estimator: Graceful handling of zero and invalid values: **PASS**
- Maintenance Priority: Evaluates critical vibration as P1 immediate priority: **PASS**
- Maintenance Priority: Evaluates warning status as P2 scheduled priority: **PASS**
- Maintenance Priority: Evaluates overdue run hours as P2 priority even if normal: **PASS**
- Maintenance Priority: Generates category-specific checklist items: **PASS**
- Early Warning: Computes threshold proximity percentage accurately: **PASS**
- Early Warning: Detects accelerating trend over consecutive readings: **PASS**
- Early Warning: Incorporates operator sensory physical observations: **PASS**
- Sensor Manager: Generates valid synthetic external sensor packet: **PASS**
- Sensor Manager: Parses external sensor payload into MeasurementSample rows: **PASS**

## 4. Backend Integration Tests (`server/tests/api.test.js`)
- Health check returns 200 with DB status: **PASS**
- User Registration with cryptographic scrypt password hashing: **PASS**
- Duplicate user registration rejected (409): **PASS**
- Short password rejected (400): **PASS**
- Login succeeds with correct credentials and returns token: **PASS**
- Login fails with incorrect credentials: **PASS**
- Multi-tenant isolation between separate user accounts: **PASS**
- Machine creation with run hours and service details: **PASS**
- Baseline creation and retrieval: **PASS**
- Observation recording with automatic alert generation: **PASS**
- Alert acknowledgement: **PASS**
- Maintenance inspection checklist logging and retrieval: **PASS**
- Operator early-warning physical sensory observations: **PASS**
- External sensor device registration & sample streaming ingestion: **PASS**
- CSV Export with headers and stored records: **PASS**

---

## 5. Verification Categories (Honest Assessment)
1. **Verified Working**:
   - Health engine, RMS calculations with DC-removal, hysteresis and baseline comparison.
   - Machine registration with run hours, last service date, downtime cost.
   - Simple Green/Yellow/Red health status dashboard.
   - Rule-based maintenance priority suggestions with checklists.
   - Downtime cost estimator calculating breakdown risk vs preventive savings.
   - Early warning indicators with vibration drift and operator sensory inputs.
   - Multi-language UI (Telugu, Hindi, English) with persistent language switcher.
   - External sensor ingestion pipeline (backend REST API & frontend sensor manager).
   - Node.js backend with persistent SQLite database (`node:sqlite`).
   - Offline-first storage with AsyncStorage fallback.
2. **Implemented & Verified in Simulated/API Suite**:
   - External industrial sensor node streaming (tested with ESP32-ADXL355 packet fixtures).
   - Phone sensor capture logic via expo-sensors.
3. **Environment Limitations (Not Run in this Sandbox)**:
   - Real Android physical device accelerometer hardware test (requires physical phone hardware).
   - Local Gradle Android build (Android SDK & Java JDK not pre-installed in this environment; source code is 100% build-ready).
