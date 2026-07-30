import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { featureFlags } from '@itchats/database/schema';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AdminRoleGuard } from './admin-role.guard';

@Controller('v1/admin/settings')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminSettingsController {
  @Get()
  async getSettings() {
    const db = getDb();
    const rows = await db.select().from(featureFlags);
    const flags: Record<string, { enabled: string; description?: string | null; rules: any }> = {};
    for (const r of rows) {
      flags[r.key] = { enabled: r.enabled, description: r.description, rules: r.rules };
    }
    return {
      platform: {
        name: 'ItChats AI',
        description: 'AI-powered social platform',
      },
      featureFlags: flags,
      defaults: {
        signupCredits: 100,
        dailyRefillCredits: 50,
      },
      rateLimits: {
        chatMessagesPerMinute: 30,
        imageGenerationsPerHour: 20,
        videoGenerationsPerHour: 5,
      },
      maintenanceMode: false,
    };
  }

  @Patch()
  async updateSettings(@Body() body: any, @Req() req: any) {
    const db = getDb();

    if (body.featureFlags) {
      for (const [key, value] of Object.entries(body.featureFlags)) {
        const v = value as any;
        await db
          .insert(featureFlags)
          .values({ key, enabled: v.enabled ?? 'false', description: v.description, rules: v.rules ?? {}, updatedBy: req.user?.userId })
          .onConflictDoUpdate({ target: featureFlags.key, set: { enabled: v.enabled ?? 'false', description: v.description, rules: v.rules ?? {}, updatedBy: req.user?.userId, updatedAt: new Date() } });
      }
    }

    return { updated: true };
  }
}
