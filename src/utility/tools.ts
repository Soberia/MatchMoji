import {useRef} from 'react';

type FullscreenEnabled = typeof document.fullscreenEnabled;
type FullscreenElement = typeof document.fullscreenElement;
type ExitFullscreen = typeof document.exitFullscreen;
type RequestFullscreen = typeof document.documentElement.requestFullscreen;

declare global {
  interface Document {
    webkitFullscreenEnabled: FullscreenEnabled;
    mozFullScreenEnabled: FullscreenEnabled;
    webkitFullscreenElement: FullscreenElement;
    mozFullScreenElement: FullscreenElement;
    webkitExitFullscreen: ExitFullscreen;
    mozCancelFullScreen: ExitFullscreen;
  }
  interface HTMLElement {
    webkitRequestFullscreen: RequestFullscreen;
    mozRequestFullScreen: RequestFullscreen;
  }
}

export const FULLSCREEN_SUPPORTED =
  document.fullscreenEnabled ||
  document.webkitFullscreenEnabled ||
  document.mozFullScreenEnabled;

/** Switches between fullscreen and windowed mode. */
export function fullscreenSwitcher(exit?: boolean) {
  if (FULLSCREEN_SUPPORTED)
    if (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement
    )
      (
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen
      ).call(document);
    else if (exit !== true)
      (
        document.documentElement.requestFullscreen ||
        document.documentElement.webkitRequestFullscreen ||
        document.documentElement.mozRequestFullScreen
      ).call(document.documentElement);
}

/** Randomizes array's elements using `Durstenfeld` shuffle algorithm in-place. */
export function arrayShuffle<T extends any[]>(array: T) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

/**
 * Converts time from millisecond to greater units.
 * @param time - In milliseconds
 */
export function timeConverter(time: number) {
  let unit = 's';
  time = time / 1e3;
  if (time >= 60) {
    unit = 'm';
    time /= 60;
    if (time >= 60) {
      unit = 'h';
      time /= 60;
    }
  }

  return {time, unit};
}

/**
 * Temporally adds a class or classes to given element or elements.
 * @param time - In milliseconds
 * @param callback - Runs after removing classes.
 */
export function temporalStyle(
  element: Element | Element[],
  className: string | string[],
  time: number,
  callback?: () => void
) {
  const elements: Element[] = Array.isArray(element) ? element : [element];
  const classNames: string[] =
    typeof className === 'string' ? [className] : className;

  for (const element of elements) {
    element.classList.add(...classNames);
  }
  window.setTimeout(() => {
    for (const element of elements)
      if (element) {
        element.classList.remove(...classNames);
      }

    callback && callback();
  }, time);
}

/**
 * Updates page title and description, Open Graph and
 * Twitter Cards meta tags to the given values.
 */
export function metaTagUpdater(
  title: string,
  description: string,
  photoUrl = '',
  pageUrl = ''
) {
  document.title = title;
  for (const [key, value] of Object.entries({
    'meta[name="description"]': description,
    'meta[name="twitter:card"]': 'summary',
    'meta[name="twitter:title"]': title,
    'meta[name="twitter:description"]': description,
    'meta[name="twitter:image"]': photoUrl,
    'meta[property="og:type"]': 'website',
    'meta[property="og:title"]': title,
    'meta[property="og:description"]': description,
    'meta[property="og:image': photoUrl,
    'meta[property="og:url"]': pageUrl
  }))
    document.querySelector(key)?.setAttribute('content', value);
}

/** Mimics React `componentWillMount` lifecycle behavior. */
export function useComponentWillMount(callback: () => void) {
  const mounted = useRef(false);
  if (!mounted.current) {
    mounted.current = true;
    callback();
  }
}
