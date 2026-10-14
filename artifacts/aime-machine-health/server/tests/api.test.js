/**
 * Integration Test Suite for AIME Sense REST API.
 * Uses Node.js built-in test runner with an isolated in-memory SQLite database.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { getDb } = require('../db');
const { handleApiRequest } = require('../api');

function createTestServer(db) {
  return http.createServer(async (req, res) => {
    try {
      const handled = await handleApiRequest(req, res, db);
      if (!handled) {
        res.writeHead(404);
        res.end();
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function request(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const port = address.port;

    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (body) {
      reqOptions.headers['Content-Type'] = 'application/json';
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

test('AIME Sense Backend API Integration Suite', async (t) => {
  // Use isolated in-memory database
  const db = getDb(':memory:');
  const server = createTestServer(db);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  let userAToken = null;
  let userBToken = null;
  let machineId = 'PUMP-TEST-01';
  let alertId = null;

  t.after(() => {
    server.close();
  });

  await t.test('1. Health check returns 200 with DB status', async () => {
    const res = await request(server, { path: '/api/health', method: 'GET' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json.status, 'OK');
    assert.equal(res.json.dbConnected, true);
    assert.equal(res.json.app, 'AIME Sense API');
  });

  await t.test('2. User Registration with secure password hashing', async () => {
    const res = await request(server, { path: '/api/auth/register', method: 'POST' }, {
      name: 'Ramesh Rao',
      email: 'ramesh@workshop.in',
      workshop: 'Rao Precision Works',
      password: 'securePassword123',
    });
    assert.equal(res.statusCode, 201);
    assert.ok(res.json.token);
    assert.equal(res.json.user.name, 'Ramesh Rao');
    userAToken = res.json.token;

    // Verify password is not plaintext in DB
    const userRow = db.prepare('SELECT password_hash, salt FROM users WHERE email = ?').get('ramesh@workshop.in');
    assert.notEqual(userRow.password_hash, 'securePassword123');
    assert.ok(userRow.salt);
  });

  await t.test('3. Duplicate user registration is rejected (409)', async () => {
    const res = await request(server, { path: '/api/auth/register', method: 'POST' }, {
      name: 'Ramesh Duplicate',
      email: 'ramesh@workshop.in',
      workshop: 'Duplicate Shop',
      password: 'password123',
    });
    assert.equal(res.statusCode, 409);
  });

  await t.test('4. Short password is rejected (400)', async () => {
    const res = await request(server, { path: '/api/auth/register', method: 'POST' }, {
      name: 'Short Pass',
      email: 'short@test.com',
      password: '123',
    });
    assert.equal(res.statusCode, 400);
  });

  await t.test('5. Login succeeds with correct credentials', async () => {
    const res = await request(server, { path: '/api/auth/login', method: 'POST' }, {
      email: 'ramesh@workshop.in',
      password: 'securePassword123',
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.json.token);
    assert.equal(res.json.user.email, 'ramesh@workshop.in');
  });

  await t.test('6. Login fails with incorrect credentials', async () => {
    const res = await request(server, { path: '/api/auth/login', method: 'POST' }, {
      email: 'ramesh@workshop.in',
      password: 'wrongPassword',
    });
    assert.equal(res.statusCode, 401);
  });

  await t.test('7. Register second user for multi-tenant isolation testing', async () => {
    const res = await request(server, { path: '/api/auth/register', method: 'POST' }, {
      name: 'Priya Sharma',
      email: 'priya@nitap.edu.in',
      workshop: 'NIT Andhra Lab',
      password: 'priyaSecurePass123',
    });
    assert.equal(res.statusCode, 201);
    userBToken = res.json.token;
  });

  await t.test('8. Create machine with run hours and service details', async () => {
    const res = await request(
      server,
      {
        path: '/api/machines',
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      },
      {
        id: machineId,
        name: 'Coolant Circulation Pump',
        category: 'Water pump',
        location: 'Bay 3 Line A',
        runHours: 320,
        lastServiceDate: '2026-09-15',
        serviceIntervalHours: 500,
        hourlyDowntimeCost: 3500,
        thresholds: { warningRatio: 1.5, criticalRatio: 2.0 },
      },
    );
    assert.equal(res.statusCode, 201);
    assert.equal(res.json.machine.id, machineId);
    assert.equal(res.json.machine.runHours, 320);
    assert.equal(res.json.machine.hourlyDowntimeCost, 3500);
  });

  await t.test('9. Multi-tenant isolation: User B cannot see User A machine', async () => {
    const res = await request(server, {
      path: '/api/machines',
      method: 'GET',
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json.machines.length, 0); // User B has no machines
  });

  await t.test('10. Establish machine baseline', async () => {
    const res = await request(
      server,
      {
        path: `/api/machines/${machineId}/baseline`,
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      },
      {
        source: 'LIVE_SENSOR',
        rmsMps2: 0.35,
        sampleCount: 80,
        durationMs: 4000,
        method: 'WINDOW_MEAN_REMOVAL_VECTOR_RMS',
      },
    );
    assert.equal(res.statusCode, 201);

    const getRes = await request(server, {
      path: `/api/machines/${machineId}/baseline`,
      method: 'GET',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(getRes.statusCode, 200);
    assert.equal(getRes.json.baseline.rms_mps2, 0.35);
  });

  await t.test('11. Record observation with alert generation', async () => {
    const res = await request(
      server,
      {
        path: '/api/observations',
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      },
      {
        machineId,
        source: 'LIVE_SENSOR',
        capturedAtMs: Date.now(),
        rmsMps2: 0.75, // Exceeds warning threshold (0.35 * 1.5 = 0.525)
        decision: {
          status: 'WARNING',
          alertRaised: true,
          reason: 'Vibration elevated above warning threshold ratio.',
          warningThresholdMps2: 0.525,
          criticalThresholdMps2: 0.700,
        },
      },
    );
    assert.equal(res.statusCode, 201);
    assert.ok(res.json.id);

    // Verify alert was created
    const alertsRes = await request(server, {
      path: '/api/alerts',
      method: 'GET',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(alertsRes.statusCode, 200);
    assert.equal(alertsRes.json.alerts.length, 1);
    assert.equal(alertsRes.json.alerts[0].status, 'WARNING');
    alertId = alertsRes.json.alerts[0].id;
  });

  await t.test('12. Acknowledge alert', async () => {
    assert.ok(alertId);
    const res = await request(server, {
      path: `/api/alerts/${alertId}/ack`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json.success, true);

    const alertsRes = await request(server, {
      path: '/api/alerts',
      method: 'GET',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(alertsRes.json.alerts[0].acknowledged, 1);
  });

  await t.test('13. Log maintenance inspection checklist', async () => {
    const res = await request(
      server,
      {
        path: '/api/maintenance',
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      },
      {
        machineId,
        priority: 'P2',
        checklist: [
          { id: 'chk-mount', task: 'Inspect bolts', completed: true },
          { id: 'chk-lube', task: 'Grease bearings', completed: true },
        ],
        notes: 'Tightened anchor bolts; vibration dropped.',
        operatorName: 'Ramesh Rao',
      },
    );
    assert.equal(res.statusCode, 201);

    const logsRes = await request(server, {
      path: '/api/maintenance',
      method: 'GET',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(logsRes.statusCode, 200);
    assert.equal(logsRes.json.logs.length, 1);
    assert.equal(logsRes.json.logs[0].operator_name, 'Ramesh Rao');
  });

  await t.test('14. Log operator early-warning physical observations', async () => {
    const res = await request(
      server,
      {
        path: '/api/early-warning/observations',
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      },
      {
        machineId,
        abnormalNoise: true,
        highSurfaceTemp: false,
        looseMounting: true,
        oilLeakage: false,
        notes: 'Chattering sound observed near coupling.',
      },
    );
    assert.equal(res.statusCode, 201);

    const obsRes = await request(server, {
      path: '/api/early-warning/observations',
      method: 'GET',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(obsRes.statusCode, 200);
    assert.equal(obsRes.json.observations.length, 1);
    assert.equal(obsRes.json.observations[0].abnormal_noise, 1);
    assert.equal(obsRes.json.observations[0].loose_mounting, 1);
  });

  await t.test('15. Register external sensor device and ingest stream', async () => {
    // Register external BLE device
    const regRes = await request(
      server,
      {
        path: '/api/sensors/devices',
        method: 'POST',
        headers: { Authorization: `Bearer ${userAToken}` },
      },
      {
        machineId,
        sensorType: 'BLE_ACCEL',
        model: 'ESP32-ADXL355-Industrial',
      },
    );
    assert.equal(regRes.statusCode, 201);
    const deviceToken = regRes.json.sensor.deviceToken;
    assert.ok(deviceToken);

    // Ingest sensor stream via x-device-token
    const samples = [];
    for (let i = 0; i < 40; i++) {
      samples.push({
        x: Math.sin(i * 0.2) * 0.4,
        y: Math.cos(i * 0.2) * 0.3,
        z: 0.1,
      });
    }

    const ingestRes = await request(
      server,
      {
        path: '/api/sensors/ingest',
        method: 'POST',
        headers: { 'x-device-token': deviceToken },
      },
      {
        machineId,
        sensorType: 'BLE_ACCEL',
        samples,
      },
    );
    assert.equal(ingestRes.statusCode, 201);
    assert.ok(ingestRes.json.rmsMps2 > 0);
  });

  await t.test('16. CSV Export contains valid headers and stored records', async () => {
    const res = await request(server, {
      path: `/api/export/csv?machineId=${machineId}`,
      method: 'GET',
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'text/csv; charset=utf-8');
    assert.ok(res.data.includes('Record_ID,Machine_ID,Captured_At,Data_Source'));
    assert.ok(res.data.includes(machineId));
  });
});
