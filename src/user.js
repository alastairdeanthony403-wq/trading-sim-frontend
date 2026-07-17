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

// Display name — the "account" identity for competitions. Guests without one
// can practise but can't post a scored entry.
const NAME_KEY = "tape_run_display_name";

export function getDisplayName() {
  return localStorage.getItem(NAME_KEY) || "";
}

export function setDisplayName(name) {
  localStorage.setItem(NAME_KEY, (name || "").trim().slice(0, 60));
}
