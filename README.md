# zslog-js

ゼロスペックの社内で使用するロガーです。
主な機能は、

- 構造化ログを扱える
- MDC(Mapped Diagnosic Contexts)を使用できる
- ログをレベルごとに出力できる
- ログをセクションごとに分類できる
- セクションごとに出力レベルを制御できる

扱えるログレベルは以下のとおり。

| レベル     | 優先度 | 備考                 |
|------------|:------:|----------------------|
| all        | 1      | このレベルのログは出力できない。セクションのログレベルとしてのみ設定可能。 |
| debug      | 2      ||
| info       | 3      ||
| warn       | 4      ||
| error      | 5      ||
| fatal      | 6      ||
| none       | 7      | このレベルのログは出力できない。セクションのログレベルとしてのみ設定可能。 |

## 設定

設定は以下の優先度で読み込みます。

1. 環境変数 `ZSLOG_CONFIG`
2. 設定ファイル `<process.cwd>/.zslog.json`

設定はjson形式で行います。

| フィールド名             | 形式     | 内容                                               |
|--------------------------|----------|----------------------------------------------------|
| `output`                 | string   | 出力先ファイルのパス。                             |
| `json`                   | boolean  | 出力形式をjsonにするかどうか。デフォルトは `true`  |
| `loggers`                | object   | セクションごとの設定。 `default` は必須。          |
| `loggers[section]`       | object   | `section` は . で区切ることで階層構造を表現する。  |
| `loggers[section].level` | string   | セクションで出力するレベルの最低値。ここで設定したレベル未満のログは出力されない。 |

設定例

```
{
  "output": "/dev/stdout",
  "loggers": {
    "default": {
      "level": "info"
    },
    "test.abc.def": {
      "level": "debug"
    }
  }
}
```

## コード例

```
import { LoggerFactory, MDC } from 'zerospec-dev/zslog-js';

// 設定を読み込みます。
LoggerFactory.configure();

const logger = LoggerFactory.getLogger('foo.bar');

const main = () => {
  // MDC.use()を呼び出すことで、MDCが有効になります。
  // MDCの情報はuse()内の処理をひとつのコンテキストとして管理されます。
  // use()のなかでuse()を呼んだ場合の動作は保証されません。
  MDC.use(() => {
    try {
      MDC.set('requestId', 1);

      logger.debug('this is debug log', { id: 'a', name: 'b' });
      logger.info('this is info log');
      logger.warn('this is warn log');
      logger.error('this is error log');
      logger.fatal('this is fatal log');
    } finally {
      MDC.remove('requestId');
    }
  });
};
```
