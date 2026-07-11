// Simple persistent guest identity, no login system for MVP.
const KEY = "tape_run_user_id";

export function getUserId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "guest_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, id);
  }
  return id;
}
