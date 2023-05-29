import {
  memo,
  forwardRef,
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle
} from 'react';

import CSS from './EmojiPanel.module.css';
import Emoji from '../emoji/Emoji';
import {
  TIMER_INTERVAL,
  TIMER_DEFAULT,
  TIMER_MAX_VALUE
} from '../control-panel/ControlPanel';
import {EmojiGroups, Difficulty} from '../../types';
import {useFont} from '../../utility/font';
import {LocalSetting} from '../../utility/storage';
import {temporalStyle, arrayShuffle} from '../../utility/tools';
import {emojiGenerator, emojiCounter, EmojiUnit} from '../../utility/generator';

export interface Utility {
  /** Reloads the emojis. */
  reloadEmojis(): void;
  /** Calculates emojis count relative to current container dimension. */
  emojiCount(): number;
}

const levels: Record<Difficulty, Readonly<Record<'score' | 'time', number>>> = {
  [Difficulty.Easy]: {score: 1, time: 3e3},
  [Difficulty.Normal]: {score: 2, time: 2e3},
  [Difficulty.Hard]: {score: 3, time: 1e3}
};

export default memo(
  forwardRef(function EmojiPanel(
    {
      inactive,
      setting,
      setSetting,
      setTime
    }: {
      inactive: boolean;
      setting: LocalSetting;
      setSetting: SetState<LocalSetting>;
      setTime: SetState<number>;
    },
    ref: React.ForwardedRef<Utility>
  ) {
    const [emojis, setEmojis] = useState<EmojiUnit[]>([]);
    const [selectedEmoji, setSelectedEmoji] = useState<EmojiUnit>();
    const selectedEmojiRealtime = useRef(selectedEmoji);
    const inactiveRealtime = useRef(inactive);
    const vibrationRealtime = useRef(setting.vibration);
    const effectsRealtime = useRef(setting.effects);
    const self = useRef<HTMLDivElement>(null);
    const match = useRef({
      level: {...levels[setting.difficulty]},
      difficulty: setting.difficulty,
      emojiVariants: setting.emojiVariants,
      emojiGroups: [...setting.emojiGroups],
      emojiCount: 0,
      panelWidth: 0,
      panelHeight: 0
    });

    /**
     * Calculates emoji's size and count based on available space in component.
     * @param resized - Whether to recalculate emoji's size relative to
     * current emojis count and available space.
     * @param emojiCount - Just return the calculated emojis count value.
     */
    const computeEmoji = useCallback<{
      (resized: boolean): undefined;
      (resized: false, emojiCount: true): number;
    }>((resized, emojiCount?): any => {
      let count, size, margin, rows, columns;
      const padding = parseFloat(
        window.getComputedStyle(self.current!).padding
      );
      const panelWidth = self.current!.offsetWidth - padding;
      const panelHeight = self.current!.offsetHeight - padding;
      const panelStyle = self.current!.style;

      if (!resized) {
        // Assuming initial emoji size is 40px (without margin) for panel
        // with 1000px width, and increasing or decreasing it on every 100px step.
        size = 40 + (panelWidth - 1000) / 100;
        margin = size / 5;
        const sizeWithMargin = size + margin * 2;

        rows = Math.floor(panelHeight / sizeWithMargin);
        columns = Math.floor(panelWidth / sizeWithMargin);
        count = rows * columns;
        if (count % 2 === 1) {
          // Last row won't fill, removing the row entirely
          rows--;
          count -= columns;
        }

        if (emojiCount) {
          return count;
        }

        // Making sure component gets resized
      } else if (
        panelWidth !== match.current.panelWidth ||
        panelHeight !== match.current.panelHeight
      ) {
        /*
         Emoji's size determined based on emojis count:
         count = rows * columns
         count = (panelHeight / size) * (panelWidth / size)
         count = (panelHeight * panelWidth) / (size * size)
         size = Math.sqrt((panelWidth * panelHeight) / count)
         */
        count = match.current.emojiCount;
        size = Math.sqrt((panelWidth * panelHeight) / count);
        rows = Math.ceil(panelHeight / size);
        columns = Math.ceil(panelWidth / size);
        let emptyCells = rows * columns - count;
        if (emptyCells > 0) {
          const emptyRows = Math.floor(emptyCells / columns);
          if (emptyRows !== 0) {
            // Removing the empty rows
            emptyCells -= emptyRows * columns;
            rows -= emptyRows;
          }

          // if (emptyCells !== 0) {
          /** @todo Last row won't fill entirely, what should be done? */
          // }
        }

        size = Math.min(panelHeight / rows, panelWidth / columns);
        margin = size / 5;
        size -= margin * 2;
      } else {
        return;
      }

      panelStyle.gridTemplateRows = `repeat(${rows}, 1fr)`;
      panelStyle.gridTemplateColumns = `repeat(${columns}, 1fr)`;
      panelStyle.setProperty('--emoji-size', `${size}px`);
      panelStyle.setProperty('--emoji-margin', `${margin}px`);
      match.current = {
        ...match.current,
        emojiCount: count,
        panelWidth,
        panelHeight
      };
    }, []);

    /** Generates and loads the emojis. */
    const loadEmojis = useCallback(() => {
      computeEmoji(false);
      const difficulty = setting.difficulty;
      const level = {...levels[difficulty]};
      let emojiVariants = setting.emojiVariants;
      let emojiGroups = [...setting.emojiGroups];
      if (emojiCounter(emojiGroups, emojiVariants) < match.current.emojiCount) {
        // Current emojis count won't fill the container entirely,
        // recalculating the emojis count with all available emoji groups and variants.
        match.current.emojiVariants = emojiVariants = true;
        match.current.emojiGroups = emojiGroups = Object.values(
          EmojiGroups
        ) as EmojiGroups[];
        setSetting(state => ({...state, emojiGroups, emojiVariants}));
        computeEmoji(false);
      }

      // Adjusting the reward time based on emojis count
      level.time += (match.current.emojiCount - 100) * (level.time / 1e3);
      level.time = Math.round(level.time / TIMER_INTERVAL) * TIMER_INTERVAL; // Rounding based on timer interval

      match.current = {
        ...match.current,
        level,
        difficulty,
        emojiVariants,
        emojiGroups
      };
      setSelectedEmoji(undefined);
      setEmojis(
        emojiGenerator(emojiGroups, match.current.emojiCount / 2, emojiVariants)
      );
    }, [
      setting.emojiGroups,
      setting.emojiVariants,
      setting.difficulty,
      computeEmoji,
      setSetting
    ]);

    useFont(); // Loading the font

    useImperativeHandle(
      ref,
      () => ({
        reloadEmojis: loadEmojis,
        emojiCount: () => computeEmoji(false, true)
      }),
      [loadEmojis, computeEmoji]
    );

    useEffect(loadEmojis, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      selectedEmojiRealtime.current = selectedEmoji;
    }, [selectedEmoji]);

    useEffect(() => {
      inactiveRealtime.current = inactive;
    }, [inactive]);

    useEffect(() => {
      vibrationRealtime.current = setting.vibration;
    }, [setting.vibration]);

    useEffect(() => {
      effectsRealtime.current = setting.effects;
    }, [setting.effects]);

    useEffect(() => {
      // Recalculating emoji's size whenever component gets resized
      let timerId: number | undefined;
      const resizeHandler = () => computeEmoji(true);
      const resizeObserver = new ResizeObserver(() => {
        window.clearTimeout(timerId);
        timerId = window.setTimeout(resizeHandler, 100);
      });
      resizeObserver.observe(self.current!, {box: 'border-box'});
      return () => resizeObserver.disconnect();
    }, [computeEmoji]);

    useEffect(() => {
      /**
       * Randomly swapping or shuffling emojis places for harder difficulty levels.
       * @bug In development environment due to how `React.StrictMode` works,
       * this effect runs twice and more emojis might swap every time.
       */
      let shuffled = 0;
      const timerId = window.setInterval(
        () =>
          setEmojis(state => {
            if (
              !state.length ||
              inactiveRealtime.current ||
              match.current.difficulty === Difficulty.Easy
            )
              return state;

            const reorderedIndices: number[] = [];
            const selectedEmoji = selectedEmojiRealtime.current;
            // Shuffling all the emojis by the chance
            // while preserving selected emoji's position.
            if (match.current.difficulty === Difficulty.Hard)
              if (Math.random() < 0.12 /* = 12% */ && ++shuffled % 2 !== 0) {
                let selectedEmojiIndex: number | undefined;
                if (selectedEmoji)
                  selectedEmojiIndex = state.indexOf(selectedEmoji);

                const emojis = [...state];
                arrayShuffle(state);
                if (selectedEmojiIndex) {
                  state[state.indexOf(selectedEmoji!)] =
                    state[selectedEmojiIndex];
                  state[selectedEmojiIndex] = selectedEmoji!;
                }

                for (let index = 0; index < state.length; index++)
                  if (state[index].id !== emojis[index].id)
                    reorderedIndices.push(index);
              }

            const indices: number[] = [];
            while (indices.length < 2) {
              const randomIndex = Math.floor(Math.random() * state.length);
              const emoji = state[randomIndex];
              if (
                randomIndex !== indices[0] && // Emoji's index shouldn't be same as previous one
                emoji.id !== selectedEmoji?.id && // Emoji shouldn't be selected
                !(emoji.hidden && state[indices[0]]?.hidden) // Emoji shouldn't be hidden if previous one is also hidden
              ) {
                indices.push(randomIndex);
                if (!reorderedIndices.includes(randomIndex))
                  reorderedIndices.push(randomIndex);
              }
            }

            // Temporarily disabling transition effects
            // to avoid appearing hidden emojis.
            for (const index of reorderedIndices)
              (self.current!.children[index] as HTMLElement).style.transition =
                'none';

            // Playing an animation for swapped emojis
            if (effectsRealtime.current)
              for (const index of indices) {
                const emoji = self.current!.children[index] as HTMLElement;
                reorderedIndices.pop();
                emoji.animate(
                  [
                    {transform: 'scale(1)'},
                    {transform: 'scale(0)', offset: 0.5}
                  ],
                  400
                ).onfinish = () => emoji.removeAttribute('style');
              }

            window.setTimeout(() => {
              for (const index of reorderedIndices)
                self.current?.children[index].removeAttribute('style');
            }, 200);

            [state[indices[0]], state[indices[1]]] = [
              state[indices[1]],
              state[indices[0]]
            ];
            return [...state];
          }),
        1e3
      );

      return () => {
        window.clearInterval(timerId);
      };
    }, []);

    useEffect(() => {
      // Reloading the emojis when there's no emoji left visible
      if (emojis.length) {
        for (const emoji of emojis)
          if (!emoji.hidden) {
            return;
          }

        setEmojis(
          emojiGenerator(
            match.current.emojiGroups,
            match.current.emojiCount / 2,
            match.current.emojiVariants
          )
        );
        setTime(state => {
          const time = state + TIMER_DEFAULT * 0.8; // 80%
          return time < TIMER_MAX_VALUE ? time : TIMER_MAX_VALUE;
        });

        temporalStyle(self.current!, CSS.Reload, 500);
      }
    }, [emojis, setTime]);

    /** Handles selecting emojis whether they've selected right or wrong. */
    function emojiSelectHandler<
      T extends Element
    >(event: React.MouseEvent<T>, emoji: EmojiUnit) {
      if (!inactiveRealtime.current)
        if (!selectedEmojiRealtime.current) setSelectedEmoji(emoji);
        else {
          const level = match.current.level;
          if (emoji.code === selectedEmojiRealtime.current.code) {
            if (emoji.id !== selectedEmojiRealtime.current.id) {
              setEmojis(state => {
                const emojis = [...state];
                let removed = false;
                for (let i = 0; i < state.length; i++)
                  if (state[i].code === emoji.code) {
                    emojis[i].hidden = true;
                    if (removed) break;
                    else removed = true;
                  }

                return emojis;
              });
              setTime(state => {
                const time = state + level.time;
                return time < TIMER_MAX_VALUE ? time : TIMER_MAX_VALUE;
              });
              setSetting(state => ({
                ...state,
                score: state.score + level.score,
                scoreUp: ++state.scoreUp
              }));
            }
          } else {
            // Emoji not matched
            const target = event.target as T;
            setTime(state => (state >= level.time ? state - level.time : 0));
            setSetting(state => {
              const newScore = state.score - level.score;
              return {
                ...state,
                score: newScore > 0 ? newScore : 0,
                scoreDown: ++state.scoreDown
              };
            });

            if (effectsRealtime.current)
              temporalStyle(target, CSS.SelectedWrong, 400);
            if (vibrationRealtime.current && window.navigator.vibrate)
              window.navigator.vibrate(100);
          }

          setSelectedEmoji(undefined);
        }
    }

    const _emojis = [];
    const font = setting.font;
    let index = 0;
    for (const emoji of emojis) {
      let handler: React.MouseEventHandler | undefined;
      const classes = [CSS.Emoji];
      if (emoji.hidden) {
        classes.push(CSS.Hidden);
      } else {
        // eslint-disable-next-line no-loop-func
        handler = <T extends Element>(event: React.MouseEvent<T>) =>
          emojiSelectHandler(event, emoji);
        if (emoji.id === selectedEmoji?.id) {
          classes.push(CSS.Selected);
        }
      }
      _emojis.push(
        <Emoji
          /**
           * `key` should not change, otherwise reordering the emojis
           * will remove and reinsert them in the DOM and that causes
           * replaying the animations/transitions which leads to
           * inability to select the emojis correctly.
           * @see https://github.com/facebook/react/issues/19695
           *
           * However if same emojis swapped on each other places,
           * a unique identifier should be passed as prop to force
           * a re-render.
           */
          key={index++}
          id={emoji.id}
          code={emoji.code}
          font={font}
          className={classes.join(' ')}
          onClick={handler}
        />
      );
    }

    return (
      <div ref={self} className={CSS.EmojisPanel}>
        {_emojis}
      </div>
    );
  }),
  (prevProps, nextProps) =>
    prevProps.inactive === nextProps.inactive &&
    prevProps.setting.font === nextProps.setting.font &&
    prevProps.setting.effects === nextProps.setting.effects
);
