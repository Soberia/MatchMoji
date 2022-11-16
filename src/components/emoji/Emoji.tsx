import {Fragment, memo, forwardRef} from 'react';

import CSS from './Emoji.module.css';
import CSSCommon from '../Common.module.css';
import Focus from '../elements/focus/Focus';
import {Font} from '../../types';

export default memo(
  forwardRef(function Emoji(
    props: {
      code: number | number[];
      /**
       * The emoji unique identifier.
       * If provided, triggers a re-render on value change.
       */
      id?: number;
      font?: Font;
      className?: string;
      focus?: boolean;
      onClick?: React.MouseEventHandler<HTMLDivElement>;
    },
    ref?: React.ForwardedRef<HTMLDivElement>
  ) {
    const Wrapper = props.focus ? Focus : Fragment;
    return (
      <Wrapper>
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
      </Wrapper>
    );
  }),
  (prevProps, nextProps) =>
    prevProps.code === nextProps.code &&
    prevProps.id === nextProps.id &&
    prevProps.font === nextProps.font &&
    prevProps.className === nextProps.className
);
