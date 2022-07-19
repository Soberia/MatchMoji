import {useRef, useState, useEffect} from 'react';

import CSS from './Setting.module.css';
import CSSModal from '../Modal.module.css';
import CSSCommon from '../../Common.module.css';
import Emoji from '../../emoji/Emoji';
import Link from '../../elements/link/Link';
import Switch from '../../elements/switch/Switch';
import Vector from '../../elements/vector/Vector';
import Changelog, {ChangelogData} from './changelog/Changelog';
import {keyCodes, ExitHandler} from '../Modal';
import {Utility} from '../../emoji-panel/EmojiPanel';
import {Theme, Font, Difficulty, EmojiGroups} from '../../../types';
import {useFont} from '../../../utility/font';
import {LocalSetting} from '../../../utility/storage';
import {ROUTES, History} from '../../../utility/history';
import {emojiCounter, EmojiCode} from '../../../utility/generator';

export default function Setting(props: {
  musicLoaded?: boolean;
  history: History;
  setting: LocalSetting;
  changelog: ChangelogData;
  setHistory: SetState<History>;
  setSetting: SetState<LocalSetting>;
  setChangelog: SetState<ChangelogData>;
  emojiCount: Utility['emojiCount'];
  themeHandler?: () => void;
  exitHandler: ExitHandler;
}) {
  const [inadequateGroups, setInadequateGroups] = useState(false);
  const fontLoading = useFont();
  const options = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const font = useRef<HTMLDivElement>(null);
  const difficulty = useRef<HTMLDivElement>(null);
  const currentSetting = useRef(props.setting);
  const showChangelog = props.history.hash === ROUTES.changelog;

  useEffect(() => {
    if (!showChangelog) {
      button.current!.focus();
    }
  });

  useEffect(() => {
    // Making room for scrollbar
    if (options.current)
      options.current.parentElement!.style.paddingLeft = '0.5rem';
  }, []);

  useEffect(() => {
    // Attaching custom navigation history handler
    // for being able to play the exit animation.
    if (props.history.hash === ROUTES.setting)
      props.history.navigationHandler = exitHandler;
  }, [props.history.hash]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Checks whether it will be enough emoji to fill the container. */
  function isEnoughEmoji(
    groups: EmojiGroups[],
    variants: LocalSetting['emojiVariants']
  ) {
    if (emojiCounter(groups, variants) < props.emojiCount()) {
      setInadequateGroups(state => {
        if (!state)
          window.setTimeout(
            () => options.current && setInadequateGroups(false),
            2e3
          );
        return true;
      });
      return false;
    }
    return true;
  }

  /** Handles unmounting the component. */
  function exitHandler() {
    props.exitHandler(() => props.setHistory(state => ({path: state.path})));
  }

  /** Handles theme change. */
  function themeHandler() {
    props.setSetting(state => ({...state, theme}));
    props.themeHandler && props.themeHandler();
  }

  /** Handles given emoji element's animation. */
  function emojiAnimationHandler(
    element: HTMLDivElement,
    callback: () => void
  ) {
    element.animate(
      [
        {transform: 'rotate(180deg) scale(0.5)', offset: 0.5},
        {transform: 'rotate(360deg) scale(1)'} // without `scale`, doesn't work in Safari
      ],
      300
    ).onfinish = () => element && callback();
  }

  /** Handles selecting an emoji group. */
  function emojiGroupHandler(group: EmojiGroups) {
    props.setSetting(state => {
      const emojiGroups = [...state.emojiGroups];
      const groupIndex = emojiGroups.indexOf(group);
      if (groupIndex !== -1)
        if (emojiGroups.length - Object.keys(EmojiGroups).length / 2 === 1)
          // At least one group must remain
          return state;
        else {
          emojiGroups.splice(groupIndex, 1);
        }
      else {
        emojiGroups.splice(groupIndex, 0, group);
      }

      if (!isEnoughEmoji(emojiGroups, state.emojiVariants)) {
        return state;
      }
      return {...state, emojiGroups};
    });
  }

  let license = '';
  let nextFont = Font.Twemoji;
  if (props.setting.font === Font.Twemoji) {
    license = 'Emojis licensed under CC-BY 4.0, © Twitter';
    nextFont = Font.NotoColorEmoji;
  } else if (props.setting.font === Font.NotoColorEmoji) {
    license = 'Emojis licensed under SIL OFL 1.1, © Google';
    nextFont = Font.Default;
  }

  const vibration = !!window.navigator.vibrate;
  const vibrationClasses = [CSSModal.Item];
  if (!vibration) {
    vibrationClasses.push(CSSCommon.Disabled);
  }

  let soundIcon = 0x1f50a; // 🔊
  const musicClasses = [CSSModal.Item];
  const musicNotLoaded = props.musicLoaded === false;
  if (!props.setting.sound) {
    soundIcon = 0x1f508; // 🔈
    musicClasses.push(CSSCommon.Disabled);
  } else if (musicNotLoaded) {
    musicClasses.push(CSSCommon.Disabled);
  }

  let theme = Theme.Dark;
  let themeLight = true;
  let themeIcon: EmojiCode = [0x2600, 0xfe0f]; // ☀️
  if (theme === props.setting.theme) {
    theme = Theme.Light;
    themeLight = false;
    themeIcon = 0x1f319; // 🌙
  }

  /**
   * @todo Change `handshake` emoji to `family` if skin tone or hair color
   * variants implemented in upcoming Unicode versions. Only `Segoe UI Emoji`
   * font can show it correctly now.
   *
   * @example
   * ```typescript
   * const variantIcon = [0x1f469, 0x1f3fc, 0x200d, 0x1f467, 0x1f3fb, 0x200d, 0x1f466, 0x1f3ff]; // 👩‍👧🏼‍🧒🏿
   * if (!props.setting.emojiVariants) {
   * variantIcon.splice(7, 1);
   * variantIcon.splice(4, 1);
   * variantIcon.splice(1, 1);
   * }
   * ```
   */
  let variantIcon: EmojiCode = [0x1faf1, 0x1f3fb, 0x200d, 0x1faf2, 0x1f3ff]; // 🫱🏻‍🫲🏿
  if (!props.setting.emojiVariants) {
    variantIcon = 0x1f91d; // 🤝
  }

  let showApplyNotice = false;
  if (
    props.setting.difficulty !== currentSetting.current.difficulty ||
    props.setting.emojiVariants !== currentSetting.current.emojiVariants ||
    props.setting.emojiGroups.length < currentSetting.current.emojiGroups.length
  )
    showApplyNotice = true;
  else
    for (const group of props.setting.emojiGroups)
      if (!currentSetting.current.emojiGroups.includes(group)) {
        showApplyNotice = true;
        break;
      }

  return (
    <>
      <div
        ref={options}
        className={[CSSCommon.Scrollbar, CSS.Options, CSS.Content].join(' ')}>
        <div className={CSSModal.Item}>
          <Emoji code={0x1f389} /* 🎉 */ /> Effects
          <Switch
            on={props.setting.effects}
            className={CSS.Switch}
            callback={() =>
              props.setSetting(state => ({...state, effects: !state.effects}))
            }
          />
        </div>
        <div className={vibrationClasses.join(' ')}>
          <Emoji code={0x1f335} /* 🌵 */ /> Vibration
          <Switch
            on={props.setting.vibration && vibration}
            className={CSS.Switch}
            callback={() =>
              props.setSetting(state => ({
                ...state,
                vibration: !state.vibration
              }))
            }
          />
        </div>
        <div className={CSSModal.Item}>
          <Emoji code={soundIcon} /> Sound
          <Switch
            on={props.setting.sound}
            className={CSS.Switch}
            clickDelay={1100} // Waiting for background music fade-out effect
            callback={() =>
              props.setSetting(state => ({...state, sound: !state.sound}))
            }
          />
        </div>
        <div className={musicClasses.join(' ')}>
          <Emoji code={0x1f3b5} /* 🎵 */ /> Music
          <Switch
            on={props.setting.backgroundMusic && !musicNotLoaded}
            className={CSS.Switch}
            clickDelay={1100} // Waiting for background music fade-out effect
            callback={() =>
              props.setSetting(state => ({
                ...state,
                backgroundMusic: !state.backgroundMusic
              }))
            }
          />
        </div>
        <div className={CSSModal.Item}>
          <Emoji code={themeIcon} /> Theme
          <Switch
            on={themeLight}
            className={CSS.Switch}
            callback={themeHandler}
          />
        </div>
        <div className={CSSModal.Item}>
          <Emoji code={variantIcon} /> Variants
          <Switch
            on={props.setting.emojiVariants}
            className={CSS.Switch}
            callback={() =>
              isEnoughEmoji(
                props.setting.emojiGroups,
                !props.setting.emojiVariants
              ) &&
              props.setSetting(state => ({
                ...state,
                emojiVariants: !state.emojiVariants
              }))
            }
          />
        </div>
        <div className={CSSModal.Item}>
          <Emoji code={0x1f321} /* 🌡️ */ /> Difficulty
          <Emoji
            ref={difficulty}
            code={
              [0x1f600 /* 😀 */, 0x1f610 /* 😐 */, 0x1f622 /* 😢 */][
                props.setting.difficulty
              ]
            }
            className={CSS.Emoji}
            onClick={() =>
              emojiAnimationHandler(difficulty.current!, () =>
                props.setSetting(state => ({
                  ...state,
                  difficulty:
                    state.difficulty === Difficulty.Hard
                      ? Difficulty.Easy
                      : state.difficulty + 1
                }))
              )
            }
          />
        </div>
        <div className={CSSModal.Item}>
          <Emoji code={0x1f3a8} /* 🎨 */ /> Emoji
          {fontLoading ? (
            <Vector name="loading" className={CSS.FontLoading} />
          ) : (
            <Emoji
              ref={font}
              code={0x1f920} /* 🤠 */
              font={props.setting.font}
              className={CSS.Emoji}
              onClick={() =>
                !fontLoading &&
                emojiAnimationHandler(font.current!, () =>
                  props.setSetting(state => ({...state, font: nextFont}))
                )
              }
            />
          )}
        </div>
        <div className={CSS.EmojiGroups}>
          {[
            0x1f928 /* 🤨 */,
            0x1f9d1 /* 🧑 */,
            0x1f63a /* 😺 */,
            0x1f355 /* 🍕 */,
            [0x1f3dd, 0xfe0f] /* 🏝️ */,
            0x1f3c0 /* 🏀 */,
            0x1f528 /* 🔨 */,
            [0x267e, 0xfe0f] /* ♾️ */,
            0x1f6a9 /* 🚩 */
          ].map((code, idx) => (
            <div key={idx}>
              <Emoji
                code={code}
                className={[
                  CSS.EmojiGroup,
                  props.setting.emojiGroups.includes(
                    EmojiGroups[idx] as unknown as EmojiGroups
                  )
                    ? CSS.EmojiGroupSelected
                    : ''
                ].join(' ')}
                onClick={() =>
                  emojiGroupHandler(EmojiGroups[idx] as unknown as EmojiGroups)
                }
              />
              {EmojiGroups[idx]}
            </div>
          ))}
        </div>
      </div>
      <div className={[CSS.Notice, CSS.About].join(' ')}>
        <Link href="https://github.com/Soberia/matchmoji" newWindow>
          MatchMoji v{process.env.REACT_APP_VERSION}
        </Link>
        &nbsp;
        <span
          onClick={() =>
            props.setHistory(state => ({...state, hash: ROUTES.changelog}))
          }>
          &lt;changelog&gt;
        </span>
        <br />
        Music track is "Hi-score" composed by "Johannes Bjerregård"
        <br />
        {!fontLoading && license ? <span>{license}</span> : <>&nbsp;</>}
      </div>
      <div
        ref={button}
        className={[CSSCommon.Button, CSSModal.Button].join(' ')}
        onClick={exitHandler}
        onKeyDown={event => keyCodes.includes(event.key) && exitHandler()}
        tabIndex={-1}>
        Done
      </div>
      <div className={[CSS.Notice, CSS.Warning].join(' ')}>
        {inadequateGroups ? (
          <span className={CSS.InadequateGroups}>
            Not enough emoji to fill the screen!
          </span>
        ) : showApplyNotice ? (
          <span>Changes will apply for next round!</span>
        ) : (
          <>&nbsp;</>
        )}
      </div>
      {showChangelog && (
        <Changelog
          data={props.changelog}
          history={props.history}
          setData={props.setChangelog}
          setHistory={props.setHistory}
        />
      )}
    </>
  );
}
