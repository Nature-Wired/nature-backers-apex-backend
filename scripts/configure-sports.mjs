// Explicit operator tool. Uses a verified short-lived server assertion, not user IDs.
// Does not connect to a database or apply migrations.
const fixtures = process.argv.includes('--fixtures');
const values = process.argv.slice(2);
const flag = name => values.includes(name) ? values[values.indexOf(name) + 1] : undefined;
try {
  const endpoint = process.env.SPORTS_BACKEND_URL;
  const authorization = process.env.SPORTS_ADMIN_TOKEN;
  if (!endpoint || !authorization) throw new Error('configuration');
  const url = new URL(endpoint);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('configuration');
  if (fixtures && process.env.NODE_ENV === 'production') throw new Error('configuration');
  const timestamps = fixtures ? ['fixture-wetlands', 'fixture-forest', 'fixture-coast'] : (flag('--projects') || '').split(',');
  if (timestamps.length !== 3 || new Set(timestamps).size !== 3 || (!fixtures && timestamps.some(t => !/^\d+\.\d+$/.test(t)))) throw new Error('configuration');
  const request = async (path, method, body) => {
    const response = await fetch(endpoint.replace(/\/$/, '') + path, { method, headers: { Authorization: `Bearer ${authorization}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    if (!response.ok) { const e = new Error('request'); e.status = response.status; throw e; }
    return response.json();
  };
  const now = Date.now();
  const campaign = await request('/admin/sports-campaigns', 'POST', {
    slug: flag('--slug') || 'oc-sports-summit-demo',
    name: fixtures ? 'Development fixture: fictional sports campaign' : 'Fictional sports sponsor demonstration',
    event: 'Fictional women’s sports showcase', sponsor: 'Fictional Community Partner',
    startsAt: new Date(now - 60000).toISOString(), endsAt: new Date(now + 14 * 86400000).toISOString(),
  });
  await request(`/admin/sports-campaigns/${campaign.id}/ballot`, 'PUT', { sourceTimestamps: timestamps });
  await request(`/admin/sports-campaigns/${campaign.id}/publish`, 'POST', {});
  console.log(JSON.stringify({ configured: true, slug: campaign.slug, fixture: fixtures }));
} catch (error) {
  console.error(JSON.stringify({ configured: false, httpStatus: error.status || null, error: 'Campaign setup failed; check server configuration, operator authorization and selected project timestamps. A draft may remain; inspect it before retrying.' }));
  process.exitCode = 1;
}
