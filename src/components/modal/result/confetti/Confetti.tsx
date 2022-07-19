import {useRef, useEffect} from 'react';
import {confetti, ConfettiConfig} from 'dom-confetti';

import CSS from './Confetti.module.css';

function configGenerator(): ConfettiConfig {
  return {
    angle: 90,
    spread: 90,
    startVelocity: 50,
    elementCount: 100,
    dragFriction: 0.1,
    duration: 1e4,
    stagger: 3,
    width: '8px',
    height: '8px',
    perspective: '500px',
    colors: [
      'DodgerBlue',
      'OliveDrab',
      'Gold',
      'Pink',
      'SlateBlue',
      'LightBlue',
      'Violet',
      'PaleGreen',
      'SteelBlue',
      'SandyBrown',
      'Chocolate',
      'Crimson'
    ]
  };
}

export default function Confetti(props: {
  className?: string;
  config?: ConfettiConfig;
}) {
  const self = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Due to parent component might get unmounted,
    // moving element to the top node while preserving the
    // current element position in the viewport.
    // Position should be calculated in percentage unit
    // becuase viewport could be changed on window resize.
    const selfRect = self.current!.getBoundingClientRect();
    document.querySelector('body')!.appendChild(self.current!);
    self.current!.style.position = 'fixed';
    self.current!.style.top = `${(selfRect.top * 100) / window.innerHeight}%`;
    self.current!.style.right = `${
      (selfRect.right * 100) / window.innerWidth
    }%`;

    const config = props.config || configGenerator();
    confetti(self.current!, config);
    window.setTimeout(
      () => self.current && self.current.remove(),
      config.duration
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={self} className={[CSS.Confetti, props.className].join(' ')} />
  );
}
