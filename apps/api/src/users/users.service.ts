import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { getDb } from '@itchats/database';
import { users, userProfiles, userFriends, userScores, posts, mediaAssets, characterFollows } from '@itchats/database/schema';
import { eq, and, sql } from 'drizzle-orm';

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
    return { ...user, profile: profile ?? { displayName: null, bio: null } };
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

    return {
      id: user.id,
      username: user.username,
      displayName: profile?.displayName ?? null,
      avatarUrl: null, // Would need to join mediaAssets
      coverPhotoUrl: profile?.coverPhotoUrl ?? null,
      about: profile?.about ?? null,
      score: profile?.score ?? 0,
      website: profile?.website ?? null,
      location: profile?.location ?? null,
      friendshipCount: profile?.friendshipCount ?? 0,
      posts: userPosts,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    data: {
      displayName?: string;
      about?: string;
      website?: string;
      location?: string;
      coverPhotoUrl?: string;
    },
  ) {
    const db = getDb();
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.displayName !== undefined) updateData.displayName = data.displayName;
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

  async updateAvatar(userId: string, avatarUrl: string) {
    // Avatar URL is stored via the media system or external URL.
    // This method records the avatar update in the profile.
    const db = getDb();
    await db
      .insert(userProfiles)
      .values({
        userId,
        updatedAt: new Date(),
      } as any)
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          updatedAt: new Date(),
        } as any,
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
    },
  ) {
    const db = getDb();

    // Update profile fields
    const profileUpdate: Record<string, any> = { updatedAt: new Date() };
    if (data.displayName !== undefined) profileUpdate.displayName = data.displayName;
    if (data.country !== undefined) profileUpdate.location = data.country;

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
}
