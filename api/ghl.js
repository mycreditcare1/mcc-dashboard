let stats = {
  totalEvents: 0,
  lastEvent: null,
  lastPayload: null,
  recentContacts: []
};

export default function handler(req, res) {
  if (req.method === "POST") {
    const body = req.body || {};

    stats.totalEvents += 1;

    const contact = {
      name:
        body.full_name ||
        [body.first_name, body.last_name].filter(Boolean).join(" ") ||
        "Unknown",
      phone: body.phone || "",
      email: body.email || "",
      subAccount: body.location?.name || "",
      debtAmount: body["Debt Amount"] || "",
      agent:
        body.assigned_to ||
        body.assignedTo ||
        body.userName ||
        "Unassigned"
    };

    stats.lastEvent = "contact_event";
    stats.lastPayload = contact;

    stats.recentContacts.unshift(contact);
    stats.recentContacts = stats.recentContacts.slice(0, 10);

    return res.status(200).json({ success: true });
  }

  return res.status(200).json(stats);
}
