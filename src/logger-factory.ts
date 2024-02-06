import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import * as cls from 'cls-hooked';

import { AdditionalInfo, Logger } from "./logger";
import { Config } from './config';

const MDC_KEY = '9f5bbd3c-6179-579c-1c2a-fef8b88bc96a'; 

interface LoggerConfig {
  output: string;
  json: boolean;
  level: string;
}

const levels = [
  'all',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'none',
] as const;

const rlevels = levels.reduce((map, key, i) => {
  map[key] = i;
  return map;
}, {} as {[key: string]: number});

const sources = [
  () => process.env.ZSLOG_CONFIG,
  () => {
    try {
      const file = path.resolve(process.cwd(), '.zsconfig');
      const stat = fs.statSync(file);
      if (!stat.isFile()) {
        return undefined;
      }

      return fs.readFileSync(file).toString();
    } catch (e) {
      return undefined;
    }
  },
  () => {
    const config: Config = {
      output: '/dev/stderr',
      json: process.env.ZSLOG_DEBUG == null && process.env.NODE_ENV !== 'production',
      loggers: {
        default: {
          level: 'debug',
        },
      },
    };

    return JSON.stringify(config);
  },
];

export class LoggerFactory {
  private static readonly instance = new LoggerFactory();

  private readonly context = cls.createNamespace(MDC_KEY);

  private readonly contextKeys = new Set<string>();

  private readonly configs = new Map<string, LoggerConfig>();

  private readonly loggers = new Map<string, Logger>();

  private config: Config | undefined;

  private version: number = 0;

  private constructor() {
    /** NOP */
  }

  public static configure() {
    this.instance.readConfig();
  }

  public static getLogger(section: string): Logger {
    return this.instance.getOrCreateLogger(section);
  }

  public static useMDC(next: () => void) {
    this.instance.context.run(next);
  }

  public static middleware() {
    return (req: unknown, res: unknown, next: () => void) => {
      this.useMDC(next);
    };
  }

  private readConfig() {
    // 環境変数, 設定ファイル, デフォルト値の順で設定を行う
    for (const supplier of sources) {
      const source = supplier();
      if (source == null) continue;

      this.setup(JSON.parse(source) as Config);
    }
  }

  private setup(config: Config) {
    this.config = config;
    this.version++;

    if (config.loggers.default == null) {
      throw new Error('default sections is not defined in config.loggers');
    }

    this.configs.clear();
    this.configs.set('default', {
      output: config.output,
      json: config.json,
      level: config.loggers.default.level.toLowerCase(),
    });
  }

  private getOrCreateLogger(section: string) {
    let logger: Logger | undefined = this.loggers.get(section);
    if (logger == null) {
      logger = this.createLogger(section);
      this.loggers.set(section, logger);
    }

    return logger;
  }

  private getConfig(section: string): LoggerConfig {
    if (this.config == null) throw new Error('called logger before configuration');

    let config = this.configs.get(section);
    if (config == null) {
      let parentSection: string;
      const index = section.lastIndexOf('.');
      if (index === -1) {
        parentSection = 'default';
      } else {
        parentSection = section.substring(0, index-1);
      }
      const parent = this.configs.get(parentSection);
      if (parent == null) throw new Error(`can't get config for "${parentSection}"`);

      config = Object.assign({}, parent);

      const sectionConfig = this.config.loggers[section];
      if (sectionConfig != null) {
        config.level = sectionConfig.level.toLowerCase();
      }

      this.configs.set(section, config);
    }

    return config;
  }

  private setMdc(key: string, value: unknown) {
    this.context.set(key, value);
    this.contextKeys.add(key);
  }

  private deleteMdc(key: string) {
    this.context.set(key, undefined);
    this.contextKeys.delete(key);
  }

  private createLogger(section: string): Logger {
    class BasicLogger implements Logger {
      private version: number = -1;
      private config!: LoggerConfig;

      constructor(
        private readonly factory: LoggerFactory,
        private readonly section: string,
      ) {
      }

      get isDebugEnabled(): boolean {
        return this.isEnabled('debug');
      }

      get isInfoEnabled(): boolean {
        return this.isEnabled('info');
      }

      get isWarnEnabled(): boolean {
        return this.isEnabled('warn');
      }

      get isErrorEnabled(): boolean {
        return this.isEnabled('error');
      }

      get isFatalEnabled(): boolean {
        return this.isEnabled('fatal');
      }

      debug(message: string, info?: AdditionalInfo | undefined): void {
        this.log('debug', message, info);
      }

      info(message: string, info?: AdditionalInfo | undefined): void {
        this.log('info', message, info);
      }

      warn(message: string, info?: AdditionalInfo | undefined): void {
        this.log('warn', message, info);
      }

      error(message: string, info?: AdditionalInfo | undefined): void {
        this.log('error', message, info);
      }

      fatal(message: string, info?: AdditionalInfo | undefined): void {
        this.log('fatal', message, info);
      }

      setMdc(key: string, value: unknown): void {
        this.factory.setMdc(key, value);
      }

      removeMdc(key: string): void {
        this.factory.deleteMdc(key);
      }

      /** 設定を確認します。 */
      private ensure() {
        if (this.version !== this.factory.version) {
          this.config = this.factory.getConfig(this.section);
          this.version = this.factory.version;
        }
      }

      private isEnabled(level: (typeof levels)[number]): boolean {
        this.ensure();
        return rlevels[this.config.level] <= rlevels[level];
      }

      private log(level: (typeof levels)[number], message: string, info: AdditionalInfo = {}): void {
        if (!this.isEnabled(level)) return;

        const now = new Date();
        const ts = now.getTime() / 1000;
        const caller = this.getCaller();
        const levelName = level.toUpperCase();
        const ctx: Record<string, any> = {};
        for (const key of this.factory.contextKeys) {
          ctx[key] = this.factory.context.get(key);
        }

        if (this.config.json) {
          // fully json
          const obj = Object.assign({}, info, { ts, level: levelName, msg: message, caller, name: this.section, ctx });
          this.write(JSON.stringify(obj));
        } else {
          // format
          const obj = Object.assign({}, info, { ctx });
          this.write(`${now.toISOString()} [${levelName.padEnd(5, ' ')}] ${section} ${caller}: ${message} ${JSON.stringify(obj)}`);
        }
      }

      private getCaller() {
        return 'unknown';
      }

      private write(text: string) {
        fs.writeFileSync(this.config.output, text + '\n', { flag: 'a' });
      }
    }

    return new BasicLogger(this, section);
  }
}
