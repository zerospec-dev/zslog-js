import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import { BasicLogger } from './basic-logger';
import { Config } from './config';
import { Logger } from "./logger";
import { LoggerConfig } from './logger-config';

const sources = [
  () => process.env.ZSLOG_CONFIG,
  () => {
    try {
      const file = path.resolve(process.cwd(), '.zslog.json');
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

  private readonly configs = new Map<string, LoggerConfig>();

  private readonly loggers = new Map<string, Logger>();

  private config: Config | undefined;

  private _version: number = 0;

  private constructor() {
    /** NOP */
  }

  public static configure() {
    this.instance.readConfig();
  }

  public static getLogger(section: string): Logger {
    return this.instance.getOrCreateLogger(section);
  }

  private readConfig() {
    // 環境変数, 設定ファイル, デフォルト値の順で設定を行う
    for (const supplier of sources) {
      const source = supplier();
      if (source == null) continue;

      this.setup(JSON.parse(source) as Config);
    }
  }

  // set public for testing
  public setup(config: Config) {
    this.config = config;
    this._version++;

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

  // set public for testing
  public getOrCreateLogger(section: string) {
    let logger: Logger | undefined = this.loggers.get(section);
    if (logger == null) {
      logger = this.createLogger(section);
      this.loggers.set(section, logger);
    }

    return logger;
  }

  public get version() {
    return this._version;
  }

  public getConfig(section: string): LoggerConfig {
    if (this.config == null) throw new Error('called logger before configuration');

    let config = this.configs.get(section);
    if (config == null) {
      let parentSection: string;
      const index = section.lastIndexOf('.');
      if (index === -1) {
        parentSection = 'default';
      } else {
        parentSection = section.substring(0, index);
      }
      const parent = this.getConfig(parentSection);
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

  private createLogger(section: string): Logger {
    return new BasicLogger(this, section);
  }
}
