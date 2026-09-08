export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim();
  if (!q || q.length > 200) return Response.json({ results: [] }, { status: 400 });
  const url = new URL('https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates');
  url.search = new URLSearchParams({ SingleLine: q, f: 'json', outFields: 'Match_addr', maxLocations: '5', location: '46.65565475232994,24.82366291095728', outSR: '4326' }).toString();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Search service unavailable');
    const data = await response.json() as { error?:unknown; candidates?:{ address:string; location:{x:number;y:number} }[] };
    if (data.error || !Array.isArray(data.candidates)) throw new Error('Search unavailable');
    return Response.json({ results: data.candidates.map(c => ({ name:c.address, lat:c.location.y, lon:c.location.x })) }, { headers: { 'Cache-Control':'public, max-age=300' } });
  } catch { return Response.json({ error:'Place search is temporarily unavailable.' }, { status:502 }); }
}
