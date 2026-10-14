# AIME Sense 2.0 REST API Documentation

The AIME Sense backend runs as a high-performance, lightweight Node.js service backed by a persistent SQLite database (`node:sqlite`).

Base URL: `http://localhost:3000` (or configured `PORT`)

---

## 1. System Health

### `GET /api/health`
Checks server and database connection status.
- **Headers**: None
- **Response `200 OK`**:
```json
{
  "status": "OK",
  "app": "AIME Sense API",
  "version": "2.0.0",
  "tagline": "Affordable Machine Health Monitoring",
  "timestamp": 1791942000000,
  "dbConnected": true
}
```

---

## 2. Authentication & User Management

### `POST /api/auth/register`
Creates an operator account with cryptographic `scrypt` password hashing and unique salt.
- **Request Body**:
```json
{
  "name": "Ramesh Rao",
  "email": "ramesh@workshop.in",
  "workshop": "Rao Precision Works",
  "password": "securePassword123"
}
```
- **Response `201 Created`**:
```json
{
  "message": "Account created successfully",
  "token": "<HMAC_BEARER_TOKEN>",
  "user": {
    "id": "usr_...",
    "name": "Ramesh Rao",
    "email": "ramesh@workshop.in",
    "workshop": "Rao Precision Works",
    "createdAtMs": 1791942000000
  }
}
```

### `POST /api/auth/login`
Authenticates credentials and returns a 30-day bearer token.
- **Request Body**:
```json
{
  "email": "ramesh@workshop.in",
  "password": "securePassword123"
}
```
- **Response `200 OK`**: Returns token and user profile.

### `GET /api/auth/me`
Fetches current authenticated profile.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Returns user profile.

---

## 3. Machine Management

### `GET /api/machines`
Lists all machines registered by the authenticated user with baselines.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "machines": [
    {
      "id": "PUMP-01",
      "name": "Workshop Cooling Pump",
      "category": "Water pump",
      "location": "Bay 2 · Main Line",
      "runHours": 180,
      "lastServiceDate": "2026-09-01",
      "serviceIntervalHours": 500,
      "hourlyDowntimeCost": 2500,
      "thresholds": {
        "warningRatio": 1.5,
        "criticalRatio": 2.0
      },
      "baseline": {
        "machineId": "PUMP-01",
        "source": "LIVE_SENSOR",
        "rmsMps2": 0.38,
        "establishedAtMs": 1791942000000,
        "sampleCount": 80,
        "durationMs": 4000,
        "method": "WINDOW_MEAN_REMOVAL_VECTOR_RMS"
      },
      "createdAtMs": 1791942000000
    }
  ]
}
```

### `POST /api/machines`
Registers a new machine.
- **Request Body**:
```json
{
  "id": "MOTOR-02",
  "name": "Exhaust Motor 5HP",
  "category": "Electric motor",
  "location": "Paint Booth",
  "runHours": 450,
  "lastServiceDate": "2026-08-15",
  "serviceIntervalHours": 500,
  "hourlyDowntimeCost": 3500,
  "thresholds": {
    "warningRatio": 1.5,
    "criticalRatio": 2.0
  }
}
```
- **Response `201 Created`**

### `PUT /api/machines/:id`
Updates machine details, run hours, service intervals, or thresholds.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**

### `DELETE /api/machines/:id`
Removes machine and associated observations.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**

---

## 4. Baseline Management

### `POST /api/machines/:id/baseline`
Establishes an operator-confirmed reference baseline.
- **Request Body**:
```json
{
  "source": "LIVE_SENSOR",
  "rmsMps2": 0.42,
  "sampleCount": 80,
  "durationMs": 4000,
  "method": "WINDOW_MEAN_REMOVAL_VECTOR_RMS"
}
```

---

## 5. Measurements & Observations

### `POST /api/observations`
Stores an analyzed measurement window and automatically raises an alert if thresholds are breached.
- **Request Body**:
```json
{
  "machineId": "PUMP-01",
  "source": "LIVE_SENSOR",
  "capturedAtMs": 1791942000000,
  "rmsMps2": 0.65,
  "decision": {
    "status": "WARNING",
    "alertRaised": true,
    "reason": "Vibration elevated above warning threshold ratio."
  }
}
```

### `GET /api/observations`
Lists observation history, with optional `?machineId=` filter.

---

## 6. Alerts & Acknowledgements

### `GET /api/alerts`
Returns recent alerts across the user's machines.

### `PATCH /api/alerts/:id/ack`
Marks an alert as acknowledged by an operator.

---

## 7. Maintenance Priority & Inspection Logs

### `POST /api/maintenance`
Logs shop-floor maintenance inspection checklist completion.
- **Request Body**:
```json
{
  "machineId": "PUMP-01",
  "priority": "P2",
  "checklist": [
    { "id": "chk-mount", "task": "Inspect bolts", "completed": true },
    { "id": "chk-lube", "task": "Grease bearings", "completed": true }
  ],
  "notes": "Tightened loose foundation bolt.",
  "operatorName": "Ramesh Rao"
}
```

---

## 8. External Sensor Node Ingestion Pipeline

### `POST /api/sensors/ingest`
Ingests streaming samples from external industrial sensor nodes (BLE bridge, ESP32, MQTT gateway).
- **Headers**: `x-device-token: <DEVICE_TOKEN>` (or `Authorization: Bearer <token>`)
- **Request Body**:
```json
{
  "machineId": "PUMP-01",
  "sensorType": "BLE_ACCEL",
  "samples": [
    { "x": 0.05, "y": 0.12, "z": 0.38 },
    { "x": 0.08, "y": 0.15, "z": 0.42 }
  ]
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "observationId": "obs_...",
  "rmsMps2": 0.432,
  "status": "NORMAL",
  "alertRaised": false,
  "reason": "Observed RMS 0.432 m/s² is within normal bounds."
}
```

---

## 9. History Export

### `GET /api/export/csv?machineId=PUMP-01`
Downloads complete historical measurement log as CSV.
