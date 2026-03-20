let stats = {
  totalEvents: 0,
  lastEvent: null,
  lastPayload: null,
  recentContacts: []
};

function normalizeDebt(value) {
  if (!value) return 0;
  const num = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function normalizeDuration(value) {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") return value;

  const str = String(value).trim();

  if (/^\d+$/.test(str)) return Number(str);

  if (str.includes(":")) {
    const parts = str.split(":").map(Number);
    if (parts.some(Number.isNaN)) return 0;

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }

  return 0;
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, s => s.toUpperCase());
}

export default function handler(req, res) {
  if (req.method === "POST") {
    const body = req.body || {};

    stats.totalEvents += 1;

    const contact = {
      name: body.full_name || "Unknown",
      phone: body.phone || "",
      email: body.email || "",
      subAccount: body.location || "",
      debtAmount: body["Debt Amount"] || "",
      debtValue: normalizeDebt(body["Debt Amount"] || ""),
      agent: body.Agent || "Unassigned",
      callDirection: titleCase(body["Call Direction"] || ""),
      callStatus: titleCase(body["Call Status"] || ""),
      callDurationRaw: body["Call Duration"] || "",
      callDurationSeconds: normalizeDuration(body["Call Duration"] || ""),
      callStartTime: body["Call Start Time"] || "",
      createdAt: new Date().toISOString()
    };

    stats.lastEvent = "call_event";
    stats.lastPayload = contact;

    stats.recentContacts.unshift(contact);
    stats.recentContacts = stats.recentContacts.slice(0, 100);

    return res.status(200).json({ success: true });
  }

  return res.status(200).json(stats);
}
