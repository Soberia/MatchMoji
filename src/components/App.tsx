import {
  createContext,
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect
} from 'react';

import './Common.module.css';
import CSS from './App.module.css';
import CSSTheme from './Theme.module.css';
import Sound from './Sound';
import Effect from './effect/Effect';
import Vector from './elements/vector/Vector';
import EmojiPanel, {Utility} from './emoji-panel/EmojiPanel';
import ControlPanel, {TIMER_DEFAULT} from './control-panel/ControlPanel';
import Modal, {Content} from './modal/Modal';
import {ChangelogData} from './modal/setting/changelog/Changelog';
import {Theme} from '../types';
import {useLocalSetting} from '../utility/storage';
import {ROUTES, useHistory} from '../utility/history';
import {fullscreenSwitcher, metaTagUpdater} from '../utility/tools';

export interface Props {
  /**
   * The path which this componenet will be served on.
   * This path also must point to the location of the static files.
   * If not provided, `/` will be considered as the default path.
   */
  path?: string;
  /**
   * The parent componenet's theme.
   * This component manages its theme state independently,
   * this prop can be specified to keep parent componenet's
   * theme in sync with this component's theme.
   */
  theme?: {
    /** If sets to `true`, theme mode is light otherwise is dark. */
    isLight: boolean;
    /** Runs whenever component's theme changes. */
    handler: () => void;
  };
  /**
   * Runs whenever componenet gets unmounted.
   * Can be used to handle the page navigation.
   */
  exitHandler?: () => void;
}

export const historyContext = createContext<ReturnType<
  typeof useHistory
> | null>(null);
export const settingContext = createContext<ReturnType<
  typeof useLocalSetting
> | null>(null);

/**
 * Simple fun game with emojis.
 *
 * @todo Use `<Offscreen>` for preloading `EmojiPanel` component to
 * improve performance when it's implemented in upcoming React versions.
 * @see https://reactjs.org/blog/2022/03/29/react-v18.html#what-is-concurrent-react
 */
