import { Injectable, Logger } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { characters, characterLocations } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Daily schedule entry for a character.
 */
export interface ScheduleEntry {
  time: string;        // "HH:MM" format
  activity: string;    // Short activity label
  location: string;    // Where they are
  mood: string;        // Expected mood
  energy: number;      // 0-10
  storyEligible: boolean; // Can generate a story during this time?
}

/**
 * Current status of a character at any given time.
 */
export interface CharacterStatus {
  isAvailable: boolean;
  isAwake: boolean;
  currentActivity: string;
  currentLocation: string;
  currentMood: string;
  energyLevel: number;
  nextActivity: ScheduleEntry | null;
  timeUntilNextActivity: number; // minutes
}

/**
 * Daily Life Engine
 *
 * Simulates a character's daily schedule — wake up, routines, activities, sleep.
 * Drives:
 * - Message availability (characters can be "busy" or "asleep")
 * - Story generation contexts (what they're doing right now)
 * - Location-based content
 * - Mood fluctuations throughout the day
 */
@Injectable()
export class DailyLifeService {
  private readonly logger = new Logger(DailyLifeService.name);

  /** Default schedule template — overridden by character's routines */
  private readonly DEFAULT_SCHEDULE: ScheduleEntry[] = [
    { time: '06:30', activity: 'Waking up', location: 'Home', mood: 'groggy', energy: 3, storyEligible: false },
    { time: '07:00', activity: 'Morning routine', location: 'Home', mood: 'refreshing', energy: 5, storyEligible: false },
    { time: '07:30', activity: 'Breakfast', location: 'Home', mood: 'content', energy: 6, storyEligible: true },
    { time: '08:30', activity: 'Morning workout', location: 'Gym', mood: 'energetic', energy: 8, storyEligible: true },
    { time: '09:30', activity: 'Getting ready', location: 'Home', mood: 'focused', energy: 7, storyEligible: false },
    { time: '10:00', activity: 'Work / Projects', location: 'Office', mood: 'productive', energy: 7, storyEligible: true },
    { time: '12:30', activity: 'Lunch break', location: 'Café', mood: 'relaxed', energy: 5, storyEligible: true },
    { time: '13:30', activity: 'Afternoon work', location: 'Office', mood: 'focused', energy: 6, storyEligible: false },
    { time: '17:00', activity: 'Wrapping up', location: 'Office', mood: 'tired', energy: 4, storyEligible: true },
    { time: '18:00', activity: 'Evening commute', location: 'Transit', mood: 'reflective', energy: 4, storyEligible: true },
    { time: '19:00', activity: 'Dinner', location: 'Home', mood: 'hungry', energy: 5, storyEligible: true },
    { time: '20:00', activity: 'Relaxing / TV', location: 'Home', mood: 'relaxed', energy: 4, storyEligible: true },
    { time: '21:00', activity: 'Social time / Gaming', location: 'Home', mood: 'playful', energy: 5, storyEligible: true },
    { time: '22:00', activity: 'Wind down', location: 'Home', mood: 'sleepy', energy: 3, storyEligible: false },
    { time: '23:00', activity: 'Sleeping', location: 'Home', mood: 'resting', energy: 1, storyEligible: false },
  ];

  /**
   * Get the character's current status based on their schedule and timezone.
   */
  getCurrentStatus(character: any, currentTime?: Date): CharacterStatus {
    const now = currentTime || new Date();
    const timezone = this.getCharacterTimezone(character);
    const localTime = this.getLocalTime(now, timezone);
    const schedule = this.getCharacterSchedule(character);

    // Find current and next activity
    const timeStr = this.formatTime(localTime);
    let currentActivity: ScheduleEntry | null = null;
    let nextActivity: ScheduleEntry | null = null;

    // Activities are sorted by time — find the current one
    for (let i = 0; i < schedule.length; i++) {
      const entry = schedule[i]!;
      if (entry.time <= timeStr) {
        currentActivity = entry;
        nextActivity = schedule[i + 1] ?? schedule[0]!; // wrap to next day
      }
    }

    // If before first activity (e.g., 2 AM), use last activity from previous day
    if (!currentActivity && schedule.length > 0) {
      currentActivity = schedule[schedule.length - 1]!;
      nextActivity = schedule[0]!;
    }

    const isSleeping = currentActivity?.activity.toLowerCase().includes('sleep') ?? false;
    const isAvailable = !isSleeping &&
      (currentActivity?.energy ?? 0) > 2 &&
      !['Waking up', 'Morning routine'].includes(currentActivity?.activity ?? '');

    const timeUntilNext = nextActivity
      ? this.minutesUntil(localTime, nextActivity.time)
      : 0;

    return {
      isAvailable,
      isAwake: !isSleeping,
      currentActivity: currentActivity?.activity ?? 'Unknown',
      currentLocation: currentActivity?.location ?? 'Unknown',
      currentMood: currentActivity?.mood ?? 'neutral',
      energyLevel: currentActivity?.energy ?? 5,
      nextActivity: nextActivity
        ? { ...nextActivity, time: this.adjustDayBoundary(localTime, nextActivity.time) }
        : null,
      timeUntilNextActivity: timeUntilNext,
    };
  }

