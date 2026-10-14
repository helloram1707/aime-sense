# AIME Sense 2.0 · Affordable Intelligent Machine Evaluation

> **Tagline**: Affordable Machine Health Monitoring  
> **Official Context**: Rashtriya Innovation Challenge, organised by the Institution's Innovation Council (IIC), NIT Andhra Pradesh, in association with RTIH Rajamahendravaram  
> **Problem Statement**: *"How can small manufacturing units monitor machine health at low cost without investing in expensive Industry 4.0 systems?"*

---

## 1. Project Overview & Positioning

AIME Sense 2.0 is an affordable, explainable machine-health screening and maintenance-assistance platform engineered specifically for small manufacturing units (MSMEs/workshops). 

Rather than requiring proprietary Industry 4.0 platforms costing ₹1.5L to ₹5L, AIME Sense provides a phased screening pathway:
1. **Zero Added Hardware**: Use existing Android smartphones as experimental screening accelerometers.
2. **Explainable Mathematics**: Window-mean removal vector RMS, machine-specific reference baselines, and transparent threshold hysteresis.
3. **Actionable Operations**: Maintenance priority suggestions (P1/P2/P3), operator inspection checklists, downtime cost estimators, and early warning sensory inputs.
4. **Localization**: Complete multi-language UI supporting **Telugu (తెలుగు)**, **Hindi (हिन्दी)**, and **English**.
5. **Future Sensor Ready**: Direct backend and frontend architecture for low-cost wireless sensor nodes (ESP32 + ADXL355/ADXL345) via BLE, MQTT, and REST.

---

## 2. Implemented Features

### 1. Machine Registration & Inventory
- Records Machine ID, Name, Category (Motor, Pump, Compressor, Lathe, etc.), and Shop Floor Location.
- **Operating Run Hours** tracking and service interval monitoring.
- **Last Service Date** record.
- Configurable reference warning and critical threshold ratios.

### 2. Health Status Dashboard
- Instant **Green / Yellow / Red** status cards:
  - **Healthy (Green)**: Within operator-confirmed baseline bounds.
  - **Warning (Yellow)**: Approaching or crossing warning ratio.
  - **Critical (Red)**: Crossing critical threshold boundary.
- Total registered machines count and fleet breakdown.
- Real-time readout of latest RMS, timestamp, and active alert counters.

### 3. Maintenance Priority Suggestions
- Rule-based prioritization based on vibration alerts, run hours vs service intervals, and drift rates:
  - **P1 · Immediate Action Required** (Critical vibration).
  - **P2 · Scheduled Service Recommended** (Warning anomaly or overdue service hours).
  - **P3 · Routine Inspection Pending** (Normal operating state).
- Dynamic, category-specific shop floor inspection checklists (Mounting, Lubrication, Alignment, Electrical, Cavitation).
- Operator inspection completion logging.

### 4. Downtime Cost Estimator
- Computes financial exposure: `(Hourly Production Loss Rate) × (Estimated Outage Hours) × (Risk Probability)`.
- Contrasts unexpected breakdown losses with affordable preventive maintenance costs.
- Displays estimated Net Savings / Return on Investment (ROI).
- Interactive adjustments for hourly rate and outage duration.

### 5. Early Warning Indicators
- **Threshold Proximity Index**: Real-time percentage indicator of how close vibration is to the warning boundary.
- **Vibration Drift Trend**: Detects accelerating or rising trends across consecutive measurement windows.
- **Operator Sensory Flags**: Real shop floor physical observations:
  - Abnormal acoustic chatter / grinding
  - High surface casing temperature
  - Loose mounting or baseplate wobble
  - Oil / lubricant seal leakage
- Multi-modal scoring combining quantitative vibration with physical workshop observations.

### 6. Multi-Language UI (Telugu, Hindi, English)
- 1-click language switcher in top header and profile screen.
- Comprehensive technical translations for Telugu (`తెలుగు`), Hindi (`हिन्दी`), and English (`en`).

### 7. Future Sensor Integration Plan (Frontend & Backend)
- **Backend REST Ingestion**: `POST /api/sensors/ingest` with device token authentication and automated RMS evaluation.
- **BLE GATT Profile**: Nordic UART / ADXL355 streaming specification (`6e400001-b5a3-f393-e0a9-e50e24dcca9e`).
- **MQTT Telemetry**: `aime/machines/{id}/vibration` topic pipeline.
- **Frontend Sensor Manager**: In-app external sensor node simulation and streaming validation.
- **Low-Cost BOM**: Under ₹1,500 total using ESP32 + ADXL345/ADXL355.

### 8. Backend & Persistence
- Node.js backend with native SQLite database (`node:sqlite`).
- Cryptographic `scrypt` password hashing with unique random salts.
- Bearer token authentication with multi-tenant account isolation.
- Offline-first mobile persistence via `AsyncStorage`.
- Full CSV export and audit trail.

---

## 3. Directory Structure

