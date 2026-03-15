import { useEffect, useMemo, useState } from 'react';
import { createDefaultGraphThemeTokens } from '../lib/graph-ui';
import type { GraphData, GraphNode } from '../lib/types';
import { withPublicBase } from '../lib/public-path';
import InteractiveGraph from './InteractiveGraph';

const STORAGE_KEY = 'theme';
const LABELS_STORAGE_KEY = 'gb-show-all-labels';

/**
 * Set to false once you've replaced the default template content with your
 * own notes and no longer want the "Build your own" prompt to appear.
 */
const SHOW_BUILD_CTA = true;

function BuildCta({
  isDark,
  onDismiss,
}: {
  isDark: boolean;
  onDismiss: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 62,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: isDark ? 'rgba(15,25,40,0.92)' : 'rgba(230,240,255,0.95)',
        border: '1px solid #3498db66',
        borderRadius: 14,
        padding: '12px 16px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 6px 32px rgba(52,152,219,0.22)',
        fontFamily: 'sans-serif',
        animation: 'gb-fadein 0.4s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 13, color: isDark ? '#b0cfe8' : '#1a5fa8' }}>
        Need setup instructions?
      </span>
      <a
        href="https://github.com/nerd-sniped/GalaxyBrain#readme"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: '#3498db',
          border: 'none',
          borderRadius: 8,
          padding: '6px 14px',
          cursor: 'pointer',
          textDecoration: 'none',
          transition: 'background 0.15s',
        }}
      >
        Open README →
      </a>
      <button
        onPointerDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onDismiss();
        }}
        style={{
          background: 'transparent',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}`,
          color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
          borderRadius: 8,
          width: 26,
          height: 26,
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export default function FullGraph() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(withPublicBase('/graph.json'))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<GraphData>;
      })
      .then(setGraphData)
      .catch((error: unknown) => setLoadError(String(error)));
  }, []);

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) ?? 'dark') !== 'light';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<{ theme: string }>).detail;
      setIsDark(detail.theme !== 'light');
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setIsDark((event.newValue ?? 'dark') !== 'light');
      }
    };

    window.addEventListener('theme-change', onThemeChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('theme-change', onThemeChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const [showAllLabels, setShowAllLabels] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LABELS_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LABELS_STORAGE_KEY, String(showAllLabels));
    } catch {
      // Ignore storage failures in restricted contexts.
    }
  }, [showAllLabels]);

  const calloutTarget = useMemo(
    () => graphData?.nodes.find((node) => node.callout) ?? null,
    [graphData],
  );
  const themeTokens = useMemo(
    () => createDefaultGraphThemeTokens(isDark ? 'dark' : 'light'),
    [isDark],
  );

  return (
    <InteractiveGraph
      graphData={graphData}
      themeTokens={themeTokens}
      loadError={loadError}
      buildCta={SHOW_BUILD_CTA ? (dismiss) => <BuildCta isDark={isDark} onDismiss={dismiss} /> : null}
      calloutNodeId={calloutTarget?.id ?? null}
      calloutLabel={calloutTarget?.calloutText}
      showAllLabels={showAllLabels}
      onShowAllLabelsChange={setShowAllLabels}
      showInlineLabelToggle={true}
      onOpenNode={(node: GraphNode) => {
        if (node.path) window.location.href = node.path;
      }}
    />
  );
}
