import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Custom metric trends for all 11 endpoints
export const healthTrend = new Trend('endpoint_health', true);
export const loginTrend = new Trend('endpoint_login', true);
export const meTrend = new Trend('endpoint_me', true);
export const teamsTrend = new Trend('endpoint_teams', true);
export const departmentsTrend = new Trend('endpoint_departments', true);
export const managerDashboardTrend = new Trend('endpoint_manager_dashboard', true);
export const standupTodayTrend = new Trend('endpoint_standup_today', true);
export const standupPostTrend = new Trend('endpoint_standup_post', true);
export const standupPutTrend = new Trend('endpoint_standup_put', true);
export const reactionsGetTrend = new Trend('endpoint_reactions_get', true);
export const reactionPostTrend = new Trend('endpoint_reaction_post', true);
export const aiSummaryTrend = new Trend('endpoint_ai_summary', true);

export const errorRate = new Rate('unexpected_error_rate');

export const options = {
  vus: 1,
  iterations: 100, // 100 sequential requests per endpoint for high precision
};

const BASE_URL = 'http://127.0.0.1:5000';

export default function () {
  // 1. GET /api/health
  {
    const res = http.get(`${BASE_URL}/api/health`);
    healthTrend.add(res.timings.duration);
    const ok = check(res, { 'health status is 200': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
  }

  // 2. POST /api/auth/login
  let memberToken = '';
  let memberId = '';
  {
    const payload = JSON.stringify({
      identifier: 'member@alphacorp.io',
      password: 'Password123!',
    });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
    loginTrend.add(res.timings.duration);
    const ok = check(res, { 'login status is 200': (r) => r.status === 200 });
    if (ok) {
      const data = res.json();
      memberToken = data.token;
      memberId = data.user.id;
    } else {
      errorRate.add(1);
    }
  }

  const memberAuth = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${memberToken}`,
    },
  };

  // 3. GET /api/auth/me
  {
    const res = http.get(`${BASE_URL}/api/auth/me`, memberAuth);
    meTrend.add(res.timings.duration);
    const ok = check(res, { 'me status is 200': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
  }

  // 4. GET /api/teams
  {
    const res = http.get(`${BASE_URL}/api/teams`, memberAuth);
    teamsTrend.add(res.timings.duration);
    const ok = check(res, { 'teams status is 200': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
  }

  // 5. GET /api/departments (Admin authentication)
  let adminToken = '';
  {
    const payload = JSON.stringify({
      identifier: 'admin@alphacorp.io',
      password: 'Password123!',
    });
    const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 200) {
      adminToken = res.json().token;
    }
  }

  if (adminToken) {
    const adminAuth = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
    };
    const res = http.get(`${BASE_URL}/api/departments`, adminAuth);
    departmentsTrend.add(res.timings.duration);
    const ok = check(res, { 'departments status is 200': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
  }

  // 6. GET /api/manager/dashboard
  {
    const res = http.get(`${BASE_URL}/api/manager/dashboard`, memberAuth);
    managerDashboardTrend.add(res.timings.duration);
    const ok = check(res, { 'manager dashboard status is 200': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
  }

  // 7. GET /api/standups/today
  let activeStandupId = '';
  {
    const res = http.get(`${BASE_URL}/api/standups/today`, memberAuth);
    standupTodayTrend.add(res.timings.duration);
    const ok = check(res, { 'standup today status is 200': (r) => r.status === 200 });
    if (ok && res.json().standup) {
      activeStandupId = res.json().standup.id;
    }
    if (!ok) errorRate.add(1);
  }

  // 8. POST /api/standups
  {
    const payload = JSON.stringify({
      yesterdayUpdates: ['Configured baseline testing', 'Analyzed router performance'],
      todayPlans: ['Run multi-user concurrency testing', 'Benchmark SQLite contention'],
      blockers: [],
      blockerLevel: 'NONE',
    });
    const res = http.post(`${BASE_URL}/api/standups`, payload, memberAuth);
    standupPostTrend.add(res.timings.duration);
    const ok = check(res, {
      'standup post is 201 created or 400 existing': (r) =>
        r.status === 201 || (r.status === 400 && r.json().message && r.json().message.includes('already submitted')),
    });
    if (res.status === 201) {
      activeStandupId = res.json().standup.id;
    } else if (res.status === 400 && res.json().existingId) {
      activeStandupId = res.json().existingId;
    }
    if (!ok) errorRate.add(1);
  }

  // 9. PUT /api/standups/:id
  if (activeStandupId) {
    const payload = JSON.stringify({
      yesterdayUpdates: ['Configured baseline testing', 'Analyzed router performance - verified'],
      todayPlans: ['Run multi-user concurrency testing', 'Benchmark SQLite contention'],
      blockers: [],
      blockerLevel: 'NONE',
    });
    const res = http.put(`${BASE_URL}/api/standups/${activeStandupId}`, payload, memberAuth);
    standupPutTrend.add(res.timings.duration);
    const ok = check(res, { 'standup put status is 200': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
  }

  // 10. POST /api/standups/:standupId/react & GET /api/standups/:standupId/reactions
  if (activeStandupId) {
    const reactPayload = JSON.stringify({ emoji: '🔥' });
    const reactRes = http.post(
      `${BASE_URL}/api/standups/${activeStandupId}/react`,
      reactPayload,
      memberAuth
    );
    reactionPostTrend.add(reactRes.timings.duration);
    const reactOk = check(reactRes, { 'reaction post status is 200': (r) => r.status === 200 });
    if (!reactOk) errorRate.add(1);

    const getReactionsRes = http.get(
      `${BASE_URL}/api/standups/${activeStandupId}/reactions`,
      memberAuth
    );
    reactionsGetTrend.add(getReactionsRes.timings.duration);
    const getReactionsOk = check(getReactionsRes, {
      'reactions get status is 200': (r) => r.status === 200,
    });
    if (!getReactionsOk) errorRate.add(1);
  }

  // 11. GET /api/ai/summary
  {
    const res = http.get(`${BASE_URL}/api/ai/summary`, memberAuth);
    aiSummaryTrend.add(res.timings.duration);
    const ok = check(res, { 'ai summary status is 200': (r) => r.status === 200 });
    if (!ok) errorRate.add(1);
  }
}
