declare global {
  /** `React.useState()` hook dispatch function shorthand. */
  type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

  /** Overrides object's properties. */
  type Override<T extends object, U extends object> = Omit<T, keyof U> & U;

  /** Mimicks `ReturnType<typeof Object.entries>`. */
  type ObjectEntries<T extends object, U extends keyof T = keyof T> = [
    U,
    T[U]
  ][];
}

export enum Theme {
  Light = 'light',
  Dark = 'dark'
}

export enum Font {
  /** system font */
  Default,
  Twemoji,
  NotoColorEmoji
}

export enum Difficulty {
  Easy,
  Normal,
  Hard
}

export enum EmojiGroups {
  'Smileys & Emotion',
  'People & Body',
  'Animals & Nature',
  'Food & Drink',
  'Travel & Places',
  Activities,
  Objects,
  Symbols,
  Flags
}
