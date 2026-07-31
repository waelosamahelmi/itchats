import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { postLinkPreviews } from '@itchats/database/schema';
import { eq } from 'drizzle-orm';
import * as net from 'node:net';

export interface LinkPreview {
  url: string;
  canonicalUrl?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}

// ── SSRF protection ──
const BLOCKED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]']);

const PRIVATE_IP_RANGES = [
  /^10\./,                        // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,   // 172.16.0.0/12
  /^192\.168\./,                  // 192.168.0.0/16
  /^127\./,                       // loopback
  /^0\./,                         // 0.0.0.0/8
  /^169\.254\./,                  // link-local
  /^fc00:/, /^fd00:/,             // unique local addresses (IPv6)
  /^fe80:/,                       // link-local (IPv6)
];

function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(lower)) return true;
  // Check if hostname resolves to a private IP
  return false; // we validate via DNS resolution
}

function isPrivateIp(ip: string): boolean {
  if (BLOCKED_HOSTS.has(ip)) return true;
  if (net.isIP(ip) === 0) return false;
  const normalized = ip.includes(':') ? ip.toLowerCase() : ip;
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(normalized)) return true;
  }
  return false;
}

// ── Simple in-memory cache ──
const previewCache = new Map<string, { preview: LinkPreview; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 1024 * 1024; // 1MB

@Injectable()
export class LinkPreviewService {
  private readonly logger = new Logger(LinkPreviewService.name);

  /**
   * Fetch link preview metadata for a URL.
   * Enforces SSRF protection: blocks private IPs, localhost, non-http protocols.
   * Results are cached in-memory for 30 minutes.
   */
  async getLinkPreview(url: string): Promise<LinkPreview> {
    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('Invalid URL');
    }

    // Block non-http protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Only HTTP and HTTPS URLs are allowed');
    }

    // Block localhost by hostname
    if (isBlockedHost(parsed.hostname)) {
      throw new BadRequestException('URL targets a blocked host');
    }

    // Check cache
    const cached = previewCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.preview;
    }

    try {
      // Resolve DNS and check for private IPs
      const { address } = await this.resolveAndCheck(parsed.hostname);

      if (isPrivateIp(address)) {
        throw new BadRequestException('URL resolves to a private/internal IP address');
      }

      // Fetch the page with SSRF-safe redirect handling
      const preview = await this.fetchPreview(url, parsed);

      // Cache result
      previewCache.set(url, { preview, timestamp: Date.now() });

      // Clean old cache entries periodically
      if (previewCache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of previewCache) {
          if (now - v.timestamp > CACHE_TTL_MS) previewCache.delete(k);
        }
      }

      return preview;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.warn(`Link preview failed for ${url}: ${err.message}`);
      return { url };
    }
  }

  /**
   * Store link preview for a post.
   */
  async savePostLinkPreview(postId: string, preview: LinkPreview): Promise<void> {
    const db = getDb();
    await db
      .insert(postLinkPreviews)
      .values({
        postId,
        url: preview.url,
        canonicalUrl: preview.canonicalUrl ?? null,
        title: preview.title ?? null,
        description: preview.description ?? null,
        imageUrl: preview.imageUrl ?? null,
        siteName: preview.siteName ?? null,
        faviconUrl: preview.faviconUrl ?? null,
      })
      .onConflictDoUpdate({
        target: postLinkPreviews.postId,
        set: {
          url: preview.url,
          canonicalUrl: preview.canonicalUrl ?? null,
          title: preview.title ?? null,
          description: preview.description ?? null,
          imageUrl: preview.imageUrl ?? null,
          siteName: preview.siteName ?? null,
          faviconUrl: preview.faviconUrl ?? null,
        },
      });
  }

  /**
   * Get link preview for a post.
   */
  async getPostLinkPreview(postId: string): Promise<LinkPreview | null> {
    const db = getDb();
    const [row] = await db
      .select()
      .from(postLinkPreviews)
      .where(eq(postLinkPreviews.postId, postId))
      .limit(1);

    if (!row) return null;

    return {
      url: row.url,
      canonicalUrl: row.canonicalUrl ?? undefined,
      title: row.title ?? undefined,
      description: row.description ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
      siteName: row.siteName ?? undefined,
      faviconUrl: row.faviconUrl ?? undefined,
    };
  }

  // ── Private helpers ──

  private resolveAndCheck(hostname: string): Promise<{ address: string }> {
    return new Promise((resolve, reject) => {
      const dns = require('node:dns');
      const timer = setTimeout(() => reject(new Error('DNS resolution timeout')), FETCH_TIMEOUT_MS);
      dns.lookup(hostname, { family: 0 }, (err: any, address: string) => {
        clearTimeout(timer);
        if (err) return reject(err);
        resolve({ address });
      });
    });
  }

  private async fetchPreview(initialUrl: string, parsed: URL): Promise<LinkPreview> {
    // Use a controller to enforce timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      let currentUrl = initialUrl;
      let response: Response | undefined;
      const seen = new Set<string>();

      // Follow redirects manually with SSRF checks at each hop
      for (let hop = 0; hop < 5; hop++) {
        if (seen.has(currentUrl)) throw new Error('Redirect loop detected');
        seen.add(currentUrl);

        const currentParsed = new URL(currentUrl);

        // Block non-http at each redirect
        if (!['http:', 'https:'].includes(currentParsed.protocol)) {
          throw new BadRequestException('Redirect to non-HTTP protocol blocked');
        }

        // DNS check for each redirect target
        const { address } = await this.resolveAndCheck(currentParsed.hostname);
        if (isPrivateIp(address)) {
          throw new BadRequestException('Redirect to private/internal IP blocked');
        }

        response = await fetch(currentUrl, {
          signal: controller.signal,
          redirect: 'manual',
          headers: {
            'User-Agent': 'itChats-LinkPreview/1.0 (compatible; +https://itchats.ai)',
            'Accept': 'text/html,application/xhtml+xml',
          },
        });

        // Handle redirects
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (!location) break;
          currentUrl = new URL(location, currentUrl).href;
          continue;
        }

        break;
      }

      if (!response || !response.ok) {
        return { url: initialUrl, canonicalUrl: currentUrl !== initialUrl ? currentUrl : undefined };
      }

      // Cap response size
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return { url: initialUrl, canonicalUrl: currentUrl !== initialUrl ? currentUrl : undefined };
      }

      const text = await response.text();
      const truncated = text.slice(0, MAX_RESPONSE_BYTES);

      return this.extractMetadata(truncated, initialUrl, currentUrl !== initialUrl ? currentUrl : undefined);
    } finally {
      clearTimeout(timer);
    }
  }

  private extractMetadata(html: string, originalUrl: string, canonicalUrl?: string): LinkPreview {
    const result: LinkPreview = { url: originalUrl, canonicalUrl };

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      result.title = this.sanitizeMeta(titleMatch[1].trim());
    }

    // Extract <meta> tags
    const metaRegex = /<meta\s+[^>]*?(?:property|name)\s*=\s*["']([^"']*)["'][^>]*?content\s*=\s*["']([^"']*)["'][^>]*?\/?>/gi;
    const metaByProperty = new Map<string, string>();

    let metaMatch: RegExpExecArray | null;
    while ((metaMatch = metaRegex.exec(html)) !== null) {
      const prop = metaMatch[1]!.toLowerCase();
      const content = metaMatch[2]!;
      if (!metaByProperty.has(prop)) {
        metaByProperty.set(prop, content);
      }
    }

    // Also try reversed order (content before property)
    const metaRegex2 = /<meta\s+[^>]*?content\s*=\s*["']([^"']*)["'][^>]*?(?:property|name)\s*=\s*["']([^"']*)["'][^>]*?\/?>/gi;
    while ((metaMatch = metaRegex2.exec(html)) !== null) {
      const content = metaMatch[1]!;
      const prop = metaMatch[2]!.toLowerCase();
      if (!metaByProperty.has(prop)) {
        metaByProperty.set(prop, content);
      }
    }

    // OpenGraph
    result.title = result.title || this.sanitizeMeta(metaByProperty.get('og:title') || '');
    result.description = this.sanitizeMeta(metaByProperty.get('og:description') || metaByProperty.get('description') || '');
    result.imageUrl = metaByProperty.get('og:image') || metaByProperty.get('twitter:image') || undefined;
    result.siteName = this.sanitizeMeta(metaByProperty.get('og:site_name') || '');
    result.faviconUrl = this.extractFavicon(html, originalUrl);

    // Fallback: if no og:title but we have <title>, keep it
    if (!result.title) {
      result.title = originalUrl;
    }

    // Fallback: first <img> if no og:image
    if (!result.imageUrl) {
      const imgMatch = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1]) {
        const imgUrl = imgMatch[1];
        result.imageUrl = imgUrl.startsWith('http') ? imgUrl : new URL(imgUrl, originalUrl).href;
      }
    }

    // Convert relative image URL to absolute
    if (result.imageUrl && result.imageUrl.startsWith('/')) {
      try {
        result.imageUrl = new URL(result.imageUrl, originalUrl).href;
      } catch { /* keep relative */ }
    }

    return result;
  }

  private extractFavicon(html: string, url: string): string | undefined {
    // Look for favicon link
    const linkMatch = html.match(/<link[^>]*rel\s*=\s*["'](?:shortcut\s+)?icon["'][^>]*href\s*=\s*["']([^"']+)["']/i)
      || html.match(/<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["'](?:shortcut\s+)?icon["']/i);

    if (linkMatch && linkMatch[1]) {
      const favicon = linkMatch[1];
      if (favicon.startsWith('http')) return favicon;
      try {
        return new URL(favicon, url).href;
      } catch { return undefined; }
    }

    // Fallback to /favicon.ico
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}/favicon.ico`;
    } catch {
      return undefined;
    }
  }

  private sanitizeMeta(text: string): string {
    if (!text) return '';
    // Decode HTML entities
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .slice(0, 500); // Cap at 500 chars
  }
}
