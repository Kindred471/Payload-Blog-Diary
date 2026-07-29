import * as migration_20260729_020044 from './20260729_020044';

export const migrations = [
  {
    up: migration_20260729_020044.up,
    down: migration_20260729_020044.down,
    name: '20260729_020044'
  },
];
