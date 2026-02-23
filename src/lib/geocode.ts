const cache = new Map<string, { lat: number; lng: number } | null>();

export async function geocode(
  location: string
): Promise<{ lat: number; lng: number } | null> {
  const key = location.toLowerCase().trim();

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (!token) {
    console.warn("MAPBOX_SECRET_TOKEN not set — skipping geocode");
    cache.set(key, null);
    return null;
  }

  try {
    const encoded = encodeURIComponent(location);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&limit=1&types=place,region,country`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Geocode API error: ${res.status} for "${location}"`);
      cache.set(key, null);
      return null;
    }
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) {
      cache.set(key, null);
      return null;
    }
    const [lng, lat] = feature.center as [number, number];
    const result = { lat, lng };
    cache.set(key, result);
    return result;
  } catch (err) {
    console.error(`Geocode error for "${location}":`, err);
    cache.set(key, null);
    return null;
  }
}
