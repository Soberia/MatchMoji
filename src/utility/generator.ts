import data from '../assets/emoji.json';
import {arrayShuffle} from './tools';
import {EmojiGroups} from '../types';

export type EmojiCode = number | number[];
export interface EmojiUnit {
  id: number;
  code: EmojiCode;
  hidden?: boolean;
}

/**
 * Returns emojis count for specified groups.
 * @param groups - Emoji groups. If an empty array provided, all groups will be considered.
 * @param includeVariants - Include skin tone and hair color variants.
 */
export function emojiCounter(groups: EmojiGroups[], includeVariants: boolean) {
  if (!groups.length) {
    groups = Object.values(EmojiGroups) as EmojiGroups[];
  }

  let count = 0;
  for (const [group, codes] of Object.entries(data) as ObjectEntries<
    typeof data
  >)
    if (groups.includes(group as unknown as EmojiGroups)) {
      count += codes.length;
      if (includeVariants)
        for (const code of codes)
          if (typeof code !== 'number') {
            count += code.length - 1;
          }
    }

  return count;
}

/**
 * Generates emoji units based on unicode ranges.
 * @param groups - Emoji groups. If an empty array provided, all groups will be considered.
 * @param count - Emoji generation limit. If not provided, all emoji ranges will be considered.
 * @param includeVariants - Include skin tone and hair color variants.
 *
 * @todo Exclude emojis from generated result based on Unicode version.
 *
 * @bug
 * On Safari, system font will be showed for following emojis instead of `Noto Color Emoji` font.
 * Also last three ones will render as blank space with `Twemoji` font.
 * Maybe it's better to exclude these emojis from generated result.
 * - `[169, 65039]`
 * - `[174, 65039]`
 * - `[8252, 65039]`
 * - `[8265, 65039]`
 * - `[8482, 65039]`
 * - `[9792, 65039]`
 * - `[9794, 65039]`
 * - `[35, 65039, 8419]`
 * - `[42, 65039, 8419]`
 * - `[(48-57), 65039, 8419]`
 */
export function emojiGenerator(
  groups: EmojiGroups[],
  count?: number,
  includeVariants = true
) {
  const emojis: EmojiUnit[] = [];
  const pickedEmojis: EmojiUnit[] = [];
  if (!groups.length) {
    groups = Object.values(EmojiGroups) as EmojiGroups[];
  }

  let id = 0;
  for (const [group, codes] of Object.entries(data) as ObjectEntries<
    typeof data
  >)
    if (groups.includes(group as unknown as EmojiGroups))
      for (const code of codes)
        if (typeof code === 'number') {
          emojis.push({id: id++, code});
        } else
          for (const _code of code) {
            emojis.push({id: id++, code: _code});
            if (!includeVariants) break;
          }

  const limit = count || emojis.length;
  while (pickedEmojis.length < limit) {
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    if (!pickedEmojis.includes(randomEmoji)) {
      pickedEmojis.push(randomEmoji);
    }
  }

  // Duplicating emojis with distinct identifier
  for (const {...emoji} of [...pickedEmojis]) {
    emoji.id = ++id;
    pickedEmojis.push(emoji);
  }

  return arrayShuffle(pickedEmojis);
}
