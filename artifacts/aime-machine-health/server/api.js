/**
 * Complete REST API Router for AIME Sense.
 * Supports Auth, Machines, Baselines, Observations, Alerts, Maintenance,
 * Early Warning, External Sensor Ingestion, and CSV Export.
 */

const { getDb } = require('./db');
const { hashPassword, verifyPassword, generateToken, verifyToken } = require('./auth');
const crypto = require('crypto');

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) {
        // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-token',
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message, details = null) {
  sendJson(res, statusCode, {
    error: message,
    status: statusCode,
    ...(details ? { details } : {}),
  });
}

function authenticate(req, res, db) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 401, 'Unauthorized: Missing or invalid Bearer token');
    return null;
  }
  const token = authHeader.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    sendError(res, 401, 'Unauthorized: Invalid or expired token');
    return null;
  }
  const user = db.prepare('SELECT id, name, email, workshop FROM users WHERE id = ?').get(payload.sub);
  if (!user) {
    sendError(res, 401, 'Unauthorized: User account not found');
    return null;
  }
  return user;
}

/**
 * Computes vector RMS after window-mean removal for raw sensor samples.
 */
function computeWindowRms(samples) {
  if (!Array.isArray(samples) || samples.length === 0) return null;
  const count = samples.length;
  let sumX = 0, sumY = 0, sumZ = 0;
  for (const s of samples) {
    sumX += s.x;
    sumY += s.y;
    sumZ += s.z;
  }
  const meanX = sumX / count;
  const meanY = sumY / count;
  const meanZ = sumZ / count;

  let sumSquares = 0;
  for (const s of samples) {
    const dx = s.x - meanX;
    const dy = s.y - meanY;
    const dz = s.z - meanZ;
    sumSquares += dx * dx + dy * dy + dz * dz;
  }
  return Math.sqrt(sumSquares / count);
}

