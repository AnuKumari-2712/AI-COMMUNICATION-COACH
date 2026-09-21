import { DEMO_STUDENT_ID } from './constants';

/**
 * Reads the student id out of the locally-stored access token without a JWT
 * library — matches the backend's minimal token format in
 * backend/app/core/security.py (base64 JSON payload + HMAC signature,
 * `.`-separated). Falls back to the shared demo profile id whenever there's
 * no token, it's malformed, or it's expired, exactly like the backend's own
 * `get_current_student_id` dependency does.
 */
export function getCurrentStudentId(): string {
  const token = localStorage.getItem('auth_token');
  if (!token || !token.includes('.')) return DEMO_STUDENT_ID;

  try {
    const [payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.sub !== 'string') return DEMO_STUDENT_ID;
    if (typeof payload.exp === 'number' && payload.exp < Date.now() / 1000) return DEMO_STUDENT_ID;
    return payload.sub;
  } catch {
    return DEMO_STUDENT_ID;
  }
}
