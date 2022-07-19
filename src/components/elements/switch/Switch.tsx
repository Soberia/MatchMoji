import {memo, useRef} from 'react';

import CSS from './Switch.module.css';
import CSSCommon from '../../Common.module.css';

export default memo(function Switch(props: {
  on: boolean;
  callback: () => void;
  /** Delay between clicks after the first click. */
  clickDelay?: number;
  className?: string;
}) {
  const lastClickTime = useRef(0);

  /** Handles clicks on the element by ignoring repetitive clicks. */
  function clickHandler() {
    const curretnTime = Date.now();
    if (curretnTime - lastClickTime.current > (props.clickDelay || 0)) {
      lastClickTime.current = curretnTime;
      props.callback();
    }
  }

  return (
    <div
      role="switch"
      aria-checked={props.on}
      className={[
        CSS.Switch,
        CSSCommon.NoTapHighlight,
        props.className || ''
      ].join(' ')}
      onClick={clickHandler}>
      <div className={[CSS.Handle, props.on ? CSS.On : ''].join(' ')} />
    </div>
  );
});
