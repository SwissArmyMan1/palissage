/**
 * Builds the production axis for a lot timeline.
 *
 * `setProductionStatus` may skip stages, so a stage that was passed without a
 * record is marked as not recorded rather than given an invented date.
 */

import type { ProductionStatus } from '@/domain/types';
import { PRODUCTION_ORDER } from '@/domain/types';
import type { TimelineEvent } from './LotTimeline';

export function productionEvents(
  current: ProductionStatus,
  labels: Record<ProductionStatus, string>,
  recorded: Partial<Record<ProductionStatus, string>> = {},
): TimelineEvent[] {
  const currentIndex = PRODUCTION_ORDER.indexOf(current);
  return PRODUCTION_ORDER.map((stage, index) => {
    const occurredAt = recorded[stage];
    if (index < currentIndex) {
      return { label: labels[stage], state: occurredAt ? 'done' : 'skipped', occurredAt };
    }
    if (index === currentIndex) return { label: labels[stage], state: 'current', occurredAt };
    return { label: labels[stage], state: 'future' };
  });
}
