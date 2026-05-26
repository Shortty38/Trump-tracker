exports.handler = async function (event) {
  const params = event.queryStringParameters || {};
  const { network, timespan } = params;

  if (!network || !timespan) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing network or timespan" }),
    };
  }

  const query = encodeURIComponent(`trump station:${network}`);
  const gdeltUrl =
    `https://api.gdeltproject.org/api/v2/tv/tv` +
    `?query=${query}` +
    `&mode=timelinevol` +
    `&format=json` +
    `&datanorm=perc` +
    `&timelinesmooth=0` +
    `&datacomb=sep` +
    `&last24=yes` +
    `&timezoom=no` +
    `&TIMESPAN=${timespan}`;

  try {
    const response = await fetch(gdeltUrl);
    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GDELT fetch failed", detail: err.message }),
    };
  }
};
