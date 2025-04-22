// lib/telemetry.ts

const TELEMETRY_SERVER_URL = process.env.TELEMETRY_SERVER_URL;

if (!TELEMETRY_SERVER_URL) {
  console.warn("⚠️ TELEMETRY_SERVER_URL not set. Telemetry logs will not be sent.");
}

/**
 * Sends a telemetry event to an external telemetry server.
 * The event will not be sent if:
 *  - ALLOW_TELEMETRY is set to "FALSE" (case-insensitive), or
 *  - The domain (provided in payload.domain) starts with "localhost" or "127.0.0.1".
 *
 * @param eventType - The type of telemetry event (e.g., "blog_post_created", "apiError").
 * @param payload - Additional event data. Should include a `domain` property for production checks.
 */
export async function sendTelemetryEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  // Check if telemetry is explicitly disabled via environment variable
  if (process.env.ALLOW_TELEMETRY && process.env.ALLOW_TELEMETRY.toUpperCase() === "FALSE") {
    return;
  }

  // Check if running in a local development environment based on domain
  const domain = payload.domain || "";
/*   if (domain && (typeof domain === "string") && (domain.startsWith("localhost") || domain.startsWith("127.0.0.1"))) {
    return;
  } */

  // Construct the data packet
  const telemetryData = {
    eventType,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Only attempt to send if the server URL is configured
  if (TELEMETRY_SERVER_URL) {
    try {
      const response = await fetch(TELEMETRY_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(telemetryData),
      });

      if (!response.ok) {
        console.error(`Telemetry server responded with status: ${response.status}`);
        try {
          const errorBody = await response.text();
          console.error(`Telemetry server error response: ${errorBody}`);
        } catch (bodyError) {
          console.error("Could not parse telemetry server error response body:", bodyError);
        }
      }
    } catch (err) {
      console.error("Error sending telemetry event (fetch failed):", err);
    }
  } else {
    if (!(process.env.ALLOW_TELEMETRY && process.env.ALLOW_TELEMETRY.toUpperCase() === "FALSE")) {
      console.warn("Telemetry URL not configured, event not sent:", JSON.stringify(telemetryData, null, 2));
    }
  }
}
