let stats = {
  agents: 0,
  calls: 0,
  leads: 0,
  lastEvent: null,
  lastPayload: null
};

export default function handler(req, res) {
  if (req.method === "POST") {
    const body = req.body || {};

    const eventType =
      body.type ||
      body.event ||
      body.trigger ||
      body.webhookType ||
      "unknown";

    stats.lastEvent = eventType;
    stats.lastPayload = body;

    // Temporary broad matching until we confirm your exact GHL payload
    if (
      String(eventType).toLowerCase().includes("inboundmessage") ||
      String(eventType).toLowerCase().includes("conversation")
    ) {
      stats.calls += 1;
    }

    if (
      String(eventType).toLowerCase().includes("contact") ||
      String(eventType).toLowerCase().includes("lead")
    ) {
      stats.leads += 1;
    }

    if (
      String(eventType).toLowerCase().includes("appointment")
    ) {
      stats.agents += 1;
    }

    return res.status(200).json({
      success: true,
      received: eventType
    });
  }

  return res.status(200).json(stats);
}
