import {Fragment, useRef, useState, useMemo, useEffect} from 'react';

import CSS from './ControlPanel.module.css';
import CSSCommon from '../Common.module.css';
import Focus from '../elements/focus/Focus';
import Vector from '../elements/vector/Vector';
import {LocalSetting} from '../../utility/storage';
import {ROUTES, History} from '../../utility/history';
import {
  timeConverter,
  temporalStyle,
  fullscreenSwitcher,
  FULLSCREEN_SUPPORTED
} from '../../utility/tools';

type PlayTime = LocalSetting['playTime'];

export const TIMER_INTERVAL = 100; // milisecond
export const TIMER_DEFAULT = 1e4; // milisecond
export const TIMER_MAX_VALUE = 99900; // milisecond
const MAX_DIGITS = Number('9'.repeat(7));

function Timer(props: {
  inactive: boolean;
  time: number;
  setTime: SetState<number>;
  setPlayTime: SetState<PlayTime>;
}) {
  const inactiveRealtime = useRef(props.inactive);

  useEffect(() => {
    inactiveRealtime.current = props.inactive;
  }, [props.inactive]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      if (!inactiveRealtime.current) {
        props.setTime(time => (time > 0 ? time - TIMER_INTERVAL : time));
        props.setPlayTime(state => state + TIMER_INTERVAL);
      }
    }, TIMER_INTERVAL);

    return () => {
      window.clearInterval(timerId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const seconds = ~~(props.time / 1000);
  const miliSeconds = Math.round((props.time % 1000) / 100);
  const digit = props.inactive || props.time === TIMER_DEFAULT ? 0 : 9;
  const clock = `${
    seconds >= 10 ? seconds : `0${seconds}`
  }:${miliSeconds}${Math.abs(digit - miliSeconds)}`;

  return (
    <div className={[CSS.Timer, CSSCommon.Code].join(' ')}>
      {clock
        .split('')
        .map((item, idx) => (idx === 2 ? item : <span key={idx}>{item}</span>))}
    </div>
  );
}

export default function ControlPanel(props: {
  inactive: boolean;
  time: number;
  playTime: PlayTime;
  setting: LocalSetting;
  settingPrevious: LocalSetting;
  setTime: SetState<number>;
  setPlayTime: SetState<PlayTime>;
  setSetting: SetState<LocalSetting>;
  setHistory: SetState<History>;
  gameExitHandler?: () => void;
}) {
  const [statsToggle, setStatsToggle] = useState(false);
  const medal = useRef<SVGSVGElement>(null);
  const score = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Showing visual effects on score increase
    if (
      props.setting.effects &&
      props.setting.scoreUp !== props.settingPrevious.scoreUp
    )
      temporalStyle([medal.current!, score.current!], CSS.ScoreUp, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.setting.scoreUp, props.settingPrevious.scoreUp]);

  useEffect(() => {
    // Showing visual effects on score decrease
    if (
      props.setting.effects &&
      props.setting.scoreDown !== props.settingPrevious.scoreDown
    )
      temporalStyle([medal.current!, score.current!], CSS.ScoreDown, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.setting.scoreDown, props.settingPrevious.scoreDown]);

  useEffect(() => {
    // Updating score record and total play time
    if (props.time === 0)
      props.setSetting(state => {
        const finalScore = state.score - props.settingPrevious.score;
        return {
          ...state,
          playTime: props.playTime,
          scoreRecord:
            state.scoreRecord < finalScore ? finalScore : state.scoreRecord
        };
      });

    // There is no need to add missing props to dependency array,
    // because values aren't stale whenever `props.time` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.time]);

  const iconClasses = [CSS.Icon, CSSCommon.Box].join(' ');
  const arrowClasses = [iconClasses];
  let ArrowWrapper = Focus;
  if (!props.gameExitHandler) {
    arrowClasses.push(CSSCommon.Disabled);
    ArrowWrapper = Fragment;
  }

  const controlPanelClasses = [CSS.ControlPanel];
  const statsClasses = [CSS.Stats, CSSCommon.Box, CSSCommon.NoTapHighlight];
  const details = useMemo(
    () => {
      if (statsToggle) {
        const BIG_SCORE = `+${MAX_DIGITS}`;
        const {time, unit} = timeConverter(props.playTime);
        controlPanelClasses.push(CSS.TimerShadow);
        statsClasses.push(CSS.StatsExpand);
        return (
          <div className={[CSS.Details, CSSCommon.Code].join(' ')}>
            <div>
              Total time played:
              <span>{`${
                time <= MAX_DIGITS ? Math.round(time) : BIG_SCORE
              }${unit}`}</span>
            </div>
            <div>
              Total success:
              <span>
                {props.setting.scoreUp <= MAX_DIGITS
                  ? props.setting.scoreUp
                  : BIG_SCORE}
              </span>
            </div>
            <div>
              Total failure:
              <span>
                {props.setting.scoreDown <= MAX_DIGITS
                  ? props.setting.scoreDown
                  : BIG_SCORE}
              </span>
            </div>
          </div>
        );
      }
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.playTime,
      props.setting.scoreDown,
      props.setting.scoreUp,
      statsToggle
    ]
  );

  return (
    <div className={controlPanelClasses.join(' ')}>
      <div>
        {useMemo(
          () => (
            <ArrowWrapper>
              <Vector
                name="arrow"
                className={arrowClasses.join(' ')}
                onClick={props.gameExitHandler}
              />
            </ArrowWrapper>
          ),
          [props.gameExitHandler] // eslint-disable-line react-hooks/exhaustive-deps
        )}
        {useMemo(
          () =>
            FULLSCREEN_SUPPORTED && (
              <Focus>
                <Vector
                  name="fullscreen"
                  className={iconClasses}
                  onClick={() => fullscreenSwitcher()}
                />
              </Focus>
            ),
          [] // eslint-disable-line react-hooks/exhaustive-deps
        )}
        {useMemo(
          () => (
            <Focus>
              <Vector
                name="gears"
                className={iconClasses}
                onClick={() =>
                  props.setHistory(state => ({...state, hash: ROUTES.setting}))
                }
              />
            </Focus>
          ),
          [] // eslint-disable-line react-hooks/exhaustive-deps
        )}
      </div>
      <Timer
        inactive={props.inactive}
        time={props.time}
        setTime={props.setTime}
        setPlayTime={props.setPlayTime}
      />
      {useMemo(
        () => (
          <Focus>
            <div
              className={statsClasses.join(' ')}
              onClick={() => setStatsToggle(state => !state)}>
              <Vector ref={medal} className={CSS.Score} name="medal" />
              <span
                ref={score}
                className={[CSS.Score, CSSCommon.Code].join(' ')}>
                {props.setting.score <= MAX_DIGITS
                  ? props.setting.score
                  : `+${MAX_DIGITS}`}
              </span>
              {details}
            </div>
          </Focus>
        ),
        [props.setting.score, details] // eslint-disable-line react-hooks/exhaustive-deps
      )}
    </div>
  );
}
