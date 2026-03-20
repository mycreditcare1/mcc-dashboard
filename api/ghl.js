let stats = {
  agents: 0,
  calls: 0,
  leads: 0
};

export default function handler(req, res) {
  if (req.method === "POST") {
    const body = req.body;

    // Example logic (we’ll refine this)
    if (body.type === "inbound_message") {
      stats.calls++;
    }

    if (body.type === "new_lead") {
      stats.leads++;
    }

    if (body.type === "agent_activity") {
      stats.agents++;
    }

    return res.status(200).json({ success: true });
  }

  // GET request returns current stats
  return res.status(200).json(stats);
}
