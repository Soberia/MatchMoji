import {useRef, useEffect, useMemo} from 'react';

import CSS from './Intro.module.css';
import CSSModal from '../Modal.module.css';
import CSSCommon from '../../Common.module.css';
import Emoji from '../../emoji/Emoji';
import {keyCodes, ExitHandler} from '../Modal';
import {arrayShuffle} from '../../../utility/tools';
import {LocalSetting} from '../../../utility/storage';

export default function Intro(props: {
  setSetting: SetState<LocalSetting>;
  exitHandler: ExitHandler;
}) {
  const button = useRef<HTMLDivElement>(null);

  useEffect(() => {
    button.current!.focus();
  }, []);

  /** Handles unmounting the component. */
  function exitHandler() {
    props.exitHandler(() =>
      props.setSetting(state => ({...state, showIntroduction: false}))
    );
  }

  // Should be memoized to avoid appearing inconstant emojis
  // on rerender caused by something like accepting cookie consent.
  return useMemo(() => {
    // Generating 3x3 matrix of emojis which
    // items i₁₃ and i₂₁ are identical.
    const emojis: number[] = [];
    for (let code = 0x1f300; code < 0x1f320; code++) emojis.push(code);
    arrayShuffle(emojis);
    while (emojis.length > 9) emojis.pop();
    emojis[3] = emojis[2];

    return (
      <>
        <div className={CSS.EmojiBox}>
          <Emoji code={[0x1f446, 0x1f3fb]} /* 👆🏻 */ />
          {emojis.map((emoji, idx) => (
            <Emoji key={idx} code={emoji} />
          ))}
        </div>
        Select identical emojis before time's up!
        <div
          ref={button}
          className={[CSSCommon.Button, CSSModal.Button].join(' ')}
          onClick={exitHandler}
          onKeyDown={event => keyCodes.includes(event.key) && exitHandler()}
          tabIndex={-1}>
          Got It
        </div>
      </>
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
