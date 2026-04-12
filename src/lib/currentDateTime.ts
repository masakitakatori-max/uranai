type DateTimeFields = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function getCurrentDateTimeFields(now = new Date()): DateTimeFields {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  };
}

export function withCurrentDateTime<T extends DateTimeFields>(input: T, now = new Date()): T {
  return {
    ...input,
    ...getCurrentDateTimeFields(now),
  };
}

export function formatCurrentDateTime(now = new Date()) {
  const current = getCurrentDateTimeFields(now);
  return `${current.year}-${String(current.month).padStart(2, "0")}-${String(current.day).padStart(2, "0")} ${String(current.hour).padStart(2, "0")}:${String(current.minute).padStart(2, "0")}`;
}