```
AIME-Sense-2.0-Complete/
├── app.json                       # App identity, logo icon, splash, and Android package
├── package.json                   # Dependencies, build, test, and serve scripts
├── tsconfig.json                  # TypeScript strict configuration
├── .env.example                   # Environment configuration template
├── README.md                      # Complete project documentation
├── API.md                         # Complete REST API reference
├── TEST-REPORT.md                 # Automated test results & verification report
├── assets/
│   └── images/
│       ├── icon.png               # Official AIME Sense adaptive icon
│       └── logo.png               # High-res AIME Sense official logo
├── app/
│   ├── _layout.tsx                # App root provider wrapper (I18n, Auth, HealthStore)
│   ├── (auth)/
│   │   ├── welcome.tsx            # Welcome screen with logo and demo mode
│   │   ├── sign-in.tsx            # Secure user login
│   │   └── sign-up.tsx            # Account registration
│   └── (tabs)/
│       ├── _layout.tsx            # Navigation tab bar with multi-language titles
│       ├── index.tsx              # Dashboard (Green/Yellow/Red, Estimator, Priorities)
│       ├── monitor.tsx            # Live phone sensor capture & external sensor node test
│       ├── lab.tsx                # Validation lab with simulated normal/warning/critical
│       ├── history.tsx            # Observation history & CSV export
│       ├── guide.tsx              # Presentation script, NIT Andhra statement & sensor plan
│       └── profile.tsx            # Language selection, storage mode, reset & sign out
├── components/
│   ├── auth.tsx                   # Auth UI, official BrandMark and Wordmark
│   ├── DashboardHero.tsx          # Dashboard header with logo and status breakdown
│   └── ui.tsx                     # Reusable industrial UI components
├── context/
│   ├── AuthContext.tsx            # Auth state, REST API integration, and offline fallback
│   └── HealthStore.tsx           # Health state, run hours, baselines, and persistence
├── src/
│   ├── core/
│   │   ├── healthEngine.ts        # Signal validation, vector RMS, hysteresis rules
│   │   ├── analyzeWindow.ts       # Window analysis pipeline
│   │   ├── downtimeEstimator.ts   # Downtime cost and financial risk calculations
│   │   ├── maintenancePriority.ts # Priority ranking (P1/P2/P3) and checklists
│   │   ├── earlyWarning.ts        # Vibration drift & operator sensory flags
│   │   ├── sensorManager.ts       # BLE/MQTT/WiFi external sensor architecture
│   │   ├── csv.ts                 # Sanitized CSV import and export
│   │   ├── demoData.ts            # Controlled synthetic benchmarks
│   │   └── validationLab.ts       # Validation laboratory test suite
│   └── i18n/
│       ├── translations.ts        # Telugu, Hindi, English dictionaries
│       └── I18nContext.tsx        # Persistent multi-language provider
└── server/
    ├── serve.js                   # Unified server (API + Expo static hosting)
    ├── api.js                     # REST API router (Auth, Machines, Ingest, Alerts)
    ├── db.js                      # Persistent SQLite database layer (node:sqlite)
    ├── auth.js                    # Scrypt password hashing & HMAC tokens
    └── tests/
        └── api.test.js            # Automated backend integration tests
```

---

## 4. Quick Start Commands

### Prerequisites
- Node.js 22 LTS or newer (tested on v24.14.0)
- pnpm or npm

### Installation
```bash
# In artifacts/aime-machine-health (or workspace root)
pnpm install
```

### Running Tests
Execute all unit tests and backend API integration tests:
```bash
pnpm run test
```

### Running Typecheck
Verify TypeScript correctness:
```bash
pnpm run typecheck
```

### Starting the Backend & API Server
```bash
pnpm run serve
# Server runs on http://localhost:3000
# REST API available on http://localhost:3000/api/*
```

### Starting the Mobile App (Expo)
```bash
pnpm run start
# Scan the QR code using Expo Go on Android
```

---

## 5. Android APK Build Instructions

To build a standalone production or debug Android APK on a computer with Android Studio:

```bash
# 1. Generate the native Android project
pnpm exec expo prebuild --platform android

# 2. Build Debug APK with Gradle
cd android
./gradlew assembleDebug

# Output APK path:
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 6. Official Submission Alignment

| Requirement | Implementation in AIME Sense 2.0 |
|---|---|
| **Low-Cost Monitoring** | Uses existing smartphone sensors; future external sensor BOM is < ₹1,500. |
| **Explainable Health Status** | Simple Green/Yellow/Red indicators based on transparent vector RMS relative to baseline. |
| **Maintenance Prioritization** | Rule-based P1/P2/P3 priorities with actionable shop-floor inspection checklists. |
| **Downtime Cost Awareness** | Interactive estimator showing financial loss risk vs preventive maintenance ROI. |
| **Early Warning** | Quantitative drift tracking combined with real operator physical sensory flags. |
| **Multi-Language Inclusion** | Native support for Telugu, Hindi, and English to empower local workshop operators. |
| **Future Sensor Integration** | Production backend ingestion API (`POST /api/sensors/ingest`) and BLE/MQTT architecture. |
