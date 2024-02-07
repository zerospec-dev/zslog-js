export type NextFunction = () => void;

const uninitialized = () => {
  throw new Error('call use() before using MDC');
};

let func: {
  set: (key: string, value: unknown) => void;
  remove: (key: string) => void;
  getAll: () => {[key: string]: unknown} | undefined;
} = {
  set: uninitialized,
  remove: uninitialized,
  getAll: () => undefined,
};

export const use = (next: NextFunction, mode: 'lambda'|'server'|'auto' = 'auto') => {
  const { use: _use, set: _set, remove: _remove, getAll: _getAll} = (() => {
    if (mode === 'lambda' || mode === 'auto' && process.env.AWS_LAMBDA_FUNCTION_NAME != null) {
      return require('./internal/singleton-mdc');
    } else {
      return require('./internal/thread-local-mdc');
    }
  })();

  func = { set: _set, remove: _remove, getAll: _getAll };

  _use(next);
};

export const middleware = (req: unknown, res: unknown, next: NextFunction) => {
  use(next);
};

export const set = (key: string, value: unknown) => func.set(key, value);

export const remove = (key: string) => func.remove(key);

export const getAll = () => func.getAll();
