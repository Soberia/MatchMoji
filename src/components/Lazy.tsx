import {lazy, Suspense, useState} from 'react';

import CSS from './App.module.css';
import {type Props} from './App';
import {ReactComponent as Loading} from './elements/vector/loading.svg';
import {ReactComponent as Refresh} from './elements/vector/refresh.svg';

export default function Lazy(props: Props) {
  const [App, setApp] = useState(() => lazy(loader));

  /** Loads `App` component dynamically. */
  async function loader() {
    try {
      // Why TypeScript can't infer the type of dynamic
      // import if extension of module is explicitly mentioned?
      return (await import('./App.js')) as unknown as {
        default: React.FunctionComponent<Props>;
      };
    } catch {
      return {
        default: () => (
          <div
            title="Reload"
            className={[CSS.Loading, CSS.Reload].join(' ')}
            onClick={() => setApp(lazy(loader))}>
            <Refresh />
          </div>
        )
      };
    }
  }

  return (
    <Suspense
      fallback={
        <div title="Loading..." className={CSS.Loading}>
          <Loading />
        </div>
      }>
      <App {...props} />
    </Suspense>
  );
}
