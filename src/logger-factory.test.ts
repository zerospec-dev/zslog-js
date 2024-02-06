import * as fs from 'fs';
import * as path from 'path';

import { LoggerFactory } from "./logger-factory";
import { use } from './mdc';
import { BasicLogger } from './basic-logger';

// privateのコンストラクタを無視してインスタンスを作る
const create = () => {
  return new (LoggerFactory as unknown as any)() as LoggerFactory;
}

describe('logger-factory', () => {
  describe('getLogger', () => {
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

    it('creates logger with no special configuration', (done) => {
      use(() => {
        const logger = sut.getOrCreateLogger('test.abc') as BasicLogger;
        logger.ensure();

        expect((logger as any).config).toMatchObject({
          output: filename,
          json: true,
          level: 'info',
        });

        done();
      });
    });

    it('creates logger with special configuration', (done) => {
      use(() => {
        const logger = sut.getOrCreateLogger('test.abc.def') as BasicLogger;
        logger.ensure();

        expect((logger as any).config).toMatchObject({
          output: filename,
          json: true,
          level: 'debug',
        });

        done();
      });
    });
  });
});