async function handleApiRequest(req, res, customDb = null) {
  const db = customDb || getDb();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-device-token',
    });
    res.end();
    return true;
  }

  // 1. Health check
  if (pathname === '/api/health' && method === 'GET') {
    sendJson(res, 200, {
      status: 'OK',
      app: 'AIME Sense API',
      version: '2.0.0',
      tagline: 'Affordable Machine Health Monitoring',
      timestamp: Date.now(),
      dbConnected: true,
    });
    return true;
  }

  // 2. Auth: Register
  if (pathname === '/api/auth/register' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { name, email, workshop, password } = body;

      if (!name || !email || !password) {
        sendError(res, 400, 'Name, email, and password are required');
        return true;
      }
      if (password.length < 6) {
        sendError(res, 400, 'Password must be at least 6 characters');
        return true;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (existing) {
        sendError(res, 409, 'An account with this email already exists');
        return true;
      }

      const { salt, hash } = hashPassword(password);
      const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const now = Date.now();

      db.prepare(`
        INSERT INTO users (id, name, email, workshop, password_hash, salt, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(userId, name.trim(), normalizedEmail, (workshop || 'Workshop').trim(), hash, salt, now);

      const token = generateToken(userId, normalizedEmail);
      sendJson(res, 201, {
        message: 'Account created successfully',
        token,
        user: {
          id: userId,
          name: name.trim(),
          email: normalizedEmail,
          workshop: (workshop || 'Workshop').trim(),
          createdAtMs: now,
        },
      });
      return true;
    } catch (err) {
      sendError(res, 500, err.message);
      return true;
    }
  }

  // 3. Auth: Login
  if (pathname === '/api/auth/login' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { email, password } = body;
      if (!email || !password) {
        sendError(res, 400, 'Email and password are required');
        return true;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
      if (!user) {
        sendError(res, 401, 'Invalid email or password');
        return true;
      }

      const isValid = verifyPassword(password, user.salt, user.password_hash);
      if (!isValid) {
        sendError(res, 401, 'Invalid email or password');
        return true;
      }

      const token = generateToken(user.id, user.email);
      sendJson(res, 200, {
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          workshop: user.workshop,
          createdAtMs: user.created_at,
        },
      });
      return true;
    } catch (err) {
      sendError(res, 500, err.message);
      return true;
    }
  }

  // 4. Auth: Me
  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = authenticate(req, res, db);
    if (!user) return true;
    sendJson(res, 200, { user });
    return true;
  }

  // 5. External Sensor Ingestion Endpoint (Can authenticate via x-device-token or Bearer token)
  if (pathname === '/api/sensors/ingest' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const deviceToken = req.headers['x-device-token'] || body.deviceToken;
      let machine = null;
      let userId = null;

      if (deviceToken) {
        const sensor = db.prepare('SELECT * FROM external_sensors WHERE device_token = ?').get(deviceToken);
        if (sensor) {
          machine = db.prepare('SELECT * FROM machines WHERE id = ?').get(sensor.machine_id);
          userId = sensor.user_id;
          db.prepare('UPDATE external_sensors SET last_ping = ? WHERE id = ?').run(Date.now(), sensor.id);
        }
      }

      if (!machine) {
        const user = authenticate(req, res, db);
        if (!user) return true;
        userId = user.id;
        machine = db.prepare('SELECT * FROM machines WHERE id = ? AND user_id = ?').get(body.machineId);
      }

      if (!machine) {
        sendError(res, 404, 'Machine not found for sensor ingestion');
        return true;
      }

      const samples = body.samples;
      if (!Array.isArray(samples) || samples.length < 10) {
        sendError(res, 400, 'At least 10 acceleration samples required for window assessment');
        return true;
      }

      const rms = computeWindowRms(samples);
      const baseline = db.prepare('SELECT * FROM baselines WHERE machine_id = ?').get(machine.id);

      let status = 'NORMAL';
      let alertRaised = 0;
      let reason = `Observed RMS ${rms.toFixed(3)} m/s² is within normal bounds.`;

      if (baseline && baseline.rms_mps2 > 0) {
        const warnThreshold = baseline.rms_mps2 * machine.warning_ratio;
        const critThreshold = baseline.rms_mps2 * machine.critical_ratio;

        if (rms >= critThreshold) {
          status = 'CRITICAL';
          alertRaised = 1;
          reason = `Critical vibration: RMS ${rms.toFixed(3)} m/s² exceeded critical threshold (${critThreshold.toFixed(3)} m/s²).`;
        } else if (rms >= warnThreshold) {
          status = 'WARNING';
          alertRaised = 1;
          reason = `Elevated vibration: RMS ${rms.toFixed(3)} m/s² exceeded warning threshold (${warnThreshold.toFixed(3)} m/s²).`;
        }
      }

      const observationId = `obs_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = Date.now();

      db.prepare(`
        INSERT INTO observations (id, machine_id, user_id, source, original_data_source, captured_at, rms_mps2, status, reason, alert_raised, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        observationId,
        machine.id,
        userId,
        'LIVE_SENSOR',
        body.sensorType || 'EXTERNAL_NODE',
        now,
        rms,
        status,
        reason,
        alertRaised,
        JSON.stringify({ sampleCount: samples.length, durationMs: samples.length * 20 }),
      );

      if (alertRaised) {
        const alertId = `alt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        db.prepare(`
          INSERT INTO alerts (id, machine_id, user_id, observation_id, status, severity, reason, observed_rms, threshold_rms, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          alertId,
          machine.id,
          userId,
          observationId,
          status,
          status,
          reason,
          rms,
          baseline ? baseline.rms_mps2 * machine.warning_ratio : null,
          now,
        );
      }

      sendJson(res, 201, {
        success: true,
        observationId,
        rmsMps2: rms,
        status,
        alertRaised: Boolean(alertRaised),
        reason,
      });
      return true;
    } catch (err) {
      sendError(res, 500, err.message);
      return true;
    }
  }

  // All remaining routes require user authentication
  const user = authenticate(req, res, db);
  if (!user) return true;

  // 6. Machines: GET List
  if (pathname === '/api/machines' && method === 'GET') {
    const machines = db.prepare('SELECT * FROM machines WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
    const baselines = db.prepare('SELECT * FROM baselines WHERE user_id = ?').all(user.id);
    const baselineMap = new Map(baselines.map((b) => [b.machine_id, b]));

    const result = machines.map((m) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      location: m.location,
      runHours: m.run_hours,
      lastServiceDate: m.last_service_date,
      serviceIntervalHours: m.service_interval_hours,
      hourlyDowntimeCost: m.hourly_downtime_cost,
      thresholds: {
        warningRatio: m.warning_ratio,
        criticalRatio: m.critical_ratio,
      },
      baseline: baselineMap.get(m.id)
        ? {
            machineId: m.id,
            source: baselineMap.get(m.id).source,
            rmsMps2: baselineMap.get(m.id).rms_mps2,
            establishedAtMs: baselineMap.get(m.id).established_at,
            sampleCount: baselineMap.get(m.id).sample_count,
            durationMs: baselineMap.get(m.id).duration_ms,
            method: baselineMap.get(m.id).method,
            confirmedReferenceCondition: true,
          }
        : null,
      createdAtMs: m.created_at,
    }));

    sendJson(res, 200, { machines: result });
    return true;
  }

  // 7. Machines: POST Create
  if (pathname === '/api/machines' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const {
        id,
        name,
        category,
        location,
        runHours,
        lastServiceDate,
        serviceIntervalHours,
        hourlyDowntimeCost,
        thresholds,
      } = body;

      if (!id || !name) {
        sendError(res, 400, 'Machine ID and name are required');
        return true;
      }

      const existing = db.prepare('SELECT id FROM machines WHERE id = ? AND user_id = ?').get(id.trim(), user.id);
      if (existing) {
        sendError(res, 409, 'Machine with this ID already registered in your workshop');
        return true;
      }

      const warnRatio = Number(thresholds?.warningRatio) || 1.5;
      const critRatio = Number(thresholds?.criticalRatio) || 2.0;

      if (warnRatio <= 1.0 || critRatio <= warnRatio) {
        sendError(res, 400, 'Critical ratio must be greater than warning ratio (> 1.0)');
        return true;
      }

      const now = Date.now();
      db.prepare(`
        INSERT INTO machines (
          id, user_id, name, category, location, run_hours, last_service_date,
          service_interval_hours, hourly_downtime_cost, warning_ratio, critical_ratio, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id.trim(),
        user.id,
        name.trim(),
        (category || 'Other').trim(),
        (location || 'Shop Floor').trim(),
        Number(runHours) || 0,
        (lastServiceDate || '').trim(),
        Number(serviceIntervalHours) || 500,
        Number(hourlyDowntimeCost) || 2500,
        warnRatio,
        critRatio,
        now,
        now,
      );

      sendJson(res, 201, {
        message: 'Machine created successfully',
        machine: {
          id: id.trim(),
          name: name.trim(),
          category: (category || 'Other').trim(),
          location: (location || 'Shop Floor').trim(),
          runHours: Number(runHours) || 0,
          lastServiceDate: (lastServiceDate || '').trim(),
          serviceIntervalHours: Number(serviceIntervalHours) || 500,
          hourlyDowntimeCost: Number(hourlyDowntimeCost) || 2500,
          thresholds: { warningRatio: warnRatio, criticalRatio: critRatio },
          baseline: null,
          createdAtMs: now,
        },
      });
      return true;
    } catch (err) {
      sendError(res, 500, err.message);
      return true;
    }
  }

  // 8. Machines: PUT Update / DELETE Delete
  const machineMatch = pathname.match(/^\/api\/machines\/([^/]+)$/);
  if (machineMatch) {
    const targetMachineId = decodeURIComponent(machineMatch[1]);
    const machine = db.prepare('SELECT * FROM machines WHERE id = ? AND user_id = ?').get(targetMachineId, user.id);
    if (!machine) {
      sendError(res, 404, 'Machine not found');
      return true;
    }

    if (method === 'PUT') {
      try {
        const body = await parseJsonBody(req);
        const name = body.name || machine.name;
        const category = body.category || machine.category;
        const location = body.location || machine.location;
        const runHours = body.runHours !== undefined ? Number(body.runHours) : machine.run_hours;
        const lastServiceDate = body.lastServiceDate !== undefined ? body.lastServiceDate : machine.last_service_date;
        const serviceIntervalHours = body.serviceIntervalHours !== undefined ? Number(body.serviceIntervalHours) : machine.service_interval_hours;
        const hourlyDowntimeCost = body.hourlyDowntimeCost !== undefined ? Number(body.hourlyDowntimeCost) : machine.hourly_downtime_cost;
        const warnRatio = Number(body.thresholds?.warningRatio) || machine.warning_ratio;
        const critRatio = Number(body.thresholds?.criticalRatio) || machine.critical_ratio;

        db.prepare(`
          UPDATE machines SET
            name = ?, category = ?, location = ?, run_hours = ?, last_service_date = ?,
            service_interval_hours = ?, hourly_downtime_cost = ?, warning_ratio = ?, critical_ratio = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `).run(
          name, category, location, runHours, lastServiceDate,
          serviceIntervalHours, hourlyDowntimeCost, warnRatio, critRatio, Date.now(),
          targetMachineId, user.id,
        );

        sendJson(res, 200, { message: 'Machine updated successfully' });
        return true;
      } catch (err) {
        sendError(res, 500, err.message);
        return true;
      }
    }

    if (method === 'DELETE') {
      db.prepare('DELETE FROM machines WHERE id = ? AND user_id = ?').run(targetMachineId, user.id);
      sendJson(res, 200, { message: 'Machine deleted successfully' });
      return true;
    }
  }

  // 9. Baseline: POST / GET
  const baselineMatch = pathname.match(/^\/api\/machines\/([^/]+)\/baseline$/);
  if (baselineMatch) {
    const targetMachineId = decodeURIComponent(baselineMatch[1]);
    const machine = db.prepare('SELECT id FROM machines WHERE id = ? AND user_id = ?').get(targetMachineId, user.id);
    if (!machine) {
      sendError(res, 404, 'Machine not found');
      return true;
    }

    if (method === 'GET') {
      const baseline = db.prepare('SELECT * FROM baselines WHERE machine_id = ? AND user_id = ?').get(targetMachineId, user.id);
      sendJson(res, 200, { baseline: baseline || null });
      return true;
    }

    if (method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const { source, rmsMps2, sampleCount, durationMs, method: baselineMethod } = body;

        if (!source || !Number.isFinite(rmsMps2) || rmsMps2 <= 0) {
          sendError(res, 400, 'Valid baseline source and positive RMS value required');
          return true;
        }

        const now = Date.now();
        db.prepare(`
          INSERT INTO baselines (machine_id, user_id, source, rms_mps2, sample_count, duration_ms, method, established_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(machine_id) DO UPDATE SET
            source = excluded.source,
            rms_mps2 = excluded.rms_mps2,
            sample_count = excluded.sample_count,
            duration_ms = excluded.duration_ms,
            method = excluded.method,
            established_at = excluded.established_at
        `).run(
          targetMachineId,
          user.id,
          source,
          rmsMps2,
          sampleCount || 0,
          durationMs || 0,
          baselineMethod || 'WINDOW_MEAN_REMOVAL_VECTOR_RMS',
          now,
        );

        sendJson(res, 201, { message: 'Baseline established successfully' });
        return true;
      } catch (err) {
        sendError(res, 500, err.message);
        return true;
      }
    }
  }

  // 10. Observations: GET / POST
  if (pathname === '/api/observations' && method === 'GET') {
    const machineId = url.searchParams.get('machineId');
    let query = 'SELECT * FROM observations WHERE user_id = ?';
    const params = [user.id];
    if (machineId) {
      query += ' AND machine_id = ?';
      params.push(machineId);
    }
    query += ' ORDER BY captured_at DESC LIMIT 200';
    const rows = db.prepare(query).all(...params);
    sendJson(res, 200, { observations: rows });
    return true;
  }

  if (pathname === '/api/observations' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const {
        id,
        machineId,
        source,
        originalDataSource,
        capturedAtMs,
        rmsMps2,
        decision,
        validation,
      } = body;

      const recordId = id || `obs_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = capturedAtMs || Date.now();
      const status = decision?.status || 'INSUFFICIENT_DATA';
      const reason = decision?.reason || '';
      const alertRaised = decision?.alertRaised ? 1 : 0;

      db.prepare(`
        INSERT INTO observations (id, machine_id, user_id, source, original_data_source, captured_at, rms_mps2, status, reason, alert_raised, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        recordId,
        machineId,
        user.id,
        source || 'LIVE_SENSOR',
        originalDataSource || null,
        now,
        rmsMps2 || null,
        status,
        reason,
        alertRaised,
        JSON.stringify({ validation }),
      );

      if (alertRaised) {
        const alertId = `alt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        db.prepare(`
          INSERT INTO alerts (id, machine_id, user_id, observation_id, status, severity, reason, observed_rms, threshold_rms, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          alertId,
          machineId,
          user.id,
          recordId,
          status,
          status,
          reason,
          rmsMps2 || null,
          decision?.warningThresholdMps2 || null,
          now,
        );
      }

      sendJson(res, 201, { success: true, id: recordId });
      return true;
    } catch (err) {
      sendError(res, 500, err.message);
      return true;
    }
  }

  // 11. Alerts: GET / PATCH Ack
  if (pathname === '/api/alerts' && method === 'GET') {
    const alerts = db.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(user.id);
    sendJson(res, 200, { alerts });
    return true;
  }

  const alertAckMatch = pathname.match(/^\/api\/alerts\/([^/]+)\/ack$/);
  if (alertAckMatch && method === 'PATCH') {
    const alertId = decodeURIComponent(alertAckMatch[1]);
    db.prepare('UPDATE alerts SET acknowledged = 1, acknowledged_at = ? WHERE id = ? AND user_id = ?').run(Date.now(), alertId, user.id);
    sendJson(res, 200, { success: true, message: 'Alert acknowledged' });
    return true;
  }

  // 12. Maintenance Logs: GET / POST
  if (pathname === '/api/maintenance' && method === 'GET') {
    const logs = db.prepare('SELECT * FROM maintenance_logs WHERE user_id = ? ORDER BY completed_at DESC').all(user.id);
    sendJson(res, 200, { logs });
    return true;
  }

  if (pathname === '/api/maintenance' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { machineId, priority, checklist, notes, operatorName } = body;
      const logId = `mt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = Date.now();

      db.prepare(`
        INSERT INTO maintenance_logs (id, machine_id, user_id, priority, checklist_json, notes, operator_name, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        logId,
        machineId,
        user.id,
        priority || 'P3',
        JSON.stringify(checklist || []),
        notes || '',
        operatorName || user.name,
        now,
      );

      sendJson(res, 201, { success: true, id: logId });
      return true;
    } catch (err) {
      sendError(res, 500, err.message);
      return true;
    }
  }

  // 13. Operator Early Warning Sensory Observations
  if (pathname === '/api/early-warning/observations' && method === 'GET') {
    const obs = db.prepare('SELECT * FROM operator_observations WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
    sendJson(res, 200, { observations: obs });
    return true;
  }

  if (pathname === '/api/early-warning/observations' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { machineId, abnormalNoise, highSurfaceTemp, looseMounting, oilLeakage, notes } = body;
      const obsId = `obs_sens_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

      db.prepare(`
        INSERT INTO operator_observations (id, machine_id, user_id, abnormal_noise, high_surface_temp, loose_mounting, oil_leakage, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        obsId,
        machineId,
        user.id,
        abnormalNoise ? 1 : 0,
        highSurfaceTemp ? 1 : 0,
        looseMounting ? 1 : 0,
        oilLeakage ? 1 : 0,
        notes || '',
        Date.now(),
      );

      sendJson(res, 201, { success: true, id: obsId });
      return true;
    } catch (err) {
      sendError(res, 500, err.message);
      return true;
    }
  }

  // 14. Sensors / Device registration
  if (pathname === '/api/sensors/devices' && method === 'GET') {
    const sensors = db.prepare('SELECT * FROM external_sensors WHERE user_id = ?').all(user.id);
    sendJson(res, 200, { sensors });
    return true;
  }

  if (pathname === '/api/sensors/devices' && method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { machineId, sensorType, model } = body;
      const sensorId = `sns_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const deviceToken = `tok_${crypto.randomBytes(16).toString('hex')}`;

      db.prepare(`
        INSERT INTO external_sensors (id, machine_id, user_id, sensor_type, device_token, model, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(sensorId, machineId, user.id, sensorType || 'BLE_ACCEL', deviceToken, model || 'ESP32-ADXL355', Date.now());

      sendJson(res, 201, {
        sensor: {
          id: sensorId,
          machineId,
          sensorType: sensorType || 'BLE_ACCEL',
          deviceToken,
          model: model || 'ESP32-ADXL355',
        },
      });
      return true;
    } catch (err) {
      sendError(res, 500, err.message);
      return true;
    }
  }

  // 15. CSV Export Endpoint
  if (pathname === '/api/export/csv' && method === 'GET') {
    const machineId = url.searchParams.get('machineId');
    let query = 'SELECT * FROM observations WHERE user_id = ?';
    const params = [user.id];
    if (machineId) {
      query += ' AND machine_id = ?';
      params.push(machineId);
    }
    query += ' ORDER BY captured_at DESC';
    const rows = db.prepare(query).all(...params);

    let csv = 'Record_ID,Machine_ID,Captured_At,Data_Source,Original_Source,RMS_mps2,Status,Alert_Raised,Reason\r\n';
    for (const r of rows) {
      const dateStr = new Date(r.captured_at).toISOString();
      const escapedReason = `"${(r.reason || '').replace(/"/g, '""')}"`;
      csv += `${r.id},${r.machine_id},${dateStr},${r.source},${r.original_data_source || ''},${r.rms_mps2 || ''},${r.status},${r.alert_raised},${escapedReason}\r\n`;
    }

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="aime-sense-export-${Date.now()}.csv"`,
      'Access-Control-Allow-Origin': '*',
    });
    res.end(csv);
    return true;
  }

  // Not handled by API
  return false;
}

module.exports = { handleApiRequest };
