import {memo, forwardRef} from 'react';

import CSSCommon from '../../Common.module.css';
import {ReactComponent as Arrow} from './arrow.svg';
import {ReactComponent as Close} from './close.svg';
import {ReactComponent as Fullscreen} from './fullscreen.svg';
import {ReactComponent as Gears} from './gears.svg';
import {ReactComponent as Loading} from './loading.svg';
import {ReactComponent as Medal} from './medal.svg';
import {ReactComponent as Refresh} from './refresh.svg';

const SVGs = {
  arrow: {component: Arrow},
  close: {component: Close},
  fullscreen: {component: Fullscreen, title: 'Fullscreen'},
  gears: {component: Gears, title: 'Setting'},
  loading: {component: Loading, title: 'Loading...'},
  medal: {component: Medal},
  refresh: {component: Refresh, title: 'Refresh'}
};

export default memo(
  forwardRef(function Vector(
    props: Override<
      React.HTMLAttributes<HTMLDivElement>,
      {
        name: keyof typeof SVGs;
        svgProps?: React.SVGProps<SVGSVGElement>;
      }
    >,
    ref?: React.ForwardedRef<SVGSVGElement>
  ) {
    // @ts-expect-error
    const {component: SVG, title} = SVGs[props.name];
    const {name, svgProps, ...attributes} = props;

    return (
      <div
        {...attributes}
        className={[props.className || '', CSSCommon.NoTapHighlight].join(' ')}
        title={props.title || title}>
        <SVG {...svgProps} ref={ref} />
      </div>
    );
  })
);
