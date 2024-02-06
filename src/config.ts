export interface SectionConfig {
  /**
   * 出力レベル。
   */
  level: string;
}

export interface Config {
  /**
   * 出力先のファイル名。
   * 
   * /dev/stdoutと/dev/stderrだけ特別扱いして、それぞれ標準出力と標準エラーに出力する。
   */
  output: string;

  /**
   * 出力をJSON形式にするかどうか。デフォルトはtrue。
   */
  json: boolean;

  /**
   * セクションごとのコンフィグ。
   * `section = 'default'` となるような設定は必須。
   */
  loggers: {[section: string]: SectionConfig};
}
