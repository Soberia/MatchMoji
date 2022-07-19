import {useRef, useEffect} from 'react';

import CSS from './Result.module.css';
import Confetti from './confetti/Confetti';
import CSSModal from '../Modal.module.css';
import CSSCommon from '../../Common.module.css';
import Emoji from '../../emoji/Emoji';
import Vector from '../../elements/vector/Vector';
import {keyCodes, ExitHandler} from '../Modal';
import {timeConverter} from '../../../utility/tools';
import {LocalSetting} from '../../../utility/storage';
import {ROUTES, History} from '../../../utility/history';

export default function Result(props: {
  setting: LocalSetting;
  settingPrevious: LocalSetting;
  setHistory: SetState<History>;
  resetHandler: () => void;
  gameExitHandler?: () => void;
  exitHandler: ExitHandler;
}) {
  const button = useRef<HTMLDivElement>(null);
  const finalScore = props.setting.score - props.settingPrevious.score;
  const {time, unit} = timeConverter(
    props.setting.playTime - props.settingPrevious.playTime
  );

  useEffect(() => {
    button.current!.focus();
    // Attaching custom navigation history handler
    // for being able to play the exit animation.
    // If user has no interaction so far, no entry
    // will be added to history stack!
    props.setHistory(state => ({
      ...state,
      hash: ROUTES.result,
      navigationHandler: exitHandler
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Handles unmounting the component. */
  function exitHandler() {
    props.exitHandler(() => {
      props.resetHandler();
      props.setHistory(state => ({path: state.path}));
    });
  }

  return (
    <>
      <Vector
        name="arrow"
        className={[
          CSS.Arrow,
          CSSCommon.Box,
          props.gameExitHandler ? '' : CSSCommon.Disabled
        ].join(' ')}
        onClick={props.gameExitHandler}
      />
      {props.settingPrevious.scoreRecord !== 0 &&
        props.settingPrevious.scoreRecord < finalScore && (
          <div className={CSS.Trophy}>
            {props.setting.effects && <Confetti className={CSS.Confetti} />}
            <div className={CSS.NewRecord}>NEW RECORD</div>
            <Emoji code={0x1f3c6} /* 🏆 */ />
          </div>
        )}
      <div className={CSSModal.Item}>
        <Emoji code={0x1f4af} /* 💯 */ /> Score
        <span>{finalScore >= 0 ? finalScore : 0}</span>
      </div>
      <div className={CSSModal.Item}>
        <Emoji code={[0x23f2, 0xfe0f]} /* ⏲️ */ /> Play Time
        <span>{`${Math.round(time * 10) / 10}${unit}`}</span>
      </div>
      <div className={CSSModal.Item}>
        <Emoji code={0x1f3c5} /* 🏅 */ /> Best Record
        <span>{props.setting.scoreRecord}</span>
      </div>
      <div
        ref={button}
        className={[CSSCommon.Button, CSS.Button, CSSModal.Button].join(' ')}
        onClick={exitHandler}
        onKeyDown={event => keyCodes.includes(event.key) && exitHandler()}
        tabIndex={-1}>
        Retry
      </div>
    </>
  );
}
