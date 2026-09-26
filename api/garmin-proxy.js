// api/garmin-proxy.js
//
// Vercel serverless function — fetches a Garmin inReach MapShare KML feed
// SERVER-SIDE (Vercel's infrastructure -> Garmin), then hands the raw XML
// back to the browser as a same-origin response. Because the browser only
// ever talks to your own domain, there is no cross-origin request from
// its perspective — so no CORS policy applies, and no third-party proxy
// (corsproxy.io, allorigins.win, etc.) is needed or can flake out on you.
//
// Vercel auto-detects any file in /api as a serverless function — no
// config file needed. Called from the front end as:
//   /api/garmin-proxy?url=<encoded Garmin KML URL>

module.exports = async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    res.status(400).send('Missing required "url" query parameter.');
    return;
  }

  // Basic safety check — only ever proxy Garmin's own share domain, so
  // this function can't be repurposed as an open proxy for anything else.
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.status(400).send('Invalid "url" parameter.');
    return;
  }
  if (!/(^|\.)garmin\.com$/i.test(parsed.hostname)) {
    res.status(403).send('This proxy only forwards requests to garmin.com.');
    return;
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PatriotLoopTracker/1.0)' }
    });
    const text = await upstream.text();

    res.status(upstream.status);
    res.setHeader('Content-Type', 'text/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  } catch (err) {
    res.status(502).send('Upstream fetch to Garmin failed: ' + err.message);
  }
};
