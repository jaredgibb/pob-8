export function format_duration_ms(duration_ms) {
  if (!Number.isFinite(duration_ms)) {
    return "00:00";
  }
  const total_seconds = Math.floor(duration_ms / 1000);
  const minutes = String(Math.floor(total_seconds / 60)).padStart(2, "0");
  const seconds = String(total_seconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function parse_duration_ms(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}
