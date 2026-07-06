import { describe, expect, it } from 'vitest';
import { computeProperty } from '../engine/metrics.ts';
import { buildRedFlagChecklist } from '../engine/redflags.ts';
import { occupancy, property, samplePortfolio } from './fixtures.ts';

describe('buildRedFlagChecklist (brief §4.3)', () => {
  it('returns exactly the 10 checklist items in order', () => {
    const comps = samplePortfolio().properties.map(computeProperty);
    const checklist = buildRedFlagChecklist(comps);
    expect(checklist).toHaveLength(10);
    expect(checklist.map((i) => i.checklist_item_id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it('flags the utilization item when properties run below 50%', () => {
    const comps = [
      computeProperty(property({ id: 'a', occupancy: [occupancy({ occupiedDesks: 10, totalDesksAvailable: 100 })] })),
      computeProperty(property({ id: 'b', occupancy: [occupancy({ occupiedDesks: 15, totalDesksAvailable: 100 })] })),
    ];
    const item = buildRedFlagChecklist(comps).find((i) => i.checklist_item_id === 1)!;
    expect(item.status).toBe('fail');
    expect(item.sub_items).toHaveLength(2);
  });

  it('passes utilization when properties are healthily occupied', () => {
    const comps = [
      computeProperty(property({ id: 'a', occupancy: [occupancy({ occupiedDesks: 85, totalDesksAvailable: 100 })] })),
    ];
    const item = buildRedFlagChecklist(comps).find((i) => i.checklist_item_id === 1)!;
    expect(item.status).toBe('pass');
  });

  it('flags geographic concentration when one site holds >60% of headcount', () => {
    const comps = [
      computeProperty(property({ id: 'a', headcountOnSite: 300 })),
      computeProperty(property({ id: 'b', headcountOnSite: 50, city: 'Oakland' })),
    ];
    const item = buildRedFlagChecklist(comps).find((i) => i.checklist_item_id === 6)!;
    expect(item.status).toBe('warning');
  });
});
