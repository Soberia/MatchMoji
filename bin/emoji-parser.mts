import {get} from 'https';
import {argv} from 'process';
import {resolve} from 'path';
import {fileURLToPath} from 'url';
import {writeFile} from 'fs/promises';

type EmojiCode = number | number[];

const MODULE_PATH = fileURLToPath(import.meta.url);
class HttpError extends Error {}
class ParseError extends Error {}

/**
 * Downloads and parses the Unicode Emoji template.
 *
 * Emojis with different color profiles considered as alternate version,
 * which includes emojis with component `light skin tone`, `medium-light skin tone`,
 * `medium skin tone`, `medium-dark skin tone`, `dark skin tone`, `red hair`
 * and `white hair`.
 *
 * CLDRs with emoji component `beard`, `bald` and `curly hair` are considered
 * as separate emoji.
 *
 * `kiss`, `family` and `couple with heart` CLDRs variations are considered
 * as same emoji.
 *
 * @param saveToDisk - Store parsed data as `JSON` file.
 * @param version - Unicode version
 * @throws {@link HttpError} Download unicode template failed.
 * @throws {@link ParseError} Parse unicode template failed. (Possibly due to incompatible unicode version)
 * @returns
 * Parsed data is an object containing emoji groups as key and arrays
 * of emoji code points as value. Each {@link EmojiCode emoji code point }
 * could be whether a `number` if code is a single hex value or `number[]`
 * if code contains multiple hex values.
 *
 * Each emoji code wraps by an `array` if it isn't a single hex value or
 * that emoji has alternate versions. All other emoji alternate versions
 * are included in this array. Therefor if emoji code is a `number` or
 * array length is one, then that emoji has no alternate version.
 *
 * @example
 * ```json
 * {
 *  "Smileys & Emotion": [
 *    128512, // single value
 *    [[9786, 65039]] // multiple values
 *  ],
 *  "People & Body": [
 *    // contains alternate versions
 *    [
 *      128075,
 *      [128075, 127995], // light skin tone
 *      [128075, 127996], // medium-light skin tone
 *      [128075, 127997], // medium skin tone
 *      [128075, 127998], // medium-dark skin tone
 *      [128075, 127999] // dark skin tone
 *    ],
 *  ]
 * }
 * ```
 */
export default async function emojiParser(saveToDisk = true, version = '14.0') {
  let group: string;
  let subgroup: string;
  let cldr: string;
  const cldrPattern = /\d\s([^:]+)/;
  const exceptions = ['beard', 'bald', 'curly hair'];
  const result: {[group: string]: {[cldr: string]: EmojiCode[]}} = {};
  const resultCompacted: {[group: string]: Array<number | EmojiCode[]>} = {};

  // Downloading the template
  const errorMessage = 'Downloading Unicode template failed';
  const text = await new Promise<string>((resolve, reject) =>
    get(`https://unicode.org/Public/emoji/${version}/emoji-test.txt`)
      .on('response', response => {
        if (response.statusCode === 200) {
          let data = '';
          response
            .setEncoding('utf8')
            .on('data', (chunk: string) => (data += chunk))
            .on('end', () => resolve(data))
            .on('error', error =>
              reject(
                new HttpError(`${errorMessage} due to: (${error.message})`)
              )
            );
        } else
          reject(
            new HttpError(
              `${errorMessage} with HTTP error code ${response.statusCode}`
            )
          );
      })
      .on('error', error =>
        reject(new HttpError(`${errorMessage} due to: (${error.message})`))
      )
  );

  try {
    for (const line of text.split('\n'))
      if (line !== '')
        if (line.startsWith('#')) {
          // Determining the current group or subgroup
          const prefix = line.slice(1).trimStart();
          if (prefix.startsWith('group')) {
            group = line.split(':')[1].trim();
            result[group] = {};
          } else if (prefix.startsWith('subgroup')) {
            subgroup = line.split(':')[1].trim();
          }
        } else {
          // Extracting emoji codes.
          // Not all emojis is in CLDR order, therefor emoji codes
          // should be stored as object's value to corresponding CLDR
          // as object's key. CLDR keys can be removed after that.
          const splittedLine = line.split(';');
          if (splittedLine[1].trimStart().startsWith('fully-qualified')) {
            cldr = splittedLine[1].match(cldrPattern)![1];
            if (subgroup! === 'person') {
              // Some CLDRs (e.g. person, man. woman) have different shapes
              // and should be considered as a separate emoji.
              for (const exception of exceptions)
                if (splittedLine[1].endsWith(exception)) {
                  cldr += ` ${exception}`;
                  break;
                }
            } else if (subgroup! === 'country-flag' || subgroup! === 'keycap')
              cldr += splittedLine[1].split(':')[1];

            let emoji = result[group!][cldr];
            if (!emoji) {
              emoji = result[group!][cldr] = [];
            }

            const codes = splittedLine[0].trimEnd().split(' ');
            if (codes.length === 1) {
              emoji.push(Number(`0x${codes[0]}`));
            } else {
              const _codes: number[] = [];
              for (const code of codes) {
                _codes.push(Number(`0x${code}`));
              }
              emoji.push(_codes);
            }
          }
        }
  } catch (error) {
    let reason = '';
    if (typeof error === 'string') {
      reason = error;
    } else if (
      error !== null &&
      typeof error === 'object' &&
      'message' in error
    )
      reason = (error as {message: string}).message;

    throw new ParseError(
      'Parsing Unicode template failed' + (reason ? ` due to: (${reason})` : '')
    );
  }

  // Removing CLDR keys and unnecessary groups
  for (const [group, emojis] of Object.entries(result))
    if (group !== 'Component') {
      resultCompacted[group] = [];
      const _group = resultCompacted[group];
      for (const emoji of Object.values(emojis))
        _group.push(
          emoji.length === 1 && typeof emoji[0] === 'number' ? emoji[0] : emoji
        );
    }

  if (saveToDisk)
    await writeFile(
      resolve(MODULE_PATH, '../../src/assets/emoji.json'),
      JSON.stringify(resultCompacted)
    );

  return resultCompacted;
}

if (argv[1] === MODULE_PATH) {
  emojiParser();
}
