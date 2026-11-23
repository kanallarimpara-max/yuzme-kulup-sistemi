import { useMemo } from 'react';
import { useCollection, type Row } from './store';
import { STANDARD_SEASON, STANDARD_SOURCE, STANDARDS } from './standardData';
import { unpackStandards, validPacked, type TitledStandard } from './standardSet';

type StandardSetDoc = Row & { season: string; source: string; payload: string; checkedAt: string; changedAt: string };

/** Her gün güncellenen TYF barajları. Sunucuya ulaşılamazsa uygulamayla gelen liste kullanılır. */
export function useStandards() {
  const current = useCollection<StandardSetDoc>('standardSets', { id: 'current' })[0];
  const payload = current?.payload;
  const standards = useMemo(() => {
    if (!payload) return STANDARDS as TitledStandard[];
    try {
      const packed: unknown = JSON.parse(payload);
      return validPacked(packed) ? unpackStandards(packed) : (STANDARDS as TitledStandard[]);
    } catch {
      return STANDARDS as TitledStandard[];
    }
  }, [payload]);
  return {
    standards,
    season: current?.season ?? STANDARD_SEASON,
    source: current?.source ?? STANDARD_SOURCE,
    checkedAt: current?.checkedAt ?? '',
    changedAt: current?.changedAt ?? '',
  };
}
