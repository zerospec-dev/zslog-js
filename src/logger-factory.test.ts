import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import { LoggerFactory, MDC } from "./index";
import { BasicLogger } from './basic-logger';

// privateのコンストラクタを無視してインスタンスを作る
const create = () => {
  return new (LoggerFactory as unknown as any)() as LoggerFactory;
}

describe('logger-factory', () => {
  let dirname: string;
  let filename: string;
  let sut: LoggerFactory;

  beforeAll(() => {
    dirname = fs.mkdtempSync('zslog');
  });
  afterAll(() => {
    try {
      if (fs.statSync(dirname).isDirectory()) {
        fs.rmSync(dirname, { recursive: true, force: true });
      }
    } catch (e) {
      // NOP
    }
  });
  beforeEach(() => {
    filename = path.resolve(dirname, 'test.log');
    sut = create();
    sut.setup({
      output: filename,
      json: true,
      loggers: {
        default: {
          level: 'info',
        },
        'test.abc.def': {
          level: 'debug',
        },
      },
    });
  });

  it('creates logger with no special configuration', () => {
    const logger = sut.getOrCreateLogger('test.abc') as BasicLogger;
    logger.ensure();

    expect((logger as any).config).toMatchObject({
      output: filename,
      json: true,
      level: 'info',
    });
  });

  it('creates logger with special configuration', () => {
    const logger = sut.getOrCreateLogger('test.abc.def') as BasicLogger;
    logger.ensure();

    expect((logger as any).config).toMatchObject({
      output: filename,
      json: true,
      level: 'debug',
    });
  });

  it('writes debug log on debug-enabled logger', () => {
    const logger = sut.getOrCreateLogger('test.abc.def');
    logger.debug('debug');

    console.log(fs.readFileSync(filename).toString());
  });

  it('write ctx by attached value', (done) => {
    let p1: Promise<void>;
    let p2: Promise<void>;
    let step1: () => void;

    const logger = sut.getOrCreateLogger('test.abc.def');
    MDC.use(() => {
      // step 2を実行する
      p1 = new Promise<void>(resolve => {
        step1 = resolve;
        MDC.set('step', 2);
        logger.debug('before step2');
      }).then(() => {
        logger.debug('after step2');
      });
    }, 'server');
    MDC.use(() => {
      // step 1を実行する
      p2 = new Promise<void>(resolve => {
        MDC.set('step', 1);
        logger.debug('after step1');
        resolve();
      }).then(() => {
        step1();
      });
    }, 'server');

    p1!.then(() => {
      console.log(fs.readFileSync(filename).toString());
      done();
    });
  });
});
