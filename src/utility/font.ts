import {useState, useEffect, useContext} from 'react';

import TwemojiColr0 from '../assets/twemoji-colr0.woff2';
import NotoColorEmojiColr1 from '../assets/noto-color-emoji-colr1.woff2';
import NotoColorEmojiSbix from '../assets/noto-color-emoji-sbix.woff2';
import {Font} from '../types';
import {settingContext} from '../components/App';

declare global {
  interface Window {
    chrome: {};
  }
}

/**
 * Gets and utilizes the required fonts.
 * @returns Loading state of font
 */
export function useFont() {
  const [{font}, setSetting] = useContext(settingContext)!;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Loading the font only if it's not loaded before
    (async () => {
      if (font !== Font.Default && !exist(font)) {
        setLoading(true);
        let url = TwemojiColr0;
        let previousFont = Font.Default;
        if (font === Font.NotoColorEmoji) {
          /**
           * Safari also supports `OT-SVG` format, but so many of color glyphs won't render.
           * @see https://github.com/googlefonts/nanoemoji/issues/276
           *
           * @todo Switch to `COLRv1` whenever it's supported by Safari.
           * @see https://caniuse.com/colr-v1
           */
          url = NotoColorEmojiColr1;
          previousFont = Font.Twemoji;
          const isChromium = !!window.chrome;
          if (
            !isChromium &&
            window.navigator.userAgent.toLowerCase().indexOf('safari') !== -1
          )
            url = NotoColorEmojiSbix;
        }

        try {
          document.fonts.add(
            await new FontFace(Font[font], `url(${url}) format("woff2")`, {
              display: 'swap'
            }).load()
          );
        } catch {
          // Setting back the previous font
          setSetting(state => ({...state, font: previousFont}));
        }
        setLoading(false);
      }
    })();
  }, [font, setSetting]);

  /** Checks whether given font is loaded or not. */
  function exist(font: Exclude<Font, Font.Default>) {
    for (const fontFace of window.document.fonts)
      if (Font[font] === fontFace.family) {
        return true;
      }

    return false;
  }

  return loading;
}
