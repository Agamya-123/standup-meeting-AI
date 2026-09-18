import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

export const concurrentWriteDuration = new Trend('db_concurrent_write_duration', true);
export const concurrentReadDuration = new Trend('db_concurrent_read_duration', true);
export const writeSuccess201 = new Counter('db_write_success_201');
export const writeDuplicate400 = new Counter('db_write_duplicate_400');
export const writeServerError500 = new Counter('db_write_server_error_500');
export const readSuccess200 = new Counter('db_read_success_200');
export const readServerError500 = new Counter('db_read_server_error_500');

const BASE_URL = 'http://127.0.0.1:5000';

export const options = {
  scenarios: {
    // Scenario A: 50 concurrent VUs hammering writes simultaneously
    concurrent_writes: {
      executor: 'constant-vus',
      vus: 50,
      duration: '15s',
      exec: 'writeWorker',
    },
    // Scenario B: 50 concurrent VUs hammering reads simultaneously (Read/Write Contention)
    concurrent_reads: {
      executor: 'constant-vus',
      vus: 50,
      duration: '15s',
      exec: 'readWorker',
    },
  },
};

// Logins cache helper
function getAuthToken(userIdNum) {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      identifier: `loaduser${userIdNum}@alphacorp.io`,
      password: 'Password123!',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (loginRes.status === 200) {
    return loginRes.json().token;
  }
  return null;
}

export function writeWorker() {
  // Test write concurrency. Every VU attempts to write standup.
  // Half of the VUs use their unique user ID (distinct user writes)
  // Half of the VUs use the SAME user ID (user #1) to intentionally test same-user concurrent collision!
  const isCollisionTest = __VU % 2 === 0;
  const userIdNum = isCollisionTest ? 1 : __VU;

  const token = getAuthToken(userIdNum);
  if (!token) return;

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const payload = JSON.stringify({
    yesterdayUpdates: [`Concurrent load update by VU ${__VU}`],
    todayPlans: ['Testing SQLite write locks and constraint handling'],
    blockers: [],
    blockerLevel: 'NONE',
  });

  const res = http.post(`${BASE_URL}/api/standups`, payload, authHeaders);
  concurrentWriteDuration.add(res.timings.duration);

  if (res.status === 201) {
    writeSuccess201.add(1);
  } else if (res.status === 400 && res.json().message && res.json().message.includes('already submitted')) {
    writeDuplicate400.add(1);
  } else if (res.status === 500) {
    writeServerError500.add(1);
  }

  // Small delay between write bursts
  sleep(0.05);
}

export function readWorker() {
  // Read worker querying dashboard and standups while writeWorker is writing
  const userIdNum = ((__VU - 1) % 100) + 1;
  const token = getAuthToken(userIdNum);
  if (!token) return;

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  const res = http.get(`${BASE_URL}/api/manager/dashboard`, authHeaders);
  concurrentReadDuration.add(res.timings.duration);

  if (res.status === 200) {
    readSuccess200.add(1);
  } else if (res.status === 500) {
    readServerError500.add(1);
  }

  sleep(0.05);
}
