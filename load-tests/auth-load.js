import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

export const loginDuration = new Trend('auth_login_duration', true);
export const loginSuccessRate = new Rate('auth_login_success');
export const rateLimit429Rate = new Rate('auth_rate_limit_429');
export const unexpectedAuthErrors = new Rate('auth_unexpected_errors');
export const totalAuthRequests = new Counter('total_auth_requests');

const BASE_URL = 'http://127.0.0.1:5000';

const vus = parseInt(__ENV.TARGET_VUS || '25', 10);
const duration = __ENV.DURATION || '20s';

export const options = {
  scenarios: {
    auth_load: {
      executor: 'constant-vus',
      vus: vus,
      duration: duration,
    },
  },
};

export default function () {
  const userIdNum = ((__VU - 1) % 250) + 1;
  const payload = JSON.stringify({
    identifier: `loaduser${userIdNum}@alphacorp.io`,
    password: 'Password123!',
  });

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  loginDuration.add(res.timings.duration);
  totalAuthRequests.add(1);

  if (res.status === 200) {
    loginSuccessRate.add(1);
    rateLimit429Rate.add(0);
    unexpectedAuthErrors.add(0);
  } else if (res.status === 429) {
    loginSuccessRate.add(0);
    rateLimit429Rate.add(1);
    unexpectedAuthErrors.add(0);
  } else {
    loginSuccessRate.add(0);
    rateLimit429Rate.add(0);
    unexpectedAuthErrors.add(1);
  }

  // Rapid execution to stress bcrypt and rate limiter
  sleep(0.01);
}
