import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getDb, getPool } from '@itchats/database';
import { users, userProfiles, userFriends, userScores, posts, characters, characterFollows, refreshTokens, mediaAssets } from '@itchats/database/schema';
import { eq, and, sql, or, ilike } from 'drizzle-orm';

@Injectable()
export class UsersService {
  async getMe(userId: string) {
    const db = getDb();
    const [user] = await db.select({
      id: users.id, email: users.email, username: users.username, role: users.role,
      status: users.status, createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundException('User not found');
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);

    // Count characters owned by user
    const [charCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(characters)
      .where(and(
        eq(characters.ownerUserId, userId),
        eq(characters.status, 'published'),
        sql`${characters.deletedAt} IS NULL`,
      ));

    // Count followers
    const [followerCount] = await db
      .select({ count: sql<number>`count(distinct ${characterFollows.userId})` })
      .from(characterFollows)
      .innerJoin(characters, and(
        eq(characterFollows.characterId, characters.id),
        eq(characters.ownerUserId, userId),
        sql`${characters.deletedAt} IS NULL`,
      ))
      .where(sql`${characterFollows.userId} IS NOT NULL`);

    return {
      ...user,
      profile: profile ?? { displayName: null, bio: null },
      characterCount: Number(charCount?.count ?? 0),
      followerCount: Number(followerCount?.count ?? 0),
    };
  }

  async updateMe(userId: string, data: { username?: string; displayName?: string; bio?: string; timezone?: string }) {
    const db = getDb();
    if (data.username) {
      await db.update(users).set({ username: data.username }).where(eq(users.id, userId));
    }
    if (data.timezone) {
      await db.update(users).set({ timezone: data.timezone }).where(eq(users.id, userId));
    }
    if (data.displayName || data.bio) {
      await db.insert(userProfiles).values({
        userId,
        displayName: data.displayName,
        bio: data.bio,
      }).onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          displayName: data.displayName,
          bio: data.bio,
          updatedAt: new Date(),
        },
      });
    }
    return this.getMe(userId);
  }

  async getByHandle(handle: string) {
    const db = getDb();
    const [user] = await db.select({
      id: users.id, username: users.username, createdAt: users.createdAt,
    }).from(users).where(eq(users.username, handle)).limit(1);
    if (!user) throw new NotFoundException('User not found');
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
    return { ...user, profile: profile ?? { displayName: null, bio: null } };
  }

  async deleteMe(userId: string) {
    const db = getDb();
    await db.execute(sql`UPDATE users SET status = 'deleted', deleted_at = NOW() WHERE id = ${userId}`);
    return { deleted: true };
  }

  // ── New methods ──

  async getUserProfile(userId: string, viewerUserId?: string) {
    const db = getDb();
    const [user] = await db.select({
      id: users.id, username: users.username, createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new NotFoundException('User not found');

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);

    // Resolve avatar URL if avatarMediaId is set
    let avatarUrl: string | null = null;
    if (profile?.avatarMediaId) {
      const [media] = await db.select({ id: mediaAssets.id, mimeType: mediaAssets.mimeType, metadata: mediaAssets.metadata })
        .from(mediaAssets).where(eq(mediaAssets.id, profile.avatarMediaId)).limit(1);
      if (media) {
        // For local media, construct the API endpoint URL
        const config = (await import('@itchats/config')).getConfig();
        const apiBase = config.API_BASE_URL || `http://localhost:${config.PORT}`;
        avatarUrl = `${apiBase}/v1/media/${media.id}`;
      }
    }

    // Get user's public posts
    const userPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.authorUserId, userId),
          sql`${posts.deletedAt} IS NULL`,
        ),
      )
      .orderBy(sql`${posts.createdAt} DESC`)
      .limit(10);

    // Count characters owned by user
    const [charCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(characters)
      .where(and(
        eq(characters.ownerUserId, userId),
        eq(characters.status, 'published'),
        sql`${characters.deletedAt} IS NULL`,
      ));

    // Count followers (users following characters owned by this user)
    const [followerCount] = await db
      .select({ count: sql<number>`count(distinct ${characterFollows.userId})` })
      .from(characterFollows)
      .innerJoin(characters, and(
        eq(characterFollows.characterId, characters.id),
        eq(characters.ownerUserId, userId),
        sql`${characters.deletedAt} IS NULL`,
      ))
      .where(sql`${characterFollows.userId} IS NOT NULL`);

    return {
      id: user.id,
      username: user.username,
      displayName: profile?.displayName ?? null,
      avatarUrl,
      coverPhotoUrl: profile?.coverPhotoUrl ?? null,
      bio: profile?.bio ?? null,
      about: profile?.about ?? null,
      score: profile?.score ?? 0,
      website: profile?.website ?? null,
      location: profile?.location ?? null,
      friendshipCount: profile?.friendshipCount ?? 0,
      characterCount: Number(charCount?.count ?? 0),
      followerCount: Number(followerCount?.count ?? 0),
      posts: userPosts,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      displayName?: string;
      bio?: string;
      about?: string;
      website?: string;
      location?: string;
      coverPhotoUrl?: string;
    },
  ) {
    const db = getDb();
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.about !== undefined) updateData.about = data.about;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.coverPhotoUrl !== undefined) updateData.coverPhotoUrl = data.coverPhotoUrl;

    await db
      .insert(userProfiles)
      .values({ userId, ...updateData })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: updateData,
      });

    return this.getUserProfile(userId);
  }

  async updateAvatar(userId: string, avatarUrl: string, avatarMediaId?: string) {
    const db = getDb();
    const updateSet: Record<string, any> = { updatedAt: new Date() };
    if (avatarMediaId) updateSet.avatarMediaId = avatarMediaId;

    await db
      .insert(userProfiles)
      .values({
        userId,
        ...updateSet,
      } as any)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: updateSet,
      });

    return { avatarUrl };
  }

  async updateCoverPhoto(userId: string, coverPhotoUrl: string) {
    const db = getDb();
    await db
      .insert(userProfiles)
      .values({
        userId,
        coverPhotoUrl,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: { coverPhotoUrl, updatedAt: new Date() },
      });
    return { coverPhotoUrl };
  }

  async sendFriendRequest(userId: string, friendId: string) {
    const db = getDb();
    if (userId === friendId) throw new BadRequestException('Cannot friend yourself');

    await db
      .insert(userFriends)
      .values({ userId, friendId, status: 'pending' })
      .onConflictDoUpdate({
        target: [userFriends.userId, userFriends.friendId],
        set: { status: 'pending', updatedAt: new Date() },
      });

    return { sent: true, userId, friendId };
  }

  async handleFriendRequest(
    userId: string,
    friendId: string,
    status: 'accepted' | 'rejected',
  ) {
    const db = getDb();

    const [request] = await db
      .select()
      .from(userFriends)
      .where(
        and(
          eq(userFriends.userId, friendId),
          eq(userFriends.friendId, userId),
          eq(userFriends.status, 'pending'),
        ),
      )
      .limit(1);

    if (!request) throw new NotFoundException('Friend request not found');

    if (status === 'accepted') {
      await db
        .update(userFriends)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(userFriends.id, request.id));

      // Create reciprocal friendship entry
      await db
        .insert(userFriends)
        .values({ userId, friendId, status: 'accepted' })
        .onConflictDoUpdate({
          target: [userFriends.userId, userFriends.friendId],
          set: { status: 'accepted', updatedAt: new Date() },
        });

      // Update friendship counts
      await db
        .update(userProfiles)
        .set({
          friendshipCount: sql`${userProfiles.friendshipCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, userId));

      await db
        .update(userProfiles)
        .set({
          friendshipCount: sql`${userProfiles.friendshipCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.userId, friendId));
    } else {
      await db
        .update(userFriends)
        .set({ status: 'blocked' as any, updatedAt: new Date() } as any)
        .where(eq(userFriends.id, request.id));
    }

    return { status, userId, friendId };
  }

  async removeFriend(userId: string, friendId: string) {
    const db = getDb();

    // Delete both directions
    await db
      .delete(userFriends)
      .where(
        and(eq(userFriends.userId, userId), eq(userFriends.friendId, friendId)),
      );
    await db
      .delete(userFriends)
      .where(
        and(eq(userFriends.userId, friendId), eq(userFriends.friendId, userId)),
      );

    // Update friendship counts
    await db
      .update(userProfiles)
      .set({
        friendshipCount: sql`GREATEST(0, ${userProfiles.friendshipCount} - 1)`,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId));

    await db
      .update(userProfiles)
      .set({
        friendshipCount: sql`GREATEST(0, ${userProfiles.friendshipCount} - 1)`,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, friendId));

    return { removed: true, userId, friendId };
  }

  async getUserFriends(userId: string) {
    const db = getDb();
    const friends = await db
      .select({
        friendId: userFriends.friendId,
        status: userFriends.status,
        createdAt: userFriends.createdAt,
      })
      .from(userFriends)
      .where(
        and(
          eq(userFriends.userId, userId),
          eq(userFriends.status, 'accepted'),
        ),
      );

    // For each friend, get basic profile
    const friendDetails = await Promise.all(
      friends.map(async (f) => {
        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
          })
          .from(users)
          .where(eq(users.id, f.friendId))
          .limit(1);
        const [profile] = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, f.friendId))
          .limit(1);
        return {
          ...user,
          displayName: profile?.displayName ?? null,
          avatarUrl: null,
        };
      }),
    );

    return { friends: friendDetails, count: friendDetails.length };
  }

  async getMyFriends(userId: string) {
    return this.getUserFriends(userId);
  }

  async getScore(userId: string) {
    const db = getDb();
    const [score] = await db
      .select()
      .from(userScores)
      .where(eq(userScores.userId, userId))
      .limit(1);

    if (!score) {
      return {
        score: 0,
        characterPopularity: 0,
        postsEngagement: 0,
        dailyActivity: 0,
        weeklyActivity: 0,
        rank: 'Newcomer',
      };
    }

    return {
      score: score.score,
      characterPopularity: score.characterPopularity,
      postsEngagement: score.postsEngagement,
      dailyActivity: score.dailyActivity,
      weeklyActivity: score.weeklyActivity,
      rank: score.rank,
    };
  }

  async saveWizard(
    userId: string,
    data: {
      displayName?: string;
      country?: string;
      referrer?: string;
      avatarUrl?: string;
      preferredLanguage?: string;
      autoTranslate?: boolean;
      theme?: 'dark' | 'light';
      followedCharacterIds?: string[];
      wizardCompleted?: boolean;
      gender?: string;
      lookingFor?: string;
      interestedIn?: string;
    },
  ) {
    const db = getDb();

    // Update profile fields
    const profileUpdate: Record<string, any> = { updatedAt: new Date() };
    if (data.displayName !== undefined) profileUpdate.displayName = data.displayName;
    if (data.country !== undefined) profileUpdate.location = data.country;
    if (data.gender !== undefined) profileUpdate.gender = data.gender;
    if (data.lookingFor !== undefined) profileUpdate.lookingFor = data.lookingFor;
    if (data.interestedIn !== undefined) profileUpdate.interestedIn = data.interestedIn;

    if (Object.keys(profileUpdate).length > 1) {
      await db
        .insert(userProfiles)
        .values({ userId, ...profileUpdate })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: profileUpdate,
        });
    }

    // Update user-level fields (locale, theme_id on profile)
    if (data.preferredLanguage !== undefined) {
      await db.update(users).set({ locale: data.preferredLanguage, updatedAt: new Date() }).where(eq(users.id, userId));
    }
    if (data.theme !== undefined) {
      await db
        .insert(userProfiles)
        .values({ userId, themeId: data.theme === 'light' ? 'light' : 'midnight', updatedAt: new Date() } as any)
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: { themeId: data.theme === 'light' ? 'light' : 'midnight', updatedAt: new Date() } as any,
        });
    }

    // Follow suggested characters
    if (data.followedCharacterIds && data.followedCharacterIds.length > 0) {
      for (const charId of data.followedCharacterIds) {
        await db
          .insert(characterFollows)
          .values({ userId, characterId: charId })
          .onConflictDoNothing();
      }
    }

    return { saved: true, wizardCompleted: data.wizardCompleted ?? true };
  }

  // ── Settings Persistence ──

  /** Get all user settings (privacy, notification prefs, content prefs, char visibility) */
  async getUserSettings(userId: string) {
    const db = getDb();
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);

    // Character visibility preference
    const pool = getPool();
    const visResult = await pool.query(
      `SELECT value FROM user_settings WHERE user_id = $1 AND key = 'char_visibility' LIMIT 1`,
      [userId],
    );
    const charVisibility = visResult.rows[0]?.value ?? 'Everyone';

    // Content preferences
    const nsfwResult = await pool.query(
      `SELECT value FROM user_settings WHERE user_id = $1 AND key = 'nsfw_filter' LIMIT 1`,
      [userId],
    );
    const contentLangResult = await pool.query(
      `SELECT value FROM user_settings WHERE user_id = $1 AND key = 'content_language' LIMIT 1`,
      [userId],
    );
    const nsfwFilter = nsfwResult.rows[0]?.value ?? 'true';
    const contentLanguage = contentLangResult.rows[0]?.value ?? 'en';

    // Notification preferences
    const notifResult = await pool.query(
      `SELECT value FROM user_settings WHERE user_id = $1 AND key = 'notification_preferences' LIMIT 1`,
      [userId],
    );
    let notificationPreferences = {
      pushNotifs: true,
      emailNotifs: false,
      charPostNotifs: true,
      storyNotifs: true,
      msgNotifs: true,
      reactNotifs: false,
    };
    try {
      if (notifResult.rows[0]?.value) {
        notificationPreferences = JSON.parse(notifResult.rows[0].value);
      }
    } catch {}

    return {
      privateAccount: profile?.privateAccount === 'true',
      discoverable: profile?.discoverable !== 'false',
      charVisibility,
      nsfwFilter: nsfwFilter === 'true',
      contentLanguage,
      notificationPreferences,
    };
  }

  /** Update user settings */
  async updateUserSettings(
    userId: string,
    data: {
      privateAccount?: boolean;
      discoverable?: boolean;
      charVisibility?: string;
      nsfwFilter?: boolean;
      contentLanguage?: string;
      notificationPreferences?: Record<string, boolean>;
    },
  ) {
    const db = getDb();
    const pool = getPool();

    // Update profile-level privacy flags
    if (data.privateAccount !== undefined || data.discoverable !== undefined) {
      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (data.privateAccount !== undefined) updateData.privateAccount = String(data.privateAccount);
      if (data.discoverable !== undefined) updateData.discoverable = String(data.discoverable);
      await db
        .insert(userProfiles)
        .values({ userId, ...updateData } as any)
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: updateData,
        });
    }

    // Upsert helper for user_settings table
    const upsertSetting = async (key: string, value: string) => {
      await pool.query(
        `INSERT INTO user_settings (user_id, key, value) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, key) DO UPDATE SET value = $3, updated_at = NOW()`,
        [userId, key, value],
      );
    };

    if (data.charVisibility !== undefined) await upsertSetting('char_visibility', data.charVisibility);
    if (data.nsfwFilter !== undefined) await upsertSetting('nsfw_filter', String(data.nsfwFilter));
    if (data.contentLanguage !== undefined) await upsertSetting('content_language', data.contentLanguage);
    if (data.notificationPreferences !== undefined) {
      await upsertSetting('notification_preferences', JSON.stringify(data.notificationPreferences));
    }

    return this.getUserSettings(userId);
  }

  // ── Blocked Users ──

  /** Get blocked users list */
  async getBlockedUsers(userId: string) {
    const db = getDb();
    const blocked = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: userProfiles.displayName,
        blockedAt: userFriends.updatedAt,
      })
      .from(userFriends)
      .innerJoin(users, eq(userFriends.friendId, users.id))
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(
        and(
          eq(userFriends.userId, userId),
          eq(userFriends.status, 'blocked' as any),
        ),
      )
      .orderBy(sql`${userFriends.updatedAt} DESC`);
    return { blocked, count: blocked.length };
  }

  /** Block a user */
  async blockUser(userId: string, targetId: string) {
    if (userId === targetId) throw new BadRequestException('Cannot block yourself');
    const db = getDb();
    await db
      .insert(userFriends)
      .values({ userId, friendId: targetId, status: 'blocked' as any })
      .onConflictDoUpdate({
        target: [userFriends.userId, userFriends.friendId],
        set: { status: 'blocked' as any, updatedAt: new Date() },
      });
    return { blocked: true, userId, targetId };
  }

  /** Unblock a user */
  async unblockUser(userId: string, targetId: string) {
    const db = getDb();
    await db
      .delete(userFriends)
      .where(
        and(
          eq(userFriends.userId, userId),
          eq(userFriends.friendId, targetId),
          eq(userFriends.status, 'blocked' as any),
        ),
      );
    return { unblocked: true, userId, targetId };
  }

  /** Search users (for blocking) */
  async searchUsers(userId: string, query: string, limit = 10) {
    const db = getDb();
    const results = await db
      .select({ id: users.id, username: users.username, displayName: userProfiles.displayName })
      .from(users)
      .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(
        and(
          or(
            ilike(users.username, `%${query}%`),
            ilike(userProfiles.displayName, `%${query}%`),
          ),
          sql`${users.id} != ${userId}`,
          sql`${users.status} = 'active'`,
        ),
      )
      .limit(limit);
    return results;
  }
}
