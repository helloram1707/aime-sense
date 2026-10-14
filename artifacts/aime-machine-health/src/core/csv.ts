import type { DataSource, MeasurementSample } from './healthEngine';
import type { ObservationRecord } from '@/context/HealthStore';

const CSV_HEADERS = [
  'observationId',
  'machineId',
  'capturedAtMs',
  'dataSource',
  'originalDataSource',
  'monotonicMs',
  'wallClockMs',
  'xMps2',
  'yMps2',
  'zMps2',
  'unit',
  'rmsMps2',
  'status',
  'rule',
];

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  const safe =
    typeof value === 'string' && /^[=+\-@\t\r]/.test(text)
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildHistoryCsv(records: ObservationRecord[]): string {
  const rows = [CSV_HEADERS.map(csvCell).join(',')];
  for (const record of records) {
    for (const raw of record.samples) {
      const sample =
        typeof raw === 'object' && raw !== null
          ? (raw as Record<string, unknown>)
          : {};
      rows.push(
        [
          record.id,
          record.machineId,
          record.capturedAtMs,
          typeof sample.dataSource === 'string'
            ? sample.dataSource
            : record.source,
          typeof sample.originalDataSource === 'string'
            ? sample.originalDataSource
            : record.originalDataSource ?? '',
          sample.monotonicMs,
          sample.wallClockMs,
          sample.x,
          sample.y,
          sample.z,
          sample.unit,
          record.rmsMps2,
          record.decision.status,
          record.decision.reason,
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }
  return `${rows.join('\r\n')}\r\n`;
}

export interface CsvParseResult {
  samples: unknown[];
  originalDataSource: string | null;
  errors: string[];
}

function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        cell += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      row.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      row.push(cell);
      if (row.some((part) => part.length > 0)) rows.push(row);
      row = [];
      cell = '';
      if (character === '\r' && text[index + 1] === '\n') index += 1;
    } else {
      cell += character;
    }
  }
  row.push(cell);
  if (row.some((part) => part.length > 0)) rows.push(row);
  return rows;
}

function numberOrUndefined(text: string | undefined): number | undefined {
  if (text === undefined || text.trim() === '') return undefined;
  return Number(text);
}

export function parseMeasurementCsv(text: string): CsvParseResult {
  const rows = parseRows(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) {
    return {
      samples: [],
      originalDataSource: null,
      errors: ['CSV has a header but no measurement rows.'],
    };
  }

  const headers = rows[0].map((header) => header.trim());
  const requiredHeaders = [
    'machineId',
    'monotonicMs',
    'wallClockMs',
    'xMps2',
    'yMps2',
    'zMps2',
    'unit',
    'dataSource',
  ];
  const missingHeaders = requiredHeaders.filter(
    (header) => !headers.includes(header),
  );
  if (missingHeaders.length > 0) {
    return {
      samples: [],
      originalDataSource: null,
      errors: [
        `Missing CSV columns: ${missingHeaders.join(', ')}. Exported AIME CSV uses the supported schema.`,
      ],
    };
  }

  const samples: unknown[] = [];
  const originalSources = new Set<string>();
  const errors: string[] = [];

  rows.slice(1).forEach((cells, rowIndex) => {
    const record = Object.fromEntries(
      headers.map((header, index) => [header, cells[index]]),
    );
    const sourceText = (record.originalDataSource || record.dataSource || '')
      .trim();
    if (sourceText) originalSources.add(sourceText);

    const sourceIsKnown: (value: string) => value is DataSource = (
      value,
    ): value is DataSource =>
      ['LIVE_SENSOR', 'IMPORTED_DATA', 'SIMULATED_DATA'].includes(value);

    samples.push({
      machineId: record.machineId?.trim(),
      monotonicMs: numberOrUndefined(record.monotonicMs),
      wallClockMs: numberOrUndefined(record.wallClockMs),
      x: numberOrUndefined(record.xMps2),
      y: numberOrUndefined(record.yMps2),
      z: numberOrUndefined(record.zMps2),
      unit: (record.unit?.trim() ?? '') as MeasurementSample['unit'],
      dataSource: 'IMPORTED_DATA',
      originalDataSource: sourceIsKnown(sourceText) ? sourceText : sourceText,
    } satisfies Partial<MeasurementSample> & Record<string, unknown>);

    if (cells.length < headers.length) {
      errors.push(`CSV row ${rowIndex + 2} has missing columns.`);
    }
  });

  if (originalSources.size > 1) {
    errors.push(
      'The CSV contains multiple original sources. They remain labelled as imported; verify the file before analysis.',
    );
  }

  return {
    samples,
    originalDataSource: [...originalSources][0] ?? null,
    errors,
  };
}
