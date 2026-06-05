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

function extractUsers(data) {
  if (!data) return [];

  if (Array.isArray(data.users)) return data.users;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data)) return data;

  return [];
}

export default async function handler(req, res) {
  try {
    const results = [];

    for (const location of LOCATIONS) {
      if (!location.apiKey || !location.locationId) {
        results.push({
          location: location.name,
          connected: false,
          error: "Missing API key or Location ID in Vercel environment variables",
          agents: []
        });

        continue;
      }

      const userResponse = await ghlRequest(
        location.apiKey,
        `/users/search?locationId=${location.locationId}`
      );

      const users = extractUsers(userResponse.data);

      results.push({
        location: location.name,
        locationId: location.locationId,
        connected: userResponse.ok,
        statusCode: userResponse.status,
        agents: users.map(user => ({
          id: user.id || user._id || "",
          name:
            user.name ||
            user.fullName ||
            `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
            user.email ||
            "Unknown User",
          email: user.email || "",
          phone: user.phone || "",
          status: "API Connected",
          livePhoneStatus: "Testing"
        })),
        rawCount: users.length,
        raw: userResponse.ok ? undefined : userResponse.data
      });
    }

    return res.status(200).json({
      success: true,
      message: "Live API test complete",
      locations: results
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
