# @pakoamadi/load-env

[![npm version](https://img.shields.io/npm/v/@pakoamadi/load-env.svg)](https://www.npmjs.com/package/@pakoamadi/load-env)
[![license](https://img.shields.io/npm/l/@pakoamadi/load-env.svg)](./LICENSE)

Tiny, zero-dependency loader that reads a `.env` file and puts its variables into `process.env`.

- **Zero dependencies**: only `node:fs` and `node:path`
- **Tiny**: about 40 lines of code you can read in a minute
- **Safe**: never throws; a missing file is silently skipped
- **Familiar syntax**: comments, quotes, `export` prefix, inline comments, CRLF line endings

## Installation

```bash
npm install @pakoamadi/load-env
```

## Quick start

Call it once, as early as possible in your app's entry point:

```js
const loadEnv = require('@pakoamadi/load-env');

loadEnv(); // reads <cwd>/.env

console.log(process.env.PORT);
```

By default the file is read from `.env` in the current working directory (`process.cwd()`),
which is usually your project root when you start the app with `node` or `npm start`.

### Custom path

```js
const path = require('node:path');
const loadEnv = require('@pakoamadi/load-env');

// .env next to the current file
loadEnv(path.join(__dirname, '.env'));

// .env inside the src folder
loadEnv(path.resolve(process.cwd(), 'src', '.env'));

// different files per environment
loadEnv(path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`));
```

## `.env` syntax

```dotenv
# Comments start with "#"
PORT=3000
DB_URI=mongodb://localhost:27017/app

# Quotes are optional; use them to keep "#" or leading/trailing spaces
PASSWORD="pa#ss word"
PREFIX='  > '

export NODE_ENV=production   # "export" prefix and inline comments are supported
```

| Line in `.env`                  | Value in `process.env` | Notes                                         |
|---------------------------------|------------------------|-----------------------------------------------|
| `PORT=3000`                     | `'3000'`               | All values are strings                        |
| `PORT = 3000`                   | `'3000'`               | Spaces around `=` are trimmed                 |
| `URL=https://x.io/?a=1&b=2`     | `'https://x.io/?a=1&b=2'` | Only the first `=` separates key and value |
| `NAME="John Doe"`               | `'John Doe'`           | Matching `"…"` or `'…'` are removed           |
| `PAD="  hi  "`                  | `'  hi  '`             | Spaces inside quotes are kept                 |
| `PASS="abc#123"`                | `'abc#123'`            | `#` inside quotes is part of the value        |
| `PORT=3000 # http port`         | `'3000'`               | Inline comment needs a space before `#`       |
| `COLOR=#fff`                    | `'#fff'`               | No space before `#`, so it is not a comment   |
| `BAD="abc'`                     | `'"abc\''`             | Mismatched quotes are left untouched          |
| `export KEY=value`              | `'value'`              | `export` prefix is ignored                    |
| `EMPTY=`                        | `''`                   | Empty value                                   |
| `FLAG`                          | `''`                   | Line without `=` sets an empty string         |
| `=value`                        | *(ignored)*            | Lines with an empty key are skipped           |
| `# comment` / empty line        | *(ignored)*            |                                               |

Both `\n` and `\r\n` line endings are supported.

## API

### `loadEnv([customPath])`

| Parameter    | Type     | Default                  | Description                     |
|--------------|----------|--------------------------|---------------------------------|
| `customPath` | `string` | `<cwd>/.env`             | Absolute or relative path to the `.env` file. Relative paths are resolved from `process.cwd()`. |

Returns `undefined`. Variables are written directly to `process.env`.

## Behavior

- **Existing variables are overwritten.** Values from the file take precedence over variables already set in the shell or by a previous `loadEnv()` call. Call `loadEnv()` multiple times to layer files; the last one wins.
- **Missing file is not an error.** If the file does not exist, nothing happens, so it is safe in production where variables come from the environment.
- **Read errors are logged, not thrown.** For example, if the path points to a directory, the message `.env file loading error: …` is printed with `console.error` and your app keeps running.

### Not supported

To keep the package tiny, the following are intentionally not supported:

- variable expansion (`URL=http://${HOST}:${PORT}`)
- multi-line values
- escape sequences such as `\n` inside double quotes

If you need these, consider [`dotenv`](https://www.npmjs.com/package/dotenv) with [`dotenv-expand`](https://www.npmjs.com/package/dotenv-expand).

## Security

Never commit your `.env` file. Add it to `.gitignore`:

```gitignore
.env
.env.*
```

## Requirements

Node.js **16** or newer.

## Testing

Tests use the built-in `node:test` runner (Node.js 18+):

```bash
npm test
```

## Changelog

### 1.0.0

Initial release.

- `loadEnv([customPath])` loads variables from `<cwd>/.env` (or from `customPath`) into `process.env`
- Supports comments, empty lines, `\n` and `\r\n` line endings
- Strips matching `"…"` and `'…'` quotes; mismatched quotes are kept as is
- Supports inline comments (`KEY=value # comment`) and the `export` prefix
- Keeps `=` characters inside values
- Never throws: a missing file is skipped, read errors are logged with `console.error`
- Zero dependencies, Node.js 16+

## License

[MIT](./LICENSE) © Pako Amadi
