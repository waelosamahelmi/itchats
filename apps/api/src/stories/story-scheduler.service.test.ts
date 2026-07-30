import { describe, expect, it, vi } from 'vitest';
import { StorySchedulerService } from './story-scheduler.service';

describe('StorySchedulerService background failure boundary', () => {
  it('contains and logs a failed scheduler tick', async () => {
    const scheduler = new StorySchedulerService({} as never, {} as never);
    const failure = new Error('database schema is behind');
    vi.spyOn(scheduler as any, 'tick').mockRejectedValue(failure);
    const log = vi.spyOn((scheduler as any).logger, 'error').mockImplementation(() => undefined);

    await expect((scheduler as any).runTickSafely()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith('Story scheduler tick failed: database schema is behind');
  });
});