export default function App(props: Props) {
  const [history, setHistory] = useHistory(
    props.path || process.env.REACT_APP_PUBLIC_URL
  );
  const [setting, setSetting] = useLocalSetting(
    process.env.REACT_APP_NAME,
    true // Preventing average Joe to alter his scores
  );
  const settingPrevious = useRef({...setting});
  const self = useRef<HTMLDivElement>(null);

  const [time, setTime] = useState(TIMER_DEFAULT);
  const [changelog, setChangelog] = useState<ChangelogData>();
  const [musicLoaded, setMusicLoaded] = useState<
    true /* loaded */ | false /* failed */ | undefined /* loading */
  >();
  const utility = useRef<Utility>(null);
  const externalExitHandler = props.exitHandler;

  // Storing total play time in the Web Storage API too
  // frequently leads to excessive disk usage and increases
  // the chance of race condition because this value gets
  // updated in the `window.setInterval()`.
  // Therefore this value should be stored in a different
  // state and only be updated on the storage when state
  // is not changing (timer is stopped/paused).
  const [playTime, setPlayTime] = useState(setting.playTime);
  const playTimeRealtime = useRef(playTime);

  const timesUp = time === 0;
  const criticalTime = time <= 3e3 ? time : undefined;
  const inactive = setting.showIntroduction || timesUp || !!history.hash;
  const theme = props.theme
    ? props.theme.isLight
      ? Theme.Light
      : Theme.Dark
    : setting.theme;

  useEffect(() => {
    // Changing the default font size
    const html = document.querySelector('html')!;
    const defaultFontSize = html.style.fontSize;
    html.style.fontSize = '62.5%'; // = 10px
    return () => {
      html.style.fontSize = defaultFontSize;
    };
  }, []);

  useEffect(() => {
    // Registering the service worker.
    // This won't work in development environment, however generated
    // `service-worker.js` for production environment could be placed
    // in `public` directory and be used instead.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const manifest = document.querySelector('link[rel="manifest"]');
      const manifestUrl = `${ROUTES.publicUrl}/manifest.webmanifest`;
      if (manifest) {
        manifest.setAttribute('href', manifestUrl);
      } else {
        const link = document.createElement('link');
        link.setAttribute('rel', 'manifest');
        link.setAttribute('href', manifestUrl);
        document.head.appendChild(link);
      }
      navigator.serviceWorker.register(`${ROUTES.publicUrl}/service-worker.js`);
    }

    // Updating the meta tags
    const url = `${window.location.origin}${ROUTES.publicUrl}`;
    metaTagUpdater(
      'MatchMoji - Fun with Emojis 🎲',
      'Simple fun game with emojis. Just look for identical emojis before running out of time!',
      `${url}/icon512.webp`,
      `${url}`
    );
  }, []);

  useEffect(() => {
    // Handling unmounting the component on browser navigation back button.
    // Effects run twice in development environment due to
    // `React.StrictMode`, preventing the consequences.
    if (process.env.NODE_ENV === 'production') {
      return exitHandler;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Changing default background color to match the theme
    if (self.current) {
      const backgroundColor = window
        .getComputedStyle(self.current)
        .getPropertyValue('--background');
      document.querySelector('body')!.style.backgroundColor = backgroundColor;
      const themeColor = document.querySelector('meta[name="theme-color"]');
      if (themeColor) {
        themeColor.setAttribute('content', backgroundColor);
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        meta.setAttribute('content', backgroundColor);
        document.head.appendChild(meta);
      }
    }
  }, [theme]);

  useEffect(() => {
    playTimeRealtime.current = playTime;
  }, [playTime]);

  /** Handles unmounting the component. */
  const exitHandler = useCallback(() => {
    fullscreenSwitcher(true);
    setSetting(state => ({...state, playTime: playTimeRealtime.current})); // Updating total play time
    externalExitHandler && externalExitHandler();
  }, [externalExitHandler, setSetting]);

  /** Handles resetting the game for another round. */
  function resetHandler() {
    utility.current!.reloadEmojis();
    setTime(TIMER_DEFAULT);
    setSetting(state => {
      const setting = {...state, playTime}; // Updating total play time
      settingPrevious.current = {...setting};
      return setting;
    });
  }

  const gameExitHandler = externalExitHandler && exitHandler;
  const panelsClasses = [CSS.Panels];
  let modal: JSX.Element | undefined;
  if (inactive) {
    panelsClasses.push(CSS.FocusOut);
    modal = (
      <Modal
        content={
          Content[
            setting.showIntroduction ? 'Intro' : timesUp ? 'Result' : 'Setting'
          ]
        }
        musicLoaded={musicLoaded}
        history={history}
        setting={{...setting, theme, playTime}}
        settingPrevious={settingPrevious.current}
        changelog={changelog}
        setHistory={setHistory}
        setSetting={setSetting}
        setChangelog={setChangelog}
        emojiCount={utility.current?.emojiCount}
        themeHandler={props.theme?.handler}
        resetHandler={resetHandler}
        gameExitHandler={gameExitHandler}
      />
    );
  }

  return (
    <div ref={self} className={[CSS.App, CSSTheme[theme]].join(' ')}>
      <settingContext.Provider
        value={useMemo(() => [setting, setSetting], [setting, setSetting])}>
        <historyContext.Provider
          value={useMemo(() => [history, setHistory], [history, setHistory])}>
          <Sound
            setting={setting}
            settingPrevious={settingPrevious.current}
            criticalTime={criticalTime}
            setMusicLoaded={setMusicLoaded}
          />
          <Effect enabled={setting.effects} alarm={!!criticalTime} />
          {musicLoaded === undefined ? (
            <Vector name="loading" className={CSS.Loading} />
          ) : (
            <>
              {modal}
              <div className={panelsClasses.join(' ')}>
                <ControlPanel
                  inactive={inactive}
                  time={time}
                  playTime={playTime}
                  setting={setting}
                  settingPrevious={settingPrevious.current}
                  setTime={setTime}
                  setPlayTime={setPlayTime}
                  setSetting={setSetting}
                  setHistory={setHistory}
                  gameExitHandler={gameExitHandler}
                />
                <EmojiPanel
                  ref={utility}
                  inactive={inactive}
                  setting={setting}
                  setSetting={setSetting}
                  setTime={setTime}
                />
              </div>
            </>
          )}
        </historyContext.Provider>
      </settingContext.Provider>
    </div>
  );
}
