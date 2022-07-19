import {memo, forwardRef} from 'react';

import CSS from './Emoji.module.css';
import CSSCommon from '../Common.module.css';
import {Font} from '../../types';

export default memo(
  forwardRef(function Emoji(
    props: {
      code: number | number[];
      font?: Font;
      className?: string;
      onClick?: React.MouseEventHandler<HTMLDivElement>;
    },
    ref?: React.ForwardedRef<HTMLDivElement>
  ) {
    return (
      <div
        ref={ref}
        className={[
          CSS.Emoji,
          CSSCommon.NoTapHighlight,
          props.className || '',
          props.font !== undefined && props.font !== Font.Default
            ? CSS[Font[props.font]]
            : ''
        ].join(' ')}
        onClick={props.onClick}>
        {String.fromCodePoint(
          ...(Array.isArray(props.code) ? props.code : [props.code])
        )}
      </div>
    );
  }),
  (prevProps, nextProps) =>
    prevProps.code === nextProps.code &&
    prevProps.font === nextProps.font &&
    prevProps.className === nextProps.className
);