  /**
   * Update a character's emotion state and activity in the database.
   * Called periodically or before generating content.
   */
  async updateCharacterState(characterId: string) {
    const db = getDb();
    const [char] = await db.select().from(characters)
      .where(eq(characters.id, characterId)).limit(1);
    if (!char) return null;

    const status = this.getCurrentStatus(char);

    // Check for mood transitions
    const prevMood = (char.emotionState as any)?.mood;
    const moodChanged = prevMood !== status.currentMood;

    await db.update(characters).set({
      emotionState: {
        mood: status.currentMood,
        energy: status.energyLevel,
        currentActivity: status.currentActivity,
        isAvailable: status.isAvailable,
        isAwake: status.isAwake,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    } as any).where(eq(characters.id, characterId));

    if (moodChanged && status.isAwake) {
      this.logger.debug(
        `${char.name}: ${prevMood || 'initial'} → ${status.currentMood} ` +
        `(${status.currentActivity}, energy: ${status.energyLevel}/10)`,
      );
    }

    return status;
  }

  /**
   * Generate a story prompt based on the character's current activity.
   */
  buildStoryContext(character: any): string {
    const status = this.getCurrentStatus(character);

    const timeStr = this.formatTime(this.getLocalTime(new Date(), this.getCharacterTimezone(character)));
    const location = status.currentLocation;

    const locationContext = location === 'Home'
      ? 'at home, cozy and comfortable'
      : location === 'Gym'
        ? 'at the gym, working out'
        : location === 'Café'
          ? 'at a café, enjoying a drink'
          : location === 'Office'
            ? 'at work, being productive'
            : location === 'Transit'
              ? 'on the move, commuting'
              : `at ${location}`;

    return `It's ${timeStr}. ${character.name} is ${status.currentActivity.toLowerCase()} ${locationContext}. Mood: ${status.currentMood}. Energy: ${status.energyLevel}/10.`;
  }

  /**
   * Check if a character should be "offline" right now.
   */
  shouldBeOffline(character: any): boolean {
    const status = this.getCurrentStatus(character);
    return !status.isAvailable;
  }

  /**
   * Get availability window for the next N hours.
   */
  getAvailabilityWindows(character: any, hoursAhead: number = 6): { start: string; end: string; activity: string }[] {
    const now = new Date();
    const timezone = this.getCharacterTimezone(character);
    const localTime = this.getLocalTime(now, timezone);
    const schedule = this.getCharacterSchedule(character);
    const endTime = new Date(localTime.getTime() + hoursAhead * 3600000);

    const windows: { start: string; end: string; activity: string }[] = [];
    let currentWindow: { start: string; end: string; activity: string } | null = null;

    // Walk through schedule and find available windows
    const timeStr = this.formatTime(localTime);
    const endTimeStr = this.formatTime(endTime);

    for (const entry of schedule) {
      if (entry.time < timeStr) continue;
      if (entry.time > endTimeStr) break;

      const isAvailable = entry.energy > 2 && !entry.activity.toLowerCase().includes('sleep');
      if (isAvailable && !currentWindow) {
        currentWindow = { start: entry.time, end: entry.time, activity: entry.activity };
      } else if (isAvailable && currentWindow) {
        currentWindow.end = entry.time;
      } else if (!isAvailable && currentWindow) {
        windows.push(currentWindow);
        currentWindow = null;
      }
    }

    if (currentWindow) windows.push(currentWindow);
    return windows;
  }

  // ── Private helpers ──

  private getCharacterTimezone(character: any): string {
    return (character as any).timezone || 'UTC';
  }

  private getLocalTime(now: Date, timezone: string): Date {
    try {
      const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      return tzDate;
    } catch {
      return now;
    }
  }

  private formatTime(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  private getCharacterSchedule(character: any): ScheduleEntry[] {
    const routines = character.routines;
    if (Array.isArray(routines) && routines.length > 0) {
      return routines as ScheduleEntry[];
    }
    return this.DEFAULT_SCHEDULE;
  }

  private minutesUntil(from: Date, targetTime: string): number {
    const parts = targetTime.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const target = new Date(from);
    target.setHours(h, m, 0, 0);
    if (target <= from) target.setDate(target.getDate() + 1);
    return Math.floor((target.getTime() - from.getTime()) / 60000);
  }

  private adjustDayBoundary(currentTime: Date, time: string): string {
    const parts = time.split(':').map(Number);
    const h = parts[0] ?? 0;
    const currentH = currentTime.getHours();
    if (h < currentH) return `Tomorrow ${time}`;
    return time;
  }
}
