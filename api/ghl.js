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
  if (str.includes("complete")) return "Completed";
  if (str.includes("answered")) return "Answered";
  if (str.includes("voicemail")) return "Voicemail";
  if (str.includes("voice mail")) return "Voicemail";
  if (str.includes("no-answer")) return "No Answer";
  if (str.includes("no answer")) return "No Answer";
  if (str.includes("busy")) return "Busy";
  if (str.includes("cancel")) return "Canceled";
  if (str.includes("miss")) return "Missed";
  if (str.includes("fail")) return "Failed";

  return titleCase(value);
}

function displayLocationName(value) {
  const raw =
    value && typeof value === "object"
      ? value.name || ""
      : value || "";

  return String(raw).trim();
}

export default function handler(req, res) {
  if (req.method === "POST") {
    const body = req.body || {};

    stats.totalEvents += 1;

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

    stats.lastEvent = "call_event";
    stats.lastPayload = contact;

    stats.recentContacts.unshift(contact);

    // Keep more calls so you can review full-day activity.
    stats.recentContacts = stats.recentContacts.slice(0, 1000);

    return res.status(200).json({
      success: true,
      received: contact
    });
  }

  return res.status(200).json(stats);
}
