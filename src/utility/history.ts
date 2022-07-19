import {useRef, useState, useCallback, useLayoutEffect} from 'react';

import {useComponentWillMount} from './tools';

export interface History {
  path: string;
  hash?: string;
  /**
   * Custom callback triggers whenever navigation history changes
   * by browser nvaigation buttons. This callback can be used when
   * a component needs some time to does something before gets
   * unmounted (e.g. play animations).
   */
  navigationHandler?: () => void;
}

export const ROUTES = {
  /**
   * The base route for static files.
   * To be compatible with `process.env.PUBLIC_URL`,
   * this route must not contain trailing slash.
   */
  publicUrl: '',
  /**
   * The base route.
   * To be compatible with **Github Pages**,
   * this route must ends with trailing slash.
   * @see https://github.com/slorber/trailing-slash-guide
   */
  baseRoute: '/',
  result: '#result',
  setting: '#setting',
  changelog: '#changelog'
};

/**
 * Removes the hashtag from the URL and forcing to go backward.
 *
 * Hashtag should be removed immediately (by `replaceState()`)
 * to reduce visual glitches in the browser navigation bar.
 * However it's not possible to know whether forward button
 * pressed after this modification becuase there's no hashtag
 * in URL anymore. Passing a custom object as `data` parameter
 * for determining repetitive forward button press.
 */
function handleHash() {
  window.history.replaceState({goBack: true}, '', window.location.pathname);
  window.history.back();
}

/**
 * Returns initial history after validating the URL.
 *
 * Invalid URLs will be redirected to the base route.
 * Hashtags will be ignored and cleared from the URL.
 * Trailing slash will be preserved.
 *
 * @param baseRoute - If provided, considered as base route.
 */
function initialHistory(baseRoute?: string): History {
  const hash = window.location.hash;
  if (baseRoute) {
    ROUTES.baseRoute = baseRoute;
    ROUTES.publicUrl = baseRoute.endsWith('/')
      ? baseRoute.slice(0, -1) // Removing the trailing slash
      : baseRoute;
  }

  if (ROUTES.baseRoute !== window.location.pathname || hash)
    // Ignoring hashtags and incorrect pathnames
    window.history.replaceState({}, '', ROUTES.baseRoute);

  if (hash)
    for (const entry of window.performance.getEntriesByType('navigation'))
      if (
        entry.entryType === 'navigation' &&
        (entry as PerformanceNavigationTiming).type === 'reload'
      ) {
        // Client refreshed the page and there is a hashtag in URL
        handleHash();
        break;
      }

  return {path: ROUTES.baseRoute};
}

/**
 * Manages browser session history.
 * @param baseRoute - If provided, considered as base route.
 */
export function useHistory(baseRoute?: string) {
  const [history, _setHistory] = useState(() => initialHistory(baseRoute));
  const previousHandler = useRef(window.onpopstate);

  /**
   * Handles history changes.
   *
   * This is a wrapper around `React.useState()`'s `dispatch` function
   * which runs arbitrary code bedore updating the state.
   *
   * This ensures `window.location` is updated before updating
   * the state. This is neccessary because if navigation history
   * changes inside of `React.useEffect()`, then children components
   * of the parent component which uses this hook have to deal with
   * `window.location` with stale informations if trying to access
   * it during the render process.
   */
  const setHistory = useCallback<SetState<History>>(parameter => {
    let updated = false;
    _setHistory(state => {
      const history =
        typeof parameter === 'function' ? parameter(state) : parameter;

      if (Object.is(state, history)) {
        return state; // Bailing out
      }

      // State updater functions run twice in development environment
      // due to `React.StrictMode`, preventing the consequences.
      if (!updated) {
        updated = true;
        const hash = history.hash || '';
        if (history.path !== window.location.pathname || hash)
          window.history.pushState({}, '', history.path + hash);
        else if (window.location.hash || window.history.state?.goBack)
          // History state is updated by same `path` and no `hash` property
          // and there is a hashtag in URL or client navigated by
          // pressing forward button and there is a hashtag in URL.
          handleHash();
      }

      return history;
    });
  }, []);

  useComponentWillMount(() => {
    /**
     * Attaching the history handler.
     *
     * This cannot be placed inside of `React.useEffect()` hook,
     * because if children components want to attach a different handler
     * then they can't store this handler somewhere (it's not defined yet)
     * and change it to another one and finally restore it on unmount.
     **/
    window.onpopstate = event => {
      const path = window.location.pathname;
      if (!path.startsWith(ROUTES.baseRoute)) {
        /**
         * Client navigated outside of reach,
         * reattaching and executing the previous handler.
         *
         * @bug In development environment due to how `React.StrictMode` works,
         * {@link useHistory} custom hook runs twice and previous handler will
         * be same as the current handler therefore navigation will be broken.
         */
        window.onpopstate = previousHandler.current;
        previousHandler.current && previousHandler.current.call(window, event);
        return;
      }

      setHistory(state => {
        if (state.navigationHandler) {
          state.navigationHandler();
          return state;
        }
        return {path};
      });
    };
  });

  useLayoutEffect(() => {
    /**
     * Reattaching the previous handler.
     *
     * @bug In development environment due to how `React.StrictMode` works,
     * {@link useHistory} custom hook runs twice and previous handler will
     * be same as current handler. Preventing this at the cost of broken
     * navigation in parent component.
     */
    const handler = previousHandler.current; // Satisfying ESLint
    return () => {
      if (process.env.NODE_ENV === 'production') {
        window.onpopstate = handler;
      }
    };
  }, []);

  return [history, setHistory] as const;
}
