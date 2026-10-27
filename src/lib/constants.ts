/**
 * The demo student ID used by the backend when no Authorization header is
 * provided. Requests with this ID are served the shared demo profile from
 * app/personalization/learner_profile.py :: get_or_create_demo_profile().
 *
 * Logged-in users always get their real profile via their bearer token;
 * DEMO_STUDENT_ID is only used for unauthenticated / public demo mode.
 */
export const DEMO_STUDENT_ID = 'demo-student';
