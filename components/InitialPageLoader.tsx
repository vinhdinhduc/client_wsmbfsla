'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  INITIAL_LOADER_CURTAIN_MS,
  INITIAL_LOADER_FADE_MS,
  INITIAL_LOADER_FINISH_MS,
  INITIAL_LOADER_MAX_MS,
  INITIAL_LOADER_MIN_MS,
} from '@/lib/initial-loader';
import styles from './InitialPageLoader.module.scss';

/** The bootstrap controls first paint; React owns progress, readiness and removal. */
export default function InitialPageLoader({ routeLoading }: { routeLoading: boolean }) {
  const pending = useRef(routeLoading);
  pending.current = routeLoading;
  const [present, setPresent] = useState(true);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'complete' | 'opening'>('loading');

  useEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.initialLoader) {
      setPresent(false);
      return;
    }

    window.clearTimeout(Number(root.dataset.initialLoaderTimeout));
    delete root.dataset.initialLoaderTimeout;
    const started =
      root.dataset.initialLoaderStarted === undefined
        ? performance.now()
        : Number(root.dataset.initialLoaderStarted);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let disposed = false;
    let ready = false;
    let finishing = false;
    let finishTimer: number | undefined;
    let removalTimer: number | undefined;

    const remove = () => {
      delete root.dataset.initialLoader;
      delete root.dataset.initialLoaderStarted;
      root.style.removeProperty('--initial-loader-gutter');
      if (!disposed) setPresent(false);
    };
    const open = () => {
      root.dataset.initialLoader = 'opening';
      setPhase('opening');
      // transitionend normally removes it; this also works in background tabs.
      removalTimer = window.setTimeout(
        remove,
        (reducedMotion ? INITIAL_LOADER_FADE_MS : INITIAL_LOADER_CURTAIN_MS) + 50,
      );
    };
    const finish = () => {
      if (disposed || finishing) return;
      finishing = true;
      window.clearInterval(simulation);
      window.clearTimeout(safetyTimer);
      setProgress(100);
      setPhase('complete');
      if (reducedMotion) open();
      else finishTimer = window.setTimeout(open, INITIAL_LOADER_FINISH_MS);
    };
    const check = () => {
      if (ready && !pending.current && performance.now() - started >= INITIAL_LOADER_MIN_MS) {
        finish();
      }
    };
    const simulation = window.setInterval(() => {
      setProgress((value) => Math.min(90, value + Math.max(0.5, (90 - value) * 0.12)));
      check();
    }, 120);
    const safetyTimer = window.setTimeout(
      finish,
      Math.max(0, INITIAL_LOADER_MAX_MS - (performance.now() - started)),
    );
    let onLoad: (() => void) | undefined;
    const loaded =
      document.readyState === 'complete'
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            onLoad = resolve;
            window.addEventListener('load', onLoad, { once: true });
          });
    const fonts = document.fonts?.ready ?? Promise.resolve();
    Promise.all([loaded, fonts.catch(() => undefined)]).then(() => {
      if (disposed) return;
      ready = true;
      check();
    });

    if (root.dataset.initialLoader === 'opening') {
      finishing = true;
      window.clearInterval(simulation);
      window.clearTimeout(safetyTimer);
      setProgress(100);
      open();
    }

    return () => {
      disposed = true;
      window.clearInterval(simulation);
      window.clearTimeout(safetyTimer);
      window.clearTimeout(finishTimer);
      window.clearTimeout(removalTimer);
      if (onLoad) window.removeEventListener('load', onLoad);
      // Keep the bootstrap flag through React Strict Mode's effect replay.
      // The persistent root provider only unmounts on document teardown.
    };
  }, []);

  if (!present) return null;

  return (
    <div
      className={styles.screen}
      data-initial-page-loader=""
      data-phase={phase}
      onTransitionEnd={(event) => {
        if (event.target !== event.currentTarget || phase !== 'opening') return;
        const property = event.propertyName;
        if (property !== 'transform' && property !== 'opacity') return;
        delete document.documentElement.dataset.initialLoader;
        delete document.documentElement.dataset.initialLoaderStarted;
        document.documentElement.style.removeProperty('--initial-loader-gutter');
        setPresent(false);
      }}
    >
      <div className={styles.content}>
        <Image
          className={styles.logo}
          src="/logo.png"
          alt="MobiFone"
          width={698}
          height={129}
          unoptimized
        />
        <p className={styles.caption} role="status">
          Đang tải trang…
        </p>
        <div
          className={styles.track}
          role="progressbar"
          aria-label="Tiến trình tải trang"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span className={styles.fill} style={{ transform: `scaleX(${progress / 100})` }} />
        </div>
        <span className={styles.percent} aria-hidden="true">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}
