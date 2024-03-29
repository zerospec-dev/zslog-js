import 'source-map-support/register';
import * as fs from 'fs';

import { levels, rlevels } from "./level";
import { AdditionalInfo, Logger } from "./logger";
import { LoggerConfig } from "./logger-config";
import { LoggerFactory } from "./logger-factory";
import { getAll } from './mdc';

export class BasicLogger implements Logger {
  private version: number = -1;
  private config!: LoggerConfig;

  public constructor(
    private readonly factory: LoggerFactory,
    private readonly section: string,
  ) {
  }

  public get isDebugEnabled(): boolean {
    return this.isEnabled('debug');
  }

  public get isInfoEnabled(): boolean {
    return this.isEnabled('info');
  }

  public get isWarnEnabled(): boolean {
    return this.isEnabled('warn');
  }

  public get isErrorEnabled(): boolean {
    return this.isEnabled('error');
  }

  public get isFatalEnabled(): boolean {
    return this.isEnabled('fatal');
  }

  public debug(message: string, info?: AdditionalInfo | undefined): void {
    this.log('debug', message, info);
  }

  public info(message: string, info?: AdditionalInfo | undefined): void {
    this.log('info', message, info);
  }

  public warn(message: string, info?: AdditionalInfo | undefined): void {
    this.log('warn', message, info);
  }

  public error(message: string, info?: AdditionalInfo | undefined): void {
    this.log('error', message, info);
  }

  public fatal(message: string, info?: AdditionalInfo | undefined): void {
    this.log('fatal', message, info);
  }

  /** 設定を確認します。 */
  public ensure() {
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

    const now = this.now();
    const ts = now.getTime() / 1000;
    const caller = this.getCaller();
    const levelName = level.toUpperCase();
    const ctx: {[key: string]: unknown} | undefined = getAll()

    if (this.config.json) {
      // fully json
      const obj: any = Object.assign({}, info, { ts, level: levelName, msg: message, caller, name: this.section, ctx });
      if (ctx == null) delete obj.ctx;
      this.write(JSON.stringify(obj));
    } else {
      // format
      const obj: any = Object.assign({}, info, { ctx });
      if (ctx == null) delete obj.ctx;
      this.write(`${now.toISOString()} [${levelName.padEnd(5, ' ')}] ${this.section} ${caller}: ${message} ${JSON.stringify(obj)}`);
    }
  }

  private now() {
    return new Date();
  }

  private getCaller() {
    const originalPrepareStackTrace = Error.prepareStackTrace;
    const pattern = /(at .* \((?<file1>.+):(?<line1>[0-9]+):(?<column1>[0-9]+)\))|(at (?<file2>.+):(?<line2>[0-9]+):(?<column2>[0-9]+))$/;
    try {
      const info = new Error();

      if (info.stack == null) return 'unknown';
      const stack = info.stack.split('\n');
      const cs = stack[4];
      const groups = pattern.exec(cs)?.groups;
      const fileName = groups?.file1 ?? groups?.file2 ?? 'unknown';
      const lineNumber = groups?.line1 ?? groups?.line2 ?? 'unknown';
      return `${fileName}:${lineNumber}`;
    } finally {
      Error.prepareStackTrace = originalPrepareStackTrace;
    }
  }

  private write(text: string) {
    fs.writeFileSync(this.config.output, text + '\n', { flag: 'a' });
  }
}
