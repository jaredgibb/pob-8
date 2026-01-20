export function format_date_ymd(date_value) {
  const date_obj = date_value instanceof Date ? date_value : new Date(date_value);
  const year = date_obj.getFullYear();
  const month = String(date_obj.getMonth() + 1).padStart(2, "0");
  const day = String(date_obj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function format_time_label(epoch_seconds) {
  if (!epoch_seconds) {
    return "";
  }
  const date_obj = new Date(epoch_seconds * 1000);
  return date_obj.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function format_full_date(epoch_seconds) {
  if (!epoch_seconds) {
    return "";
  }
  const date_obj = new Date(epoch_seconds * 1000);
  return date_obj.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
