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

export default async function handler(req, res) {
  try {
    const results = [];

    for (const location of LOCATIONS) {
      const checks = {};

      checks.locationInfo = await ghlRequest(
        location.apiKey,
        `/locations/${location.locationId}`
      );

      checks.usersByLocation = await ghlRequest(
        location.apiKey,
        `/users/?locationId=${location.locationId}`
      );

      checks.conversations = await ghlRequest(
        location.apiKey,
        `/conversations/search?locationId=${location.locationId}&limit=5`
      );

      results.push({
        location: location.name,
        locationId: location.locationId,
        checks: {
          locationInfo: {
            ok: checks.locationInfo.ok,
            status: checks.locationInfo.status,
            data: checks.locationInfo.data
          },
          usersByLocation: {
            ok: checks.usersByLocation.ok,
            status: checks.usersByLocation.status,
            data: checks.usersByLocation.data
          },
          conversations: {
            ok: checks.conversations.ok,
            status: checks.conversations.status,
            data: checks.conversations.data
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: "Live API endpoint test complete",
      results
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
