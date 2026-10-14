/**
 * Persistent SQLite Database Layer for AIME Sense.
 * Uses Node.js native DatabaseSync (node:sqlite) in Node v22+.
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

let currentDb = null;

function getDb(dbPath) {
  if (currentDb && !dbPath) return currentDb;

  const targetPath = dbPath || process.env.AIME_DB_PATH || path.resolve(__dirname, '..', 'data', 'aime_sense.db');

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);

  // Initialize schema with foreign keys enabled
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      workshop TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT DEFAULT 'Shop Floor',
      run_hours REAL DEFAULT 0,
      last_service_date TEXT DEFAULT '',
      service_interval_hours REAL DEFAULT 500,
      hourly_downtime_cost REAL DEFAULT 2500,
      warning_ratio REAL DEFAULT 1.5,
      critical_ratio REAL DEFAULT 2.0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS baselines (
      machine_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source TEXT NOT NULL,
      rms_mps2 REAL NOT NULL,
      sample_count INTEGER NOT NULL,
      duration_ms REAL NOT NULL,
      method TEXT NOT NULL,
      established_at INTEGER NOT NULL,
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      machine_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      source TEXT NOT NULL,
      original_data_source TEXT,
      captured_at INTEGER NOT NULL,
      rms_mps2 REAL,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      alert_raised INTEGER DEFAULT 0,
      data_json TEXT,
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      machine_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      observation_id TEXT,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      reason TEXT NOT NULL,
      observed_rms REAL,
      threshold_rms REAL,
      acknowledged INTEGER DEFAULT 0,
      acknowledged_at INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id TEXT PRIMARY KEY,
      machine_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      priority TEXT NOT NULL,
      checklist_json TEXT NOT NULL,
      notes TEXT,
      operator_name TEXT,
      completed_at INTEGER NOT NULL,
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS operator_observations (
      id TEXT PRIMARY KEY,
      machine_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      abnormal_noise INTEGER DEFAULT 0,
      high_surface_temp INTEGER DEFAULT 0,
      loose_mounting INTEGER DEFAULT 0,
      oil_leakage INTEGER DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS external_sensors (
      id TEXT PRIMARY KEY,
      machine_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      sensor_type TEXT NOT NULL,
      device_token TEXT NOT NULL UNIQUE,
      model TEXT DEFAULT 'ADXL355-ESP32',
      status TEXT DEFAULT 'ACTIVE',
      last_ping INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (machine_id) REFERENCES machines(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  if (!dbPath) {
    currentDb = db;
  }
  return db;
}

module.exports = { getDb };
