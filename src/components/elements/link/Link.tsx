import CSS from './Link.module.css';
import Focus from '../focus/Focus';

export default function Link(
  props: Override<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    {
      href?: URL | string;
      newWindow?: boolean;
    }
  >
) {
  let attributes = props;
  if (attributes.newWindow) {
    attributes = {...props, target: '_blank', rel: 'noopener'};
    delete attributes.newWindow;
  }

  return (
    <Focus>
      <a
        {...attributes}
        className={[CSS.Link, props.className || ''].join(' ')}
        href={
          props.href
            ? typeof props.href !== 'string'
              ? props.href.toString()
              : props.href
            : undefined
        }>
        {props.children}
      </a>
    </Focus>
  );
}
