import { state } from "./state.js";

export function getInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function truncateText(
  value,
  maximumLength = 80
) {
  const text =
    String(value || "").trim();

  if (
    text.length <= maximumLength
  ) {
    return text;
  }

  return `${text.slice(
    0,
    maximumLength
  )}…`;
}

export function getProfileHref(
  username
) {
  const requestedUsername =
    String(username || "")
      .trim()
      .toLowerCase();

  const currentUsername =
    state.currentUser?.username
      ?.trim()
      .toLowerCase();

  if (
    currentUsername &&
    requestedUsername ===
      currentUsername
  ) {
    return "/profile";
  }

  return `/users/${encodeURIComponent(
    username
  )}`;
}