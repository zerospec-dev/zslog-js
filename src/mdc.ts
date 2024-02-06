import * as cls from 'cls-hooked';

const ns = cls.createNamespace('9f5bbd3c-6179-579c-1c2a-fef8b88bc96a');
const MDC_KEY = 'mdc';

type NextFunction = () => void;

export const use = (next: NextFunction) => {
  ns.run(() => {
    try {
      ns.set(MDC_KEY, new Map<string, unknown>());
      next();
    } finally {
      ns.set(MDC_KEY, undefined);
    }
  });
};

export const middleware = (req: unknown, res: unknown, next: NextFunction) => {
  use(next);
};

const getMdc = () => {
  return ns.get(MDC_KEY) as Map<string, unknown>;
};

export const get = () => {
  return new Map(getMdc());
};

export const set = (key: string, value: unknown) => {
  return getMdc().set(key, value);
};

export const remove = (key: string) => {
  return getMdc().delete(key);
};
