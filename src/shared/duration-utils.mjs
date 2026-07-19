export function formatDurationUnits(value) {
  const duration = String(value ?? "").trim();
  if (!duration) return "";
  if (/^(?:tbd|to confirm|time to confirm|a confirmar|hor[aá]rio a confirmar)$/iu.test(duration)) return "-";
  return duration
    .replace(/\b(?:hours?|hrs?|horas?)\b/giu, "h")
    .replace(/\b(?:minutes?|mins?|minutos?|min)\b/giu, "m")
    .replace(/(\d)\s*h(?=\s|\d|$)/giu, "$1 h")
    .replace(/(\d)\s*m(?=\s|$)/giu, "$1 m")
    .replace(/\s+/g, " ");
}
