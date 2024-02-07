import * as cls from 'cls-hooked';

import { NextFunction } from "../mdc";

const NAME = '9f5bbd3c-6179-579c-1c2a-fef8b88bc96a';

let ns: cls.Namespace;

export const use = (next: NextFunction) => {
  ns = cls.getNamespace(NAME) ?? cls.createNamespace(NAME);
  ns.run(next);
};

const mdc = () => {
  let map: Map<string, unknown> = ns.get('mdc');
  if (map == null) {
    map = new Map();
    ns.set('mdc', map);
  }
  return map;
};

export const set = (key: string, value: unknown) => {
  mdc().set(key, value);
};

export const remove = (key: string) => {
  mdc().delete(key);
};

export const getAll = () => {
  const _mdc = mdc();
  if (_mdc.size === 0) return undefined;

  const all: {[key: string]: unknown} = {};
  _mdc.forEach((value, key) => {
    all[key] = value;
  });
  return all;
};
