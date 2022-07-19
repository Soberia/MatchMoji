import {useRef, useEffect} from 'react';

import CSS from './Modal.module.css';
import Intro from './intro/Intro';
import Result from './result/Result';
import Setting from './setting/Setting';
import {ChangelogData} from './setting/changelog/Changelog';
import {Utility} from '../emoji-panel/EmojiPanel';
import {History} from '../../utility/history';
import {LocalSetting} from '../../utility/storage';

export type ExitHandler = (callback?: () => void) => void;
export const keyCodes = ['Escape', 'Enter', ' ' /* Space */];
export enum Content {
  Intro,
  Result,
  Setting
}

export default function Modal(props: {
  content: Content;
  musicLoaded?: boolean;
  history: History;
  setting: LocalSetting;
  settingPrevious: LocalSetting;
  changelog: ChangelogData;
  setHistory: SetState<History>;
  setSetting: SetState<LocalSetting>;
  setChangelog: SetState<ChangelogData>;
  emojiCount?: Utility['emojiCount'];
  themeHandler?: () => void;
  resetHandler: () => void;
  gameExitHandler?: () => void;
}) {
  const self = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Preventing scrolling outside of modal overlay
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
    };
  }, []);

  useEffect(() => {
    // When another modal is requested
    self.current!.classList.remove(CSS.Exit);
  }, [props.content]);

  /** Handles unmounting the component. */
  function exitHandler(callback?: () => void) {
    self.current!.classList.add(CSS.Exit);
    window.setTimeout(() => {
      // Waiting for the animation
      if (self.current && callback) callback();
    }, 300);
  }

  let content: JSX.Element | undefined;
  if (props.content === Content.Intro)
    content = <Intro setSetting={props.setSetting} exitHandler={exitHandler} />;
  else if (props.content === Content.Result)
    content = (
      <Result
        setting={props.setting}
        settingPrevious={props.settingPrevious}
        setHistory={props.setHistory}
        resetHandler={props.resetHandler}
        gameExitHandler={props.gameExitHandler}
        exitHandler={exitHandler}
      />
    );
  else if (props.content === Content.Setting)
    content = (
      <Setting
        musicLoaded={props.musicLoaded}
        history={props.history}
        setting={props.setting}
        changelog={props.changelog}
        setHistory={props.setHistory}
        setSetting={props.setSetting}
        setChangelog={props.setChangelog}
        emojiCount={props.emojiCount!}
        themeHandler={props.themeHandler}
        exitHandler={exitHandler}
      />
    );

  return (
    <div ref={self} className={CSS.Modal}>
      <div>{content}</div>
    </div>
  );
}
