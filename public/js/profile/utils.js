export function getInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function setStatus(
  elementId,
  message,
  type = "success"
) {
  const element =
    document.getElementById(
      elementId
    );

  if (!element) {
    return;
  }

  element.innerText = message;
  element.dataset.type = type;
}

export function clearStatus(
  elementId
) {
  setStatus(elementId, "", "");
}

export function revokeUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}