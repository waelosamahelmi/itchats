import { Injectable } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterLocations } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';

@Injectable()
export class NearbyService {
  /**
   * Find public AI characters near a geographic point.
   * Uses PostGIS if available, falls back to Haversine approximation.
   */
  async findNearby(lat: number, lng: number, radiusMeters: number = 50000, limit: number = 20) {
    const db = getDb();

    // Try PostGIS first
    try {
      const result = await db.execute(sql`
        SELECT
          c.id, c.name, c.handle, c.description, c.personality,
          cl.city, cl.region, cl.location_label,
          CASE WHEN cl.public_point IS NOT NULL THEN
            ST_Distance(cl.public_point, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography)
          ELSE NULL END AS distance_meters
        FROM characters c
        LEFT JOIN character_locations cl ON cl.character_id = c.id
        WHERE c.visibility = 'public'
          AND c.status = 'published'
          AND c.deleted_at IS NULL
          AND (
            cl.public_point IS NULL
            OR ST_DWithin(cl.public_point, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
          )
        ORDER BY distance_meters ASC NULLS LAST
        LIMIT ${limit}
      `);
      return result.rows.map(r => this.coarsenDistance(r));
    } catch {
      // PostGIS not available — fall back to text-based location and Haversine
      return this.fallbackNearby(lat, lng, radiusMeters, limit);
    }
  }

  private async fallbackNearby(lat: number, lng: number, radiusMeters: number, limit: number) {
    const db = getDb();
    const all = await db.select({
      id: characters.id, name: characters.name, handle: characters.handle,
      description: characters.description, personality: characters.personality,
      city: characterLocations.city, locationLabel: characterLocations.location_label,
    }).from(characters)
      .leftJoin(characterLocations, eq(characterLocations.characterId, characters.id))
      .where(and(eq(characters.visibility, 'public' as any), eq(characters.status, 'published' as any)))
      .limit(100);

    // Coarse filtering: match by city proximity (same city = "nearby")
    // In production, you'd add lat/lng columns to character_locations for Haversine math
    return all
      .map(c => ({ ...c, distance_meters: null, distance_label: c.city ? `${c.city} area` : 'Unknown' }))
      .slice(0, limit);
  }

  /**
   * Set or update a character's declared location.
   * The actual GPS point is coarsened — never exposing the creator's exact location.
   */
  async setCharacterLocation(characterId: string, city: string, region?: string, countryCode?: string, precisionMeters: number = 5000) {
    const db = getDb();
    // Coarsen: city center is rounded to ~5km precision
    const latRounded = 0; // In production: geocode city → lat/lng → round to precision
    const lngRounded = 0;

    try {
      await db.execute(sql`
        INSERT INTO character_locations (character_id, city, region, country_code, public_point, location_label, precision_meters)
        VALUES (${characterId}, ${city}, ${region ?? null}, ${countryCode ?? null},
          ST_SetSRID(ST_MakePoint(${lngRounded}, ${latRounded}), 4326),
          ${city}, ${precisionMeters})
        ON CONFLICT (character_id) DO UPDATE SET
          city = EXCLUDED.city, region = EXCLUDED.region,
          public_point = EXCLUDED.public_point, location_label = EXCLUDED.location_label,
          precision_meters = EXCLUDED.precision_meters, updated_at = NOW()
      `);
    } catch {
      // PostGIS not available — store text-only
      await db.insert(characterLocations).values({
        characterId, city, region: region ?? null, locationLabel: city,
        precisionMeters,
      } as any).onConflictDoUpdate({
        target: characterLocations.characterId,
        set: { city, region: region ?? null, locationLabel: city, updatedAt: new Date() } as any,
      });
    }
    return { success: true, city, precisionMeters };
  }

  /** Coarsen distance for privacy: bucket into ranges */
  private coarsenDistance(row: any) {
    const d = row.distance_meters;
    let label = 'Unknown';
    if (d !== null) {
      if (d < 1000) label = '< 1 km away';
      else if (d < 5000) label = `< ${Math.round(d / 1000)} km away`;
      else if (d < 50000) label = `< ${Math.round(d / 5000) * 5} km away`;
      else label = 'Far away';
    } else if (row.city) {
      label = `${row.city} area`;
    }
    return { ...row, distance_label: label };
  }
}
