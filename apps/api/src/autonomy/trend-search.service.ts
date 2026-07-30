import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '@itchats/config';
import { alibabaChat } from '@itchats/ai-core';

interface NewsResult {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  source: string;
  publishedAt: string;
}

export interface TrendSearchResult {
  newsResults: NewsResult[];
  characterReaction: string;
  selectedImageUrl?: string;
  usedFallback: boolean;
}

@Injectable()
export class TrendSearchService {
  private readonly logger = new Logger(TrendSearchService.name);
  private readonly NEWS_API_BASE = 'https://newsapi.org/v2';
  private readonly UNSPLASH_API_BASE = 'https://api.unsplash.com';
  private readonly FETCH_TIMEOUT_MS = 10_000;

  /**
   * Search for trends/news matching a character's interests.
   * Falls back to LLM-simulated trends if no News API key is configured.
   */
  async searchTrends(
    topic: string,
    opts?: { pageSize?: number; language?: string },
  ): Promise<NewsResult[]> {
    const config = getConfig();
    const apiKey = config.NEWS_API_KEY;

    if (apiKey) {
      try {
        return await this.searchNewsApi(topic, apiKey, opts);
      } catch (err: any) {
        this.logger.warn(
          `NewsAPI search failed for "${topic}": ${err.message}. Falling back to simulated trends.`,
        );
      }
    }

    // Fallback: LLM-simulated trends
    return this.simulateTrends(topic, opts?.pageSize ?? 5);
  }

  /**
   * Real NewsAPI search (free tier: 100 req/day).
   * Docs: https://newsapi.org/docs
   */
  private async searchNewsApi(
    topic: string,
    apiKey: string,
    opts?: { pageSize?: number; language?: string },
  ): Promise<NewsResult[]> {
    const pageSize = Math.min(opts?.pageSize ?? 5, 10);
    const language = opts?.language ?? 'en';

    const url = new URL(`${this.NEWS_API_BASE}/everything`);
    url.searchParams.set('q', topic);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('language', language);
    url.searchParams.set('sortBy', 'publishedAt');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.FETCH_TIMEOUT_MS);

