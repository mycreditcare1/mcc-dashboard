const EXCLUDED_USERS = [
  "Aubrey Lobitana",
  "Eunice Alacron",
  "Joilyn Calan"
];

const LOCATIONS = [
  {
    name: "CAR 1",
    apiKey: process.env.CAR1_API_KEY,
    locationId: process.env.CAR1_LOCATION_ID
  },
  {
    name: "CAR 2",
    apiKey: process.env.CAR2_API_KEY,
    locationId: process.env.CAR2_LOCATION_ID
  },
  {
    name: "CAR 3",
    apiKey: process.env.CAR3_API_KEY,
    locationId: process.env.CAR3_LOCATION_ID
  }
];

async function ghlRequest(apiKey, path) {
  const response = await fetch(`https://services.leadconnectorhq.com${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Version: "2021-07-28",
      Accept: "application/json"
    }
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

function getConversations(data) {
  if (!data) return [];
  if (Array.isArray(data.conversations)) return data.conversations;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

function getUsers(data) {
  if (!data) return [];
  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data)) return data;
  return [];
}

function getUserName(user) {
  return (
    user.name ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    user.email ||
    "Unknown User"
  );
}

function normalizeConversation(conversation, locationName) {
  const type = String(conversation.lastMessageType || "").toLowerCase();
  const direction = String(conversation.lastMessageDirection || "").toLowerCase();
  const body = String(conversation.lastMessageBody || "").toLowerCase();

  let status = "Activity";

  if (type.includes("call")) status = "Call";
  if (body.includes("missed call")) status = "Missed";
  if (body.includes("voicemail") || body.includes("voice mail")) status = "Voicemail";
  if (direction === "outbound") status = "Outbound";
  if (direction === "inbound") status = "Inbound";

  return {
    id: conversation.id || "",
    location: locationName,
    contactName:
      conversation.fullName ||
      conversation.contactName ||
      conversation.phone ||
      conversation.email ||
      "Unknown",
    phone: conversation.phone || "",
    email: conversation.email || "",
    assignedTo: conversation.assignedTo || "",
    direction: direction ? direction.charAt(0).toUpperCase() + direction.slice(1) : "N/A",
    type: conversation.lastMessageType || "N/A",
    status,
    lastMessage: conversation.lastMessageBody || "",
    lastMessageDate: conversation.lastMessageDate || conversation.dateUpdated || conversation.dateAdded || null,
    unreadCount: conversation.unreadCount || 0
  };
}

function summarize(conversations) {
  const total = conversations.length;

  const inbound = conversations.filter(c =>
    String(c.direction).toLowerCase().includes("inbound")
  ).length;

  const outbound = conversations.filter(c =>
    String(c.direction).toLowerCase().includes("outbound")
  ).length;

  const missed = conversations.filter(c =>
    String(c.status).toLowerCase().includes("missed") ||
    String(c.lastMessage).toLowerCase().includes("missed call")
  ).length;

  const voicemail = conversations.filter(c =>
    String(c.status).toLowerCase().includes("voicemail") ||
    String(c.lastMessage).toLowerCase().includes("voicemail") ||
    String(c.lastMessage).toLowerCase().includes("voice mail")
  ).length;

  const unread = conversations.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0);

  return {
    totalRecentActivity: total,
    inbound,
    outbound,
    missed,
    voicemail,
    unread
  };
}

export default async function handler(req, res) {
  try {
    const allLocations = [];
    const allConversations = [];
    const allUsers = [];

    for (const location of LOCATIONS) {
      const conversationsResponse = await ghlRequest(
        location.apiKey,
        `/conversations/search?locationId=${location.locationId}&limit=25`
      );

      const usersResponse = await ghlRequest(
        location.apiKey,
        `/users/?locationId=${location.locationId}`
      );

      const conversations = getConversations(conversationsResponse.data).map(c =>
        normalizeConversation(c, location.name)
      );

      const users = getUsers(usersResponse.data)
        .filter(user => !EXCLUDED_USERS.includes(getUserName(user)))
        .map(user => ({
          id: user.id || user._id || "",
          name: getUserName(user),
          email: user.email || "",
          phone: user.phone || "",
          location: location.name,
          status: "Connected"
        }));

      allLocations.push({
        name: location.name,
        locationId: location.locationId,
        conversationsConnected: conversationsResponse.ok,
        conversationsStatus: conversationsResponse.status,
        usersConnected: usersResponse.ok,
        usersStatus: usersResponse.status,
        recentActivityCount: conversations.length,
        userCount: users.length
      });

      allConversations.push(...conversations);
      allUsers.push(...users);
    }

    allConversations.sort((a, b) => {
      return Number(b.lastMessageDate || 0) - Number(a.lastMessageDate || 0);
    });

    return res.status(200).json({
      success: true,
      message: "Live operations feed",
      summary: summarize(allConversations),
      locations: allLocations,
      agents: allUsers,
      activity: allConversations.slice(0, 50)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
