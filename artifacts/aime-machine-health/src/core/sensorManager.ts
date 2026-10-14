import type { DataSource, MeasurementSample } from './healthEngine';

export type ExternalSensorType = 'BLE_ACCEL' | 'MQTT_TELEMETRY' | 'WIFI_NODE';

export interface ExternalSensorDevice {
  id: string;
  name: string;
  type: ExternalSensorType;
  model: string; // e.g. 'ADXL355-BLE', 'ESP32-MPU6050', 'STM32-MQTT'
  macOrIp: string;
  assignedMachineId: string;
  status: 'DISCONNECTED' | 'CONNECTED' | 'STREAMING' | 'ERROR';
  batteryPct?: number;
  sampleRateHz: number;
  lastPacketTimeMs?: number;
  packetsReceived: number;
}

export interface SensorIngestPayload {
  deviceToken: string;
  sensorId: string;
  machineId: string;
  sensorType: ExternalSensorType;
  timestamp: number;
  samples: Array<{
    tMs: number; // relative or absolute millisecond
    x: number;   // m/s²
    y: number;   // m/s²
    z: number;   // m/s²
  }>;
}

/**
 * Standard BLE GATT Service UUIDs for AIME Sense Industrial Nodes
 */
export const SENSOR_PROTOCOL_SPECS = {
  BLE: {
    SERVICE_UUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    DATA_CHARACTERISTIC_UUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
    CONFIG_CHARACTERISTIC_UUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
    DEFAULT_SAMPLE_RATE_HZ: 50,
  },
  MQTT: {
    DEFAULT_PORT: 8883,
    TOPIC_TELEMETRY: 'aime/machines/{machineId}/vibration',
    TOPIC_STATUS: 'aime/sensors/{sensorId}/status',
    QOS: 1,
  },
  HTTP_INGEST: {
    ENDPOINT: '/api/sensors/ingest',
    STREAM_ENDPOINT: '/api/sensors/stream',
  },
};

/**
 * Helper to simulate generating external industrial sensor packets
 * (e.g. from an ESP32 node attached via BLE or Wi-Fi).
 */
export function generateExternalSensorPacket(
  device: ExternalSensorDevice,
  sampleCount = 50,
  nominalRmsMps2 = 0.45,
): SensorIngestPayload {
  const now = Date.now();
  const samples = [];
  const dt = Math.round(1000 / device.sampleRateHz);

  for (let i = 0; i < sampleCount; i++) {
    const t = now - (sampleCount - i) * dt;
    // synthesize high-frequency mechanical vibration with zero DC offset
    const phase = (i / device.sampleRateHz) * 2 * Math.PI * 25; // 25 Hz shaft harmonic
    const noiseX = (Math.random() - 0.5) * nominalRmsMps2 * 0.4;
    const noiseY = (Math.random() - 0.5) * nominalRmsMps2 * 0.4;
    const noiseZ = (Math.random() - 0.5) * nominalRmsMps2 * 0.4;

    samples.push({
      tMs: t,
      x: Number((Math.sin(phase) * nominalRmsMps2 + noiseX).toFixed(4)),
      y: Number((Math.cos(phase * 0.7) * nominalRmsMps2 * 0.6 + noiseY).toFixed(4)),
      z: Number((Math.sin(phase * 1.5) * nominalRmsMps2 * 0.8 + noiseZ).toFixed(4)),
    });
  }

  return {
    deviceToken: `token-${device.id}-${device.macOrIp.replace(/[:.]/g, '')}`,
    sensorId: device.id,
    machineId: device.assignedMachineId,
    sensorType: device.type,
    timestamp: now,
    samples,
  };
}

/**
 * Converts an external sensor payload into MeasurementSample rows for analysis
 */
export function parseExternalSensorSamples(
  payload: SensorIngestPayload,
): MeasurementSample[] {
  return payload.samples.map((s, idx) => ({
    machineId: payload.machineId,
    monotonicMs: s.tMs,
    receiptMonotonicMs: Date.now() + idx,
    wallClockMs: s.tMs,
    x: s.x,
    y: s.y,
    z: s.z,
    unit: 'm/s²',
    dataSource: 'LIVE_SENSOR' as DataSource,
  }));
}
