import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom trends
export const authTrend = new Trend('trend_auth_login', true);
export const dashboardTrend = new Trend('trend_dashboard_feed', true);
export const teamsDeptTrend = new Trend('trend_teams_dept', true);
export const standupReadTrend = new Trend('trend_standup_read', true);
export const standupWriteTrend = new Trend('trend_standup_write', true);
export const reactionTrend = new Trend('trend_reaction', true);
export const aiHealthTrend = new Trend('trend_ai_health', true);

export const unexpectedErrors = new Rate('unexpected_error_rate');
export const totalRequests = new Counter('total_workload_requests');

const BASE_URL = 'http://127.0.0.1:5000';

// Configurable via CLI flags: -e TARGET_VUS=10 -e DURATION=30s
const targetVus = parseInt(__ENV.TARGET_VUS || '10', 10);
const testDuration = __ENV.DURATION || '30s';

export const options = {
  scenarios: {
    mixed_workload: {
      executor: 'constant-vus',
      vus: targetVus,
      duration: testDuration,
    },
  },
  thresholds: {
    unexpected_error_rate: ['rate<0.01'], // < 1% error rate
  },
};

export default function () {
  // Select a user ID based on VU ID to distribute load across seeded users
  const userIdNum = ((__VU - 1) % 250) + 1;
  const userEmail = `loaduser${userIdNum}@alphacorp.io`;
  const password = 'Password123!';

  // Generate weighted action:
  // 10% Auth, 25% Dashboard Feed, 20% Teams/Depts, 15% Standup Read, 15% Standup Write, 10% Reaction, 5% AI/Health
  const rand = Math.random() * 100;

  // Common headers with token
  // To avoid hammering login on every iteration unless doing auth action,
  // we do a fast login or reuse credentials
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ identifier: userEmail, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    if (loginRes.status !== 429) {
      unexpectedErrors.add(1);
    }
    sleep(0.1);
    return;
  }

  const token = loginRes.json().token;
  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (rand < 10) {
    // 10% Auth Action: Login verification / me endpoint
    authTrend.add(loginRes.timings.duration);
    const meRes = http.get(`${BASE_URL}/api/auth/me`, authHeaders);
    const ok = check(meRes, { 'me status 200': (r) => r.status === 200 });
    if (!ok && meRes.status !== 429) unexpectedErrors.add(1);
    totalRequests.add(2);
  } else if (rand < 35) {
    // 25% Dashboard / Standup feed read
    const res = http.get(`${BASE_URL}/api/manager/dashboard`, authHeaders);
    dashboardTrend.add(res.timings.duration);
    const ok = check(res, { 'dashboard status 200': (r) => r.status === 200 });
    if (!ok && res.status !== 429) unexpectedErrors.add(1);
    totalRequests.add(1);
  } else if (rand < 55) {
    // 20% Team / Department read
    const res = http.get(`${BASE_URL}/api/teams`, authHeaders);
    teamsDeptTrend.add(res.timings.duration);
    const ok = check(res, { 'teams status 200': (r) => r.status === 200 });
    if (!ok && res.status !== 429) unexpectedErrors.add(1);
    totalRequests.add(1);
  } else if (rand < 70) {
    // 15% Standup submission / read (today)
    const res = http.get(`${BASE_URL}/api/standups/today`, authHeaders);
    standupReadTrend.add(res.timings.duration);
    const ok = check(res, { 'standup today status 200': (r) => r.status === 200 });
    if (!ok && res.status !== 429) unexpectedErrors.add(1);
    totalRequests.add(1);
  } else if (rand < 85) {
    // 15% Standup creation / update (write)
    const postPayload = JSON.stringify({
      yesterdayUpdates: [`Task A completed by user ${userIdNum}`, 'Code review'],
      todayPlans: ['Database optimization', 'Performance validation'],
      blockers: [],
      blockerLevel: 'NONE',
    });
    const res = http.post(`${BASE_URL}/api/standups`, postPayload, authHeaders);
    standupWriteTrend.add(res.timings.duration);
    const ok = check(res, {
      'standup post valid': (r) =>
        r.status === 201 || (r.status === 400 && r.json().message && r.json().message.includes('already submitted')),
    });
    if (!ok && res.status !== 429) unexpectedErrors.add(1);

    if (res.status === 400 && res.json().existingId) {
      const putRes = http.put(
        `${BASE_URL}/api/standups/${res.json().existingId}`,
        postPayload,
        authHeaders
      );
      standupWriteTrend.add(putRes.timings.duration);
      const putOk = check(putRes, { 'standup put status 200': (r) => r.status === 200 });
      if (!putOk && putRes.status !== 429) unexpectedErrors.add(1);
      totalRequests.add(1);
    }
    totalRequests.add(1);
  } else if (rand < 95) {
    // 10% Reaction post / get
    // Check today's standup or default standup to react to
    const todayRes = http.get(`${BASE_URL}/api/standups/today`, authHeaders);
    let targetStandupId = '';
    if (todayRes.status === 200 && todayRes.json().standup) {
      targetStandupId = todayRes.json().standup.id;
    }

    if (targetStandupId) {
      const reactRes = http.post(
        `${BASE_URL}/api/standups/${targetStandupId}/react`,
        JSON.stringify({ emoji: '👏' }),
        authHeaders
      );
      reactionTrend.add(reactRes.timings.duration);
      const ok = check(reactRes, { 'reaction status 200': (r) => r.status === 200 });
      if (!ok && reactRes.status !== 429) unexpectedErrors.add(1);

      const getReactRes = http.get(
        `${BASE_URL}/api/standups/${targetStandupId}/reactions`,
        authHeaders
      );
      reactionTrend.add(getReactRes.timings.duration);
      totalRequests.add(2);
    } else {
      totalRequests.add(1);
    }
  } else {
    // 5% AI Summary / Health
    const res = http.get(`${BASE_URL}/api/health`);
    aiHealthTrend.add(res.timings.duration);
    const ok = check(res, { 'health status 200': (r) => r.status === 200 });
    if (!ok && res.status !== 429) unexpectedErrors.add(1);
    totalRequests.add(1);
  }

  // Realistic user pacing between actions (50ms - 150ms)
  sleep(0.05 + Math.random() * 0.1);
}
