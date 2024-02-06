export const levels = [
  'all',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'none',
] as const;

export const rlevels = levels.reduce((map, key, i) => {
  map[key] = i;
  return map;
}, {} as {[key: string]: number});
