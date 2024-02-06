export interface AdditionalInfo {
  [key: string]: unknown;
}

export interface Logger {
  get isDebugEnabled(): boolean;

  get isInfoEnabled(): boolean;

  get isWarnEnabled(): boolean;

  get isErrorEnabled(): boolean;

  get isFatalEnabled(): boolean;

  debug(message: string, info?: AdditionalInfo): void;

  info(message: string, info?: AdditionalInfo): void;

  warn(message: string, info?: AdditionalInfo): void;

  error(message: string, info?: AdditionalInfo): void;

  fatal(message: string, info?: AdditionalInfo): void;
}
