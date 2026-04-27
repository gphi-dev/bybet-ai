function buildLogEntry(level, event, data = {}) {
  return {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...data,
  };
}

export function logInfo(event, data = {}) {
  console.log(buildLogEntry("info", event, data));
}

export function logWarn(event, data = {}) {
  console.warn(buildLogEntry("warn", event, data));
}

export function logError(event, data = {}) {
  console.error(buildLogEntry("error", event, data));
}
