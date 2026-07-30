import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '@itchats/config';

@Injectable()
export class ImageSearchService {
  private readonly logger = new Logger(ImageSearchService.name);
  private readonly FETCH_TIMEOUT_MS = 10_000;

  /**
   * Search for an image using Google Custom Search JSON API.
   * Falls back to Unsplash, then Unsplash Source direct URL if neither is configured.
   */
  async searchImage(query: string): Promise<string | undefined> {
    // 1. Try Google Custom Search
    const googleUrl = await this.searchGoogleCSE(query);
    if (googleUrl) return googleUrl;

    // 2. Try Unsplash API
    const unsplashUrl = await this.searchUnsplashAPI(query);
    if (unsplashUrl) return unsplashUrl;

    // 3. Fallback to Unsplash Source direct URL (no API key needed)
    return this.unsplashSourceUrl(query);
  }

  /**
   * Google Custom Search JSON API for images.
   * Uses GOOGLE_API_KEY + GOOGLE_CSE_ID.
   */
  private async searchGoogleCSE(query: string): Promise<string | undefined> {
    const config = getConfig();
    const apiKey = config.GOOGLE_API_KEY;
    const cseId = config.GOOGLE_CSE_ID;

    if (!apiKey || !cseId) {
      this.logger.debug('Google CSE not configured — skipping');
      return undefined;
    }

    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cseId);
      url.searchParams.set('q', query);
      url.searchParams.set('searchType', 'image');
      url.searchParams.set('num', '3');
      url.searchParams.set('imgSize', 'large');
      url.searchParams.set('safe', 'active');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Google CSE ${res.status}: ${body.slice(0, 200)}`);
        }

        const data: any = await res.json();
        const items: any[] = data.items ?? [];

        if (items.length > 0) {
          // Pick a random one for variety
          const pick = items[Math.floor(Math.random() * items.length)];
          const imageUrl = pick?.link;
          if (imageUrl && typeof imageUrl === 'string') {
            this.logger.log(`Google CSE image found for "${query}"`);
            return imageUrl;
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (err: any) {
      this.logger.warn(
        `Google CSE search failed for "${query}": ${err.message}`,
      );
    }

    return undefined;
  }

  /**
   * Unsplash API search.
   */
  private async searchUnsplashAPI(query: string): Promise<string | undefined> {
    const config = getConfig();
    const accessKey = config.UNSPLASH_ACCESS_KEY;

    if (!accessKey) {
      this.logger.debug('Unsplash API key not configured — skipping');
      return undefined;
    }

    try {
      const url = new URL('https://api.unsplash.com/search/photos');
      url.searchParams.set('query', query);
      url.searchParams.set('per_page', '3');
      url.searchParams.set('orientation', 'landscape');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Client-ID ${accessKey}`,
            'Accept-Version': 'v1',
          },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Unsplash ${res.status}`);
        }

        const data: any = await res.json();
        const results = data.results ?? [];

        if (results.length > 0) {
          const pick = results[Math.floor(Math.random() * results.length)];
          const imageUrl = pick?.urls?.regular ?? pick?.urls?.small;
          if (imageUrl) {
            this.logger.log(`Unsplash image found for "${query}"`);
            return imageUrl;
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } catch (err: any) {
      this.logger.warn(
        `Unsplash search failed for "${query}": ${err.message}`,
      );
    }

    return undefined;
  }

  /**
   * Fallback: Unsplash Source direct URL (no API key required).
   * Gives a relevant random image based on the query.
   */
  private unsplashSourceUrl(query: string): string {
    const encoded = encodeURIComponent(query);
    // Use Unsplash Source with random sig for variety
    const sig = Math.random().toString(36).substring(2, 8);
    return `https://source.unsplash.com/800x600/?${encoded}&sig=${sig}`;
  }
}
