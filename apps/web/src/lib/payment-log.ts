export function parseLogResponseData(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return { message: value };
  }
}

export function serializeLogPayload(payload: unknown): string | null {
  if (payload == null) return null;
  if (typeof payload === "string") {
    try {
      JSON.parse(payload);
      return payload;
    } catch {
      return JSON.stringify({ message: payload });
    }
  }
  return JSON.stringify(payload);
}
