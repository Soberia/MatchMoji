import {memo} from 'react';

import CSS from './CloseButton.module.css';
import Focus from '../focus/Focus';
import Vector from '../vector/Vector';

export default memo(
  function CloseButton(props: {
    className?: string;
    callback: React.MouseEventHandler<HTMLDivElement>;
  }) {
    return (
      <Focus>
        <Vector
          name="close"
          className={[CSS.CloseButton, props.className || ''].join(' ')}
          onClick={props.callback}
        />
      </Focus>
    );
  },
  () => true
);
