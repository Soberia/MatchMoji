import {useRef, useState, useEffect, useMemo, useCallback} from 'react';

import TimesUp from '../assets/times-up.m4a';
import ScoreUp from '../assets/score-up.m4a';
import ScoreDown from '../assets/score-down.m4a';
import ScoreRecord from '../assets/score-record.m4a';
import BackgroundMusic from '../assets/background-music.m4a';
import {fetchFile} from '../utility/request';
import {LocalSetting} from '../utility/storage';

declare global {
  interface Window {
    webkitAudioContext: AudioContext;
  }
}

type Sounds = keyof typeof soundRefsBlueprint;

const MUSIC_VOLUME = 0.1;
const soundRefsBlueprint = {
  'times-up': null,
  'score-up': null,
  'score-down': null,
  'score-record': null
} as const;

export default function Sound(props: {
  setting: LocalSetting;
  settingPrevious: LocalSetting;
  criticalTime?: number;
  setMusicLoaded: SetState<boolean | undefined>;
}) {
  const [musicReload, setMusicReload] = useState({});
  const musicLoadLock = useRef(false);
  const musicContext = useRef<AudioContext>();
  const musicGain = useRef<GainNode>();
  const soundEnabled = useRef(props.setting.sound);
  const lastAlarmTime = useRef(0);
  const soundRefs = useRef<Record<Sounds, HTMLAudioElement | null>>({
    ...soundRefsBlueprint
  });

  /** Plays the given sound. */
  const play = useCallback((sound: Sounds) => {
    if (soundEnabled.current) {
      soundRefs.current[sound]?.play();
    }
  }, []);

  useEffect(() => {
    soundEnabled.current = props.setting.sound;
  }, [props.setting.sound]);

  useEffect(() => {
    // Playing the sound rhythmically
    if (props.criticalTime) {
      if (Math.abs(lastAlarmTime.current - props.criticalTime) > 700) {
        lastAlarmTime.current = props.criticalTime;
        play('times-up');
      }
    } else {
      lastAlarmTime.current = 0;
    }
  }, [props.criticalTime, play]);

  useEffect(() => {
    if (props.setting.scoreUp !== props.settingPrevious.scoreUp)
      play('score-up');
  }, [props.setting.scoreUp, props.settingPrevious.scoreUp, play]);

  useEffect(() => {
    if (props.setting.scoreDown !== props.settingPrevious.scoreDown)
      play('score-down');
  }, [props.setting.scoreDown, props.settingPrevious.scoreDown, play]);

  useEffect(() => {
    if (
      props.setting.scoreRecord !== props.settingPrevious.scoreRecord &&
      props.settingPrevious.scoreRecord !== 0
    ) {
      // Temporarily reducing the music volume during sound playback
      const currentVolume = musicGain.current?.gain.value;
      currentVolume && musicFadeEffect(currentVolume / 5, 1);
      window.setTimeout(
        () => currentVolume && musicFadeEffect(currentVolume, 1),
        2e3
      );

      play('score-record');
    }
  }, [props.setting.scoreRecord, props.settingPrevious.scoreRecord, play]);

  useEffect(() => {
    // Due to autoplay policy in browsers, a user gesture needed
    // before playing an audio. Playing the background music
    // only if not started just yet.
    if (musicContext.current?.state === 'suspended') {
      setMusicReload({});
    }
  }, [props.setting.scoreUp, props.setting.scoreDown]);

  useEffect(() => {
    // Playing or pausing the background music
    if (musicContext.current)
      if (props.setting.backgroundMusic && props.setting.sound) {
        if (musicContext.current.state === 'suspended') {
          musicContext.current.resume();
          musicFadeEffect(MUSIC_VOLUME, 1);
        }
      } else if (musicContext.current.state === 'running') {
        musicFadeEffect(0.0001, 1);
        window.setTimeout(() => musicContext.current?.suspend(), 1e3);
      }
  }, [props.setting.backgroundMusic, props.setting.sound, musicReload]);

  useEffect(() => {
    // Loading and starting the background music
    if (!musicContext.current)
      (async () => {
        // Using lock mechanism to avoiding race condition
        if (musicLoadLock.current) return;
        musicLoadLock.current = true;

        let musicLoaded = true;
        let audioData: ArrayBuffer | undefined;
        try {
          audioData = await fetchFile(
            BackgroundMusic,
            'arrayBuffer',
            2e4,
            true
          );
        } catch {
          musicLoaded = false;
        }

        if (audioData) {
          musicContext.current = new (window.AudioContext ||
            window.webkitAudioContext)();
          musicGain.current = musicContext.current.createGain();
          const musicSource = musicContext.current.createBufferSource();

          // Connecting the nodes
          musicGain.current.connect(musicContext.current.destination);
          musicSource.connect(musicGain.current);

          musicGain.current.gain.value = MUSIC_VOLUME;
          musicSource.loop = true;

          try {
            musicSource.buffer = await musicContext.current.decodeAudioData(
              audioData
            );
          } catch {
            // Probably browser doesn't support the audio codec
            musicLoaded = false;
          }

          if (musicSource.buffer) {
            musicSource.start();
            musicContext.current.suspend();
          }
        }

        musicLoadLock.current = false; // Releasing the lock
        props.setMusicLoaded(musicLoaded);
        setMusicReload({});
      })();

    // Stopping the background music and freeing up the resources
    return () => {
      if (musicContext.current) {
        musicFadeEffect(0.0001, 1);
        window.setTimeout(() => {
          musicGain.current?.disconnect();
          musicContext.current?.close();
        }, 1e3);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Stopping playback of all sounds
    if (!props.setting.sound)
      for (const audio of Object.values(soundRefs.current))
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
  }, [props.setting.sound]);

  /**
   * Modifies the volume of background music for given period of time.
   * @param duration - In seconds
   * @bug The fade effect won't work in Firefox.
   * @see https://bugzilla.mozilla.org/show_bug.cgi?id=1567777
   */
  function musicFadeEffect(value: number, duration: number) {
    if (musicGain.current) {
      const currentTime = musicContext.current!.currentTime;
      musicGain.current.gain.setValueAtTime(
        musicGain.current.gain.value,
        currentTime
      );
      musicGain.current.gain.exponentialRampToValueAtTime(
        value,
        currentTime + duration
      );
    }
  }

  return useMemo(
    () => (
      <>
        {(Object.keys(soundRefs.current) as Sounds[]).map(key => (
          // `useRef` hook couldn't be used inside a callback or loop,
          // storing elements reference into an custom object instead.
          <audio
            key={key}
            ref={element => (soundRefs.current[key] = element)}
            preload="auto">
            <source
              src={[TimesUp, ScoreUp, ScoreDown, ScoreRecord].find(filename =>
                filename.split('/')!.pop()!.startsWith(key)
              )}
              type="audio/mp4"
            />
          </audio>
        ))}
      </>
    ),
    []
  );
}
