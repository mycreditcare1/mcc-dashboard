let memoryStats = {
  totalEvents: 0,
  lastEvent: null,
  lastPayload: null,
  recentContacts: []
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function supabaseInsertCall(contact) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, skipped: true, reason: "Missing Supabase env vars" };
  }

  const row = {
    location_id: contact.locationId || null,
    subaccount_name: contact.subAccount || null,
    agent_name: contact.agent || null,
    lead_name: contact.name || null,
    phone: contact.phone || null,
    status: contact.callStatus || null,
    direction: contact.callDirection || null,
    campaign: null,
    queue: null,
    duration: Number(contact.callDurationSeconds || 0),
    event_type: "call",
    debt_amount: Number(contact.debtValue || 0),
    created_at: contact.createdAt || new Date().toISOString()
  };

  const response = await fetch(`${SUPABASE_URL}/rest/v1/call_events`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(row)
  });

  const text = await response.text();

  if (!response.ok) {
    console.error("SUPABASE INSERT ERROR:", response.status, text);
    return {
      ok: false,
      status: response.status,
      error: text
    };
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    ok: true,
    status: response.status,
    data
  };
}

async function supabaseGetCalls() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/call_events?select=*&order=created_at.desc&limit=1000`,
    {
      method: "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json"
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    console.error("SUPABASE READ ERROR:", response.status, text);
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function mapSupabaseRowsToContacts(rows = []) {
  return rows.map(row => ({
    name: row.lead_name || "Unknown",
    phone: row.phone || "",
    email: "",
    subAccount: row.subaccount_name || "Unknown",
    locationId: row.location_id || "",
    debtAmount: row.debt_amount
      ? `$${Number(row.debt_amount).toLocaleString()}`
      : "$0",
    debtValue: Number(row.debt_amount || 0),
    agent: row.agent_name || "Unassigned",
    callUser: "",
    callDirection: row.direction || "",
    callStatus: row.status || "",
    callDurationRaw: row.duration || 0,
    callDurationSeconds: Number(row.duration || 0),
    callStartTime: "",
    callEndTime: "",
    timeOfCall: row.created_at
      ? new Date(row.created_at).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Los_Angeles"
        })
      : "",
    createdAt: row.created_at || new Date().toISOString()
  }));
}

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

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
  }

  return 0;
}

function titleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, s => s.toUpperCase());
}

function getValue(body, keys = []) {
  for (const key of keys) {
    if (key.includes(".")) {
      const parts = key.split(".");
      let current = body;

      for (const part of parts) {
        if (current && Object.prototype.hasOwnProperty.call(current, part)) {
          current = current[part];
        } else {
          current = undefined;
          break;
        }
      }

      if (current !== undefined && current !== null && current !== "") {
        return current;
      }
    } else if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      return body[key];
    }
  }

  return "";
}

function normalizeDirection(value) {
  const str = String(value || "").toLowerCase();

  if (
    str.includes("inbound") ||
    str === "in" ||
    str === "inbound_call" ||
    str === "incoming"
  ) {
    return "Inbound";
  }

  if (
    str.includes("outbound") ||
    str === "out" ||
    str === "outbound_call" ||
    str === "outgoing"
  ) {
    return "Outbound";
  }

  return "";
}

function normalizeStatus(value) {
  const str = String(value || "").toLowerCase();

  if (!str) return "";
  if (str.includes("no-answer")) return "No Answer";
  if (str.includes("no answer")) return "No Answer";
  if (str.includes("voicemail")) return "Voicemail";
  if (str.includes("voice mail")) return "Voicemail";
  if (str.includes("busy")) return "Busy";
  if (str.includes("cancel")) return "Canceled";
  if (str.includes("miss")) return "Missed";
  if (str.includes("fail")) return "Failed";
  if (str.includes("answered")) return "Answered";
  if (str.includes("complete")) return "Completed";

  return titleCase(value);
}

function displayLocationName(value) {
  const raw =
    value && typeof value === "object"
      ? value.name || ""
      : value || "";

  return String(raw).trim();
}

function buildStatsFromContacts(contacts) {
  return {
    totalEvents: contacts.length,
    lastEvent: contacts.length ? "call_event" : null,
    lastPayload: contacts[0] || null,
    recentContacts: contacts
  };
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const body = req.body || {};

    const locationValue = getValue(body, [
      "location.name",
      "customData.Location",
      "location",
      "Sub Account",
      "subAccount"
    ]);

    const locationIdValue = getValue(body, [
      "customData.Location ID",
      "Location ID",
      "location.id"
    ]);

    const directionValue = getValue(body, [
      "customData.Call Direction",
      "Call Direction",
      "callDirection",
      "direction",
      "type",
      "phoneCall.direction"
    ]);

    const statusValue = getValue(body, [
      "customData.Call Status",
      "Call Status",
      "callStatus",
      "status",
      "phoneCall.callStatus"
    ]);

    const durationValue = getValue(body, [
      "customData.Call Duration",
      "Call Duration",
      "callDuration",
      "duration",
      "phoneCall.duration"
    ]);

    const startTimeValue = getValue(body, [
      "customData.Start Time",
      "customData.Call Start Time",
      "Start Time",
      "Call Start Time",
      "callStartTime",
      "startTime",
      "phoneCall.startTime"
    ]);

    const endTimeValue = getValue(body, [
      "customData.End Time",
      "customData.Call End Time",
      "End Time",
      "Call End Time",
      "callEndTime",
      "endTime",
      "phoneCall.endTime"
    ]);

    const timeOfCallValue = getValue(body, [
      "customData.Time of Call",
      "Time of Call",
      "timeOfCall"
    ]);

    const agentValue = getValue(body, [
      "customData.Agent",
      "Agent",
      "agent",
      "phoneCall.answeredBy.user.name"
    ]);

    const callUserValue = getValue(body, [
      "customData.Call User",
      "Call User",
      "callUser",
      "phoneCall.user.name",
      "userName"
    ]);

    const debtAmountValue = getValue(body, [
      "customData.Debt Amount",
      "Debt Amount",
      "debtAmount",
      "contact.debt_amount"
    ]);

    const contact = {
      name: getValue(body, [
        "full_name",
        "fullName",
        "contact.full_name",
        "first_name"
      ]) || "Unknown",

      phone: getValue(body, [
        "phone",
        "contact.phone"
      ]),

      email: getValue(body, [
        "email",
        "contact.email"
      ]),

      subAccount: displayLocationName(locationValue) || "Unknown",
      locationId: locationIdValue,

      debtAmount: debtAmountValue || "$0",
      debtValue: normalizeDebt(debtAmountValue),

      agent: agentValue || callUserValue || "Unassigned",
      callUser: callUserValue,

      callDirection: normalizeDirection(directionValue),
      callStatus: normalizeStatus(statusValue),
      callDurationRaw: durationValue,
      callDurationSeconds: normalizeDuration(durationValue),
      callStartTime: startTimeValue,
      callEndTime: endTimeValue,
      timeOfCall: timeOfCallValue,

      createdAt: new Date().toISOString()
    };

    const insertResult = await supabaseInsertCall(contact);

    memoryStats.totalEvents += 1;
    memoryStats.lastEvent = "call_event";
    memoryStats.lastPayload = contact;
    memoryStats.recentContacts.unshift(contact);
    memoryStats.recentContacts = memoryStats.recentContacts.slice(0, 1000);

    return res.status(200).json({
      success: true,
      storage: insertResult,
      received: contact
    });
  }

  const rows = await supabaseGetCalls();

  if (Array.isArray(rows)) {
    const contacts = mapSupabaseRowsToContacts(rows);
    return res.status(200).json(buildStatsFromContacts(contacts));
  }

  return res.status(200).json(memoryStats);
}