    try {
      const res = await fetch(url.toString(), {
        headers: { 'X-Api-Key': apiKey },
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`NewsAPI ${res.status}: ${body.slice(0, 200)}`);
      }

      const data: any = await res.json();

      if (data.status !== 'ok') {
        throw new Error(`NewsAPI error: ${data.message ?? data.status}`);
      }

      return (data.articles ?? []).map((article: any) => ({
        title: article.title ?? '',
        description: article.description ?? '',
        url: article.url ?? '',
        imageUrl: article.urlToImage ?? undefined,
        source: article.source?.name ?? 'Unknown',
        publishedAt: article.publishedAt ?? new Date().toISOString(),
      }));
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fallback: have the LLM simulate trending topics the character would care about.
   * Generates realistic-sounding "news" headlines based on the character's interests.
   */
  private async simulateTrends(
    topic: string,
    count: number,
  ): Promise<NewsResult[]> {
    try {
      const prompt = `You are simulating a trending news feed. Generate ${count} realistic, specific news headlines about "${topic}" that sound like actual recent news articles. Each should have a believable title, a 1-2 sentence description, and a fake but realistic source name (like "TechCrunch", "BBC", "Reuters", "The Verge", "National Geographic", etc.). Make them sound like real 2026 headlines.

Return ONLY a JSON array (no markdown, no code fences):
[
  {
    "title": "Headline text",
    "description": "Brief article description",
    "source": "Realistic source name"
  }
]`;

      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.8,
        maxTokens: 800,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      const items = JSON.parse(cleaned);

      if (!Array.isArray(items)) {
        throw new Error('LLM did not return an array');
      }

      return items.slice(0, count).map((item: any, idx: number) => ({
        title: item.title ?? `Trending: ${topic}`,
        description: item.description ?? `Latest updates about ${topic}.`,
        url: `https://www.google.com/search?q=${encodeURIComponent(item.title ?? topic)}`,
        imageUrl: undefined,
        source: item.source ?? 'Trending',
        publishedAt: new Date(
          Date.now() - Math.random() * 86_400_000,
        ).toISOString(),
      }));
    } catch (err: any) {
      this.logger.error(`Failed to simulate trends: ${err.message}`);
      // Ultimate fallback: return a basic placeholder
      return [
        {
          title: `What's new with ${topic}`,
          description: `Trends and updates about ${topic}.`,
          url: `https://www.google.com/search?q=${encodeURIComponent(topic)}`,
          source: 'Trending',
          publishedAt: new Date().toISOString(),
        },
      ];
    }
  }

  /**
   * Find an image for a topic using Unsplash (free tier: 50 req/hour).
   * Falls back to an LLM-generated image description if no Unsplash key.
   */
  async findImageForTopic(
    topic: string,
  ): Promise<{ imageUrl?: string; usedFallback: boolean }> {
    const config = getConfig();
    const accessKey = config.UNSPLASH_ACCESS_KEY;

    if (accessKey) {
      try {
        const imageUrl = await this.searchUnsplash(topic, accessKey);
        if (imageUrl) return { imageUrl, usedFallback: false };
      } catch (err: any) {
        this.logger.warn(
          `Unsplash search failed for "${topic}": ${err.message}`,
        );
      }
    }

    // Fallback: no image available from API — caller can use LLM-generated image or skip
    return { imageUrl: undefined, usedFallback: true };
  }

  /**
   * Search Unsplash for a relevant photo. Free tier: 50 req/hour.
   * Docs: https://unsplash.com/documentation
   */
  private async searchUnsplash(
    query: string,
    accessKey: string,
  ): Promise<string | null> {
    const url = new URL(`${this.UNSPLASH_API_BASE}/search/photos`);
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
        const body = await res.text().catch(() => '');
        throw new Error(`Unsplash ${res.status}: ${body.slice(0, 200)}`);
      }

      const data: any = await res.json();
      const results = data.results ?? [];

      if (results.length > 0) {
        // Pick a random one from top results for variety
        const pick = results[Math.floor(Math.random() * results.length)];
        return pick?.urls?.regular ?? pick?.urls?.small ?? null;
      }

      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Full pipeline: search trends for a character, get their LLM reaction,
   * and optionally find a matching image.
   */
  async searchTrendsForCharacter(
    characterName: string,
    personality: string,
    interests: string[],
    mood: string,
  ): Promise<TrendSearchResult> {
    // Pick a random interest
    const topics = interests.length > 0 ? interests : ['current events'];
    const topic = topics[Math.floor(Math.random() * topics.length)]!;

    this.logger.log(
      `${characterName} searching trends for topic: "${topic}"`,
    );

    // Search for news
    const newsResults = await this.searchTrends(topic);

    // Find a matching image (imageUrl may be undefined if Unsplash fails or is not configured)
    const { imageUrl } = await this.findImageForTopic(topic);

    // Have the character react to the top story in their voice
    const topStory = newsResults[0];
    const characterReaction = await this.generateCharacterReaction(
      characterName,
      personality,
      mood,
      topic,
      topStory,
    );

    return {
      newsResults,
      characterReaction,
      selectedImageUrl: imageUrl,
      usedFallback: !getConfig().NEWS_API_KEY,
    };
  }

  /**
   * Use LLM to have the character react to a news story in their own voice.
   */
  private async generateCharacterReaction(
    characterName: string,
    personality: string,
    mood: string,
    topic: string,
    story?: NewsResult,
  ): Promise<string> {
    const storyContext = story
      ? `HEADLINE: "${story.title}"\nSUMMARY: ${story.description}\nSOURCE: ${story.source ?? 'Unknown'}`
      : `You've been following trends about "${topic}".`;

    const prompt = `You are ${characterName}. ${personality}
Current mood: ${mood}.

You just saw this trending news story:

${storyContext}

React to this as yourself. Write a natural social media post (1-3 sentences) sharing your take on this. Your reaction should:
- Sound like YOUR voice — same slang, same energy, same personality
- NOT be generic "this is interesting" — have a real opinion
- Feel like something a real person would post when reacting to news
- Be specific to what makes YOU care about this topic

Return ONLY a JSON object (no markdown, no code fences):
{
  "content": "your reaction post (max 280 chars)"
}`;

    try {
      const result = await alibabaChat({
        messages: [{ role: 'user', content: prompt }],
        model: 'qwen-flash',
        temperature: 0.9,
        maxTokens: 300,
      });

      const cleaned = result.content
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      const json = JSON.parse(cleaned);
      return typeof json.content === 'string' ? json.content.slice(0, 280) : '';
    } catch (err: any) {
      this.logger.error(
        `Failed to generate reaction for ${characterName}: ${err.message}`,
      );
      return `Just saw something about ${topic}... what do you all think?`;
    }
  }
}
