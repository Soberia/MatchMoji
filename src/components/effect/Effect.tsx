import {memo} from 'react';

import CSS from './Effect.module.css';

export default memo(function Effect(props: {enabled: boolean; alarm: boolean}) {
  return props.enabled ? (
    <div
      className={[CSS.Effect, CSS.Alarm, props.alarm ? CSS.Visible : ''].join(
        ' '
      )}
    />
  ) : null;
});
