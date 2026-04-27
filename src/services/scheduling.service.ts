import ContentModel from '../models/content.model';
import ContentSlotModel from '../models/contentSlot.model';
import ContentScheduleModel from '../models/contentSchedule.model';
import type { Content, ContentSchedule } from '../types';

/**
 * SchedulingService — stateless, deterministic rotation algorithm.
 *
 * How it works:
 *  1. Fetch all approved, currently-active content for the teacher.
 *  2. Group by subject (each subject rotates independently).
 *  3. For each subject, retrieve the ordered schedule from content_schedule.
 *  4. Compute: currentMinutes = floor(Date.now() / 60000)
 *              positionInCycle = currentMinutes % totalCycleDuration
 *  5. Walk the rotation list until accumulated duration exceeds positionInCycle.
 *  6. Return the content at that position.
 */
const SchedulingService = {
  async getLiveContent(teacherId: string, subject?: string): Promise<Content | null> {
    const liveItems = await ContentModel.findApprovedLiveByTeacher(teacherId);
    if (liveItems.length === 0) return null;

    const filtered = subject
      ? liveItems.filter((c) => c.subject === subject.toLowerCase())
      : liveItems;

    if (filtered.length === 0) return null;

    // Group by subject
    const bySubject = filtered.reduce<Record<string, Content[]>>((acc, item) => {
      acc[item.subject] = acc[item.subject] ?? [];
      acc[item.subject].push(item);
      return acc;
    }, {});

    const results: Content[] = [];

    for (const [subj, items] of Object.entries(bySubject)) {
      const slot = await ContentSlotModel.findByTeacherAndSubject(teacherId, subj);
      if (!slot) continue;

      const scheduled: ContentSchedule[] = await ContentScheduleModel.findBySlot(slot.id);
      const liveSet = new Set(items.map((i) => i.id));

      const activeScheduled = scheduled.filter(
        (s) => s.content_id !== undefined && liveSet.has(s.content_id)
      );

      if (activeScheduled.length === 0) {
        // Fallback: no schedule entries — rotate raw list
        const active = SchedulingService._rotateByTime(items);
        if (active) results.push(active);
        continue;
      }

      // Build rotation list with durations from schedule
      const rotationList: Content[] = activeScheduled
        .map((s) => {
          const content = items.find((i) => i.id === s.content_id);
          if (!content) return null;
          return { ...content, rotation_duration: s.duration };
        })
        .filter((c): c is Content => c !== null);

      const active = SchedulingService._rotateByTime(rotationList);
      if (active) results.push(active);
    }

    return results[0] ?? null;
  },

  /**
   * Determines which content is active based on wall-clock time.
   * Pure function — no DB calls, fully testable.
   *
   * @param items  - Content items with rotation_duration (minutes)
   * @param now    - Override current time (for unit testing)
   */
  _rotateByTime(items: Content[], now?: Date): Content | null {
    if (!items.length) return null;

    const currentTime = now ?? new Date();
    const currentMinutes = Math.floor(currentTime.getTime() / 1000 / 60);

    const totalCycleDuration = items.reduce(
      (sum, item) => sum + (item.rotation_duration || 5),
      0
    );

    if (totalCycleDuration === 0) return items[0];

    const positionInCycle = currentMinutes % totalCycleDuration;

    let accumulated = 0;
    for (const item of items) {
      accumulated += item.rotation_duration || 5;
      if (positionInCycle < accumulated) return item;
    }

    return items[0];
  },
};

export default SchedulingService;
