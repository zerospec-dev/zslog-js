import { NextFunction } from "../mdc";

const mdc = new Map<string, unknown>();

export const use = (next: NextFunction) => {
  try {
    mdc.clear();
    next();
  } finally {
    mdc.clear();
  }
};

export const set = (key: string, value: unknown) => {
  mdc.set(key, value);
};

export const remove = (key: string) => {
  mdc.delete(key);
};

export const getAll = () => {
  if (mdc.size === 0) return undefined;

  const all: {[key: string]: unknown} = {};
  mdc.forEach((value, key) => {
    all[key] = value;
  });
  return all;
};
