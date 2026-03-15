import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { App, TFile } from 'obsidian';
import { Settings2, WandSparkles } from 'lucide-react';
import InteractiveGraph, { type InteractiveGraphHandle } from '../../../src/components/InteractiveGraph';
import { applyColorPreset } from './color-presets';
import { applyGraphFilters } from './graph-filters';
import { GalaxyBrainGraphStore } from './graph-store';
import type { GraphFilterState } from './plugin-types';
import { resolveObsidianGraphThemeTokens } from './theme-tokens';
import type { GraphNode } from '../../../src/lib/types';
import type { GraphAnimationMode, GraphAnimationState } from '../../../src/lib/graph-ui';

interface GalaxyBrainPanelProps {
  app: App;
  store: GalaxyBrainGraphStore;
}

type SectionId = 'filters' | 'colors' | 'camera' | 'forces';

const FILTER_STORAGE_KEY = 'galaxybrain-preview-filters';
const DEFAULT_FILTERS: GraphFilterState = {
  searchQuery: '',
  recentOnly: false,
  recentDays: 7,
  recentBasis: 'modified',
  showTags: true,
  existingFilesOnly: false,
  showOrphans: true,
  ignoreCollapsible: false,
  showAllLabels: false,
  impactGlow: true,
  colorPreset: 'default',
  particleSpeed: 0.35,
  particleRandomness: 0.6,
  particleStyle: 'dot',
  particleTrailLength: 0.55,
  animationMode: 'none',
};
const DEFAULT_OPEN_SECTIONS: Record<SectionId, boolean> = {
  filters: true,
  colors: false,
  camera: false,
  forces: false,
};

function loadFilters(): GraphFilterState {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<GraphFilterState>;
    return {
      ...DEFAULT_FILTERS,
      ...parsed,
      searchQuery: '',
    };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function GalaxyBrainPanel({ app, store }: GalaxyBrainPanelProps) {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<InteractiveGraphHandle>(null);
  const activeSliderRef = useRef<{
    id: string;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    shell: HTMLDivElement;
  } | null>(null);
  const initialRenderRef = useRef(true);
  const animationMenuRef = useRef<HTMLDivElement>(null);
  const animationButtonRef = useRef<HTMLButtonElement>(null);
  const [themeTokens, setThemeTokens] = useState(() => resolveObsidianGraphThemeTokens());
  const [filters, setFilters] = useState<GraphFilterState>(() => loadFilters());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAnimationMenuOpen, setIsAnimationMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(DEFAULT_OPEN_SECTIONS);
  const [animationState, setAnimationState] = useState<GraphAnimationState>({ mode: 'none', running: false });
  const [activeSliderId, setActiveSliderId] = useState<string | null>(null);

  useEffect(() => {
    const updateTheme = () => setThemeTokens(resolveObsidianGraphThemeTokens());
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
    observer.observe(document.head, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    try {
      const persisted = {
        ...filters,
        searchQuery: '',
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Ignore storage failures.
    }
  }, [filters]);

  useEffect(() => {
    if (isSidebarOpen) {
      setIsAnimationMenuOpen(false);
    }
  }, [isSidebarOpen]);

  const filteredGraphData = useMemo(
    () => applyGraphFilters(snapshot, {
      searchQuery: filters.searchQuery,
      recentOnly: filters.recentOnly,
      recentDays: filters.recentDays,
      recentBasis: filters.recentBasis,
      showTags: filters.showTags,
      existingFilesOnly: filters.existingFilesOnly,
      showOrphans: filters.showOrphans,
      ignoreCollapsible: filters.ignoreCollapsible,
      showAllLabels: filters.showAllLabels,
      impactGlow: filters.impactGlow,
      colorPreset: filters.colorPreset,
      particleSpeed: filters.particleSpeed,
      particleRandomness: filters.particleRandomness,
      particleStyle: filters.particleStyle,
      particleTrailLength: filters.particleTrailLength,
      animationMode: 'none',
    }),
    [
      snapshot,
      filters.searchQuery,
      filters.recentOnly,
      filters.recentDays,
      filters.recentBasis,
      filters.showTags,
      filters.existingFilesOnly,
      filters.showOrphans,
      filters.ignoreCollapsible,
      filters.showAllLabels,
      filters.impactGlow,
    ],
  );

  const colorizedGraphData = useMemo(
    () => applyColorPreset(filteredGraphData, filters.colorPreset),
    [filteredGraphData, filters.colorPreset],
  );

  const activeFilterCount = [
    filters.searchQuery.trim().length > 0,
    filters.recentOnly !== DEFAULT_FILTERS.recentOnly,
    filters.recentOnly && filters.recentDays !== DEFAULT_FILTERS.recentDays,
    filters.recentOnly && filters.recentBasis !== DEFAULT_FILTERS.recentBasis,
    filters.showTags !== DEFAULT_FILTERS.showTags,
    filters.existingFilesOnly !== DEFAULT_FILTERS.existingFilesOnly,
    filters.showOrphans !== DEFAULT_FILTERS.showOrphans,
    filters.ignoreCollapsible !== DEFAULT_FILTERS.ignoreCollapsible,
    filters.showAllLabels !== DEFAULT_FILTERS.showAllLabels,
    filters.impactGlow !== DEFAULT_FILTERS.impactGlow,
    filters.colorPreset !== DEFAULT_FILTERS.colorPreset,
  ].filter(Boolean).length;

  const shellVars = useMemo(() => ({
    '--gb-background': themeTokens.background,
    '--gb-panel-bg': themeTokens.panelBackground,
    '--gb-panel-bg-muted': themeTokens.panelBackgroundMuted,
    '--gb-panel-border': themeTokens.panelBorder,
    '--gb-text': themeTokens.textNormal,
    '--gb-text-muted': themeTokens.textMuted,
    '--gb-accent': themeTokens.accent,
    '--gb-accent-hover': themeTokens.accentHover,
    '--gb-accent-text': themeTokens.accentText,
    '--gb-panel-top': '44px',
    '--gb-panel-right': '18px',
    '--gb-panel-header-pad-right': '10px',
    '--gb-panel-header-row-height': '44px',
  }) as CSSProperties, [themeTokens]);

  const setFilter = useCallback(<K extends keyof GraphFilterState>(key: K, value: GraphFilterState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);
  const toggleSection = useCallback((section: SectionId) => {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }, []);

  const handleOpenNode = useCallback(async (node: GraphNode) => {
    if (!node.path) return;

    const file = app.vault.getAbstractFileByPath(node.path);
    if (!(file instanceof TFile)) return;

    const leaf = app.workspace.getLeaf(true);
    await leaf.openFile(file);
  }, [app]);

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    graphRef.current?.stopAnimation();
    setAnimationState({ mode: 'none', running: false });
  }, [
    filters.searchQuery,
    filters.recentOnly,
    filters.recentDays,
    filters.recentBasis,
    filters.showTags,
    filters.existingFilesOnly,
    filters.showOrphans,
    filters.ignoreCollapsible,
    filters.showAllLabels,
  ]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!isAnimationMenuOpen) return;
      const target = event.target as Node | null;
      if (
        target &&
        (animationMenuRef.current?.contains(target) || animationButtonRef.current?.contains(target))
      ) {
        return;
      }
      setIsAnimationMenuOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isAnimationMenuOpen]);

  useEffect(() => {
    if (!activeSliderId) return;

    const roundToStep = (value: number, min: number, max: number, step: number) => {
      const clamped = Math.min(max, Math.max(min, value));
      if (step <= 0) return clamped;
      const precision = step < 1 ? Math.ceil(Math.log10(1 / step)) : 0;
      const stepped = Math.round((clamped - min) / step) * step + min;
      return Number(stepped.toFixed(precision));
    };

    const updateSlider = (clientX: number) => {
      const active = activeSliderRef.current;
      if (!active) return;

      const rect = active.shell.getBoundingClientRect();
      const ratio = rect.width <= 0
        ? 0
        : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const rawValue = active.min + ratio * (active.max - active.min);
      active.onChange(roundToStep(rawValue, active.min, active.max, active.step));
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateSlider(event.clientX);
    };

    const clearSlider = () => {
      activeSliderRef.current = null;
      setActiveSliderId(null);
    };

    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerup', clearSlider, true);
    window.addEventListener('pointercancel', clearSlider, true);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', clearSlider, true);
      window.removeEventListener('pointercancel', clearSlider, true);
    };
  }, [activeSliderId]);

  const activateAnimationMode = useCallback((mode: GraphAnimationMode) => {
    graphRef.current?.stopAnimation();
    setFilter('animationMode', mode);
    setIsAnimationMenuOpen(false);

    if (mode === 'none') {
      setAnimationState({ mode: 'none', running: false });
      return;
    }

    if (mode === 'camera-tour') {
      graphRef.current?.startCameraTour();
      return;
    }

    graphRef.current?.startOrbitSettleAnimation();
  }, [setFilter]);

  const animationTooltip = useMemo(() => {
    if (animationState.running) return 'Stop animation';
    return 'Select animation';
  }, [animationState.running]);

  const renderSlider = ({
    id,
    label,
    value,
    onChange,
    formatValue,
    min = 0,
    max = 100,
    step = 1,
  }: {
    id: string;
    label: string;
    value: number;
    onChange: (value: number) => void;
    formatValue: (value: number) => string;
    min?: number;
    max?: number;
    step?: number;
  }) => {
    const clampedValue = Math.min(max, Math.max(min, value));
    const percent = ((clampedValue - min) / Math.max(max - min, 1)) * 100;
    const thumbLeft = `calc(${percent}% - 9px)`;

    return (
      <div className="galaxybrain-slider-field">
        <div className="galaxybrain-slider-label">{label}</div>
        <div className="galaxybrain-slider-wrap">
          {activeSliderId === id ? (
            <div
              className="galaxybrain-slider-bubble"
              style={{ left: `${percent}%` }}
            >
              {formatValue(clampedValue)}
            </div>
          ) : null}
          <div
            className="galaxybrain-slider-shell"
            onPointerDown={(event) => {
              const shell = event.currentTarget;
              const rect = shell.getBoundingClientRect();
              const ratio = rect.width <= 0
                ? 0
                : Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
              const rawValue = min + ratio * (max - min);
              activeSliderRef.current = {
                id,
                min,
                max,
                step,
                onChange,
                shell,
              };
              setActiveSliderId(id);
              onChange(rawValue);
            }}
            role="slider"
            aria-label={label}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={clampedValue}
            tabIndex={0}
          >
            <div className="galaxybrain-slider-rail" />
            <div
              className="galaxybrain-slider-thumb"
              style={{ left: thumbLeft }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSection = (
    section: SectionId,
    title: string,
    content: ReactNode | null,
    options?: { withHeaderActions?: boolean },
  ) => (
    <section className="galaxybrain-section" key={section}>
      <div className={`galaxybrain-accordion${openSections[section] ? ' is-open' : ''}${options?.withHeaderActions ? ' galaxybrain-accordion--with-actions' : ''}`}>
        <button
          className="galaxybrain-accordion__trigger"
          onClick={() => {
            graphRef.current?.stopAnimation();
            toggleSection(section);
          }}
          type="button"
        >
          <svg className="galaxybrain-accordion__chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span>{title}</span>
        </button>
        {options?.withHeaderActions ? (
          <div className="galaxybrain-accordion__actions">
            <button
              className="galaxybrain-icon-button"
              onClick={() => {
                graphRef.current?.stopAnimation();
                setFilters(DEFAULT_FILTERS);
                setOpenSections(DEFAULT_OPEN_SECTIONS);
              }}
              title="Reset filters"
              type="button"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v6h6" />
              </svg>
            </button>
            <button
              className="galaxybrain-icon-button"
              onClick={() => {
                graphRef.current?.stopAnimation();
                setIsSidebarOpen(false);
              }}
              title="Close filters"
              type="button"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
      {openSections[section] && content ? <div className="galaxybrain-accordion__body">{content}</div> : null}
    </section>
  );

  const sidebar = (
    <aside className="galaxybrain-sidebar galaxybrain-sidebar--floating">
      {renderSection('filters', 'Filters', (
        <>
          <label className="galaxybrain-sidebar__label" htmlFor="galaxybrain-search">Search files</label>
          <input
            id="galaxybrain-search"
            className="galaxybrain-search-input"
            type="text"
            placeholder="type path tags"
            value={filters.searchQuery}
            onChange={(event) => setFilter('searchQuery', event.target.value)}
          />
          <label className="galaxybrain-toggle-row">
            <span>Recent notes only</span>
            <span className="galaxybrain-toggle">
              <input
                className="galaxybrain-toggle__input"
                type="checkbox"
                checked={filters.recentOnly}
                onChange={(event) => setFilter('recentOnly', event.target.checked)}
              />
              <span className="galaxybrain-toggle__switch" aria-hidden="true" />
            </span>
          </label>
          {filters.recentOnly ? (
            <div className="galaxybrain-subsection">
              <label className="galaxybrain-sidebar__label" htmlFor="galaxybrain-recent-days">Last N days</label>
              <input
                id="galaxybrain-recent-days"
                className="galaxybrain-number-input"
                type="number"
                min={1}
                max={365}
                step={1}
                value={filters.recentDays}
                onChange={(event) => {
                  const raw = Number(event.target.value);
                  setFilter('recentDays', Number.isFinite(raw) ? Math.min(365, Math.max(1, Math.round(raw))) : 1);
                }}
              />
              <div className="galaxybrain-sidebar__label">Recent basis</div>
              <label className="galaxybrain-radio-row">
                <span>Modified</span>
                <input
                  type="radio"
                  name="galaxybrain-recent-basis"
                  checked={filters.recentBasis === 'modified'}
                  onChange={() => setFilter('recentBasis', 'modified')}
                />
              </label>
              <label className="galaxybrain-radio-row">
                <span>Created</span>
                <input
                  type="radio"
                  name="galaxybrain-recent-basis"
                  checked={filters.recentBasis === 'created'}
                  onChange={() => setFilter('recentBasis', 'created')}
                />
              </label>
            </div>
          ) : null}
          <label className="galaxybrain-toggle-row">
            <span>Show tags</span>
            <span className="galaxybrain-toggle">
              <input className="galaxybrain-toggle__input" type="checkbox" checked={filters.showTags} onChange={(event) => setFilter('showTags', event.target.checked)} />
              <span className="galaxybrain-toggle__switch" aria-hidden="true" />
            </span>
          </label>
          <label className="galaxybrain-toggle-row">
            <span>Existing files only</span>
            <span className="galaxybrain-toggle">
              <input className="galaxybrain-toggle__input" type="checkbox" checked={filters.existingFilesOnly} onChange={(event) => setFilter('existingFilesOnly', event.target.checked)} />
              <span className="galaxybrain-toggle__switch" aria-hidden="true" />
            </span>
          </label>
          <label className="galaxybrain-toggle-row">
            <span>Show orphans</span>
            <span className="galaxybrain-toggle">
              <input className="galaxybrain-toggle__input" type="checkbox" checked={filters.showOrphans} onChange={(event) => setFilter('showOrphans', event.target.checked)} />
              <span className="galaxybrain-toggle__switch" aria-hidden="true" />
            </span>
          </label>
          <label className="galaxybrain-toggle-row">
            <span>Ignore collapsible</span>
            <span className="galaxybrain-toggle">
              <input className="galaxybrain-toggle__input" type="checkbox" checked={filters.ignoreCollapsible} onChange={(event) => setFilter('ignoreCollapsible', event.target.checked)} />
              <span className="galaxybrain-toggle__switch" aria-hidden="true" />
            </span>
          </label>
          <label className="galaxybrain-toggle-row">
            <span>Show all labels</span>
            <span className="galaxybrain-toggle">
              <input className="galaxybrain-toggle__input" type="checkbox" checked={filters.showAllLabels} onChange={(event) => setFilter('showAllLabels', event.target.checked)} />
              <span className="galaxybrain-toggle__switch" aria-hidden="true" />
            </span>
          </label>
          <label className="galaxybrain-toggle-row">
            <span>Impact glow</span>
            <span className="galaxybrain-toggle">
              <input className="galaxybrain-toggle__input" type="checkbox" checked={filters.impactGlow} onChange={(event) => setFilter('impactGlow', event.target.checked)} />
              <span className="galaxybrain-toggle__switch" aria-hidden="true" />
            </span>
          </label>
        </>
      ), { withHeaderActions: true })}

      {renderSection('colors', 'Colors', (
        <div className="galaxybrain-slider-group">
          <div className="galaxybrain-sidebar__label">Palette preset</div>
          <label className="galaxybrain-radio-row">
            <span>Default</span>
            <input
              type="radio"
              name="galaxybrain-color-preset"
              checked={filters.colorPreset === 'default'}
              onChange={() => setFilter('colorPreset', 'default')}
            />
          </label>
          <label className="galaxybrain-radio-row">
            <span>Ocean</span>
            <input
              type="radio"
              name="galaxybrain-color-preset"
              checked={filters.colorPreset === 'ocean'}
              onChange={() => setFilter('colorPreset', 'ocean')}
            />
          </label>
          <label className="galaxybrain-radio-row">
            <span>Ember</span>
            <input
              type="radio"
              name="galaxybrain-color-preset"
              checked={filters.colorPreset === 'ember'}
              onChange={() => setFilter('colorPreset', 'ember')}
            />
          </label>
          <label className="galaxybrain-radio-row">
            <span>Forest</span>
            <input
              type="radio"
              name="galaxybrain-color-preset"
              checked={filters.colorPreset === 'forest'}
              onChange={() => setFilter('colorPreset', 'forest')}
            />
          </label>
          <label className="galaxybrain-radio-row">
            <span>Graphite</span>
            <input
              type="radio"
              name="galaxybrain-color-preset"
              checked={filters.colorPreset === 'graphite'}
              onChange={() => setFilter('colorPreset', 'graphite')}
            />
          </label>
        </div>
      ))}

      {renderSection('camera', 'Camera', (
        <div className="galaxybrain-placeholder">
          <button className="galaxybrain-chip-button" onClick={() => {
            graphRef.current?.stopAnimation();
            graphRef.current?.fitToGraph();
          }} type="button">
            Fit view
          </button>
          <button className="galaxybrain-chip-button" onClick={() => {
            graphRef.current?.stopAnimation();
            graphRef.current?.resetCamera();
          }} type="button">
            Reset view
          </button>
        </div>
      ))}

      {renderSection('forces', 'Forces', (
        <div className="galaxybrain-slider-group">
          <div className="galaxybrain-sidebar__label">Particle style</div>
          <label className="galaxybrain-radio-row">
            <span>Dot</span>
            <input
              type="radio"
              name="galaxybrain-particle-style"
              checked={filters.particleStyle === 'dot'}
              onChange={() => setFilter('particleStyle', 'dot')}
            />
          </label>
          <label className="galaxybrain-radio-row">
            <span>Trail</span>
            <input
              type="radio"
              name="galaxybrain-particle-style"
              checked={filters.particleStyle === 'trail'}
              onChange={() => setFilter('particleStyle', 'trail')}
            />
          </label>
          {renderSlider({
            id: 'galaxybrain-particle-speed',
            label: 'Particle speed',
            value: filters.particleSpeed,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (value) => setFilter('particleSpeed', value),
            formatValue: (value) => (0.0015 + value * 0.0105).toFixed(3),
          })}
          {renderSlider({
            id: 'galaxybrain-particle-randomness',
            label: 'Particle randomness',
            value: filters.particleRandomness,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (value) => setFilter('particleRandomness', value),
            formatValue: (value) => value.toFixed(2),
          })}
          {renderSlider({
            id: 'galaxybrain-trail-length',
            label: 'Trail length',
            value: filters.particleTrailLength,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: (value) => setFilter('particleTrailLength', value),
            formatValue: (value) => `${(0.55 + value * 1.45).toFixed(2)}x`,
          })}
        </div>
      ))}
    </aside>
  );

  return (
    <div
      ref={rootRef}
      className="galaxybrain-shell"
      style={shellVars}
    >
      <div className="galaxybrain-shell__graph">
        <div className="galaxybrain-floating-stack">
          <button
            className={`galaxybrain-floating-button galaxybrain-floating-button--icon${isSidebarOpen ? ' is-hidden' : ''}`}
            onClick={() => {
              setIsAnimationMenuOpen(false);
              graphRef.current?.stopAnimation();
              setIsSidebarOpen(true);
            }}
            title="Open filters"
            type="button"
          >
            <Settings2 size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            ref={animationButtonRef}
            className={`galaxybrain-floating-button galaxybrain-floating-button--icon${animationState.running ? ' is-active' : ''}${!animationState.running && filters.animationMode !== 'none' ? ' is-armed' : ''}${isAnimationMenuOpen ? ' is-open' : ''}`}
            onClick={() => {
              if (animationState.running) {
                graphRef.current?.stopAnimation();
                setIsAnimationMenuOpen(false);
                return;
              }

              if (isSidebarOpen) {
                setIsSidebarOpen(false);
              }
              setIsAnimationMenuOpen((current) => !current);
            }}
            title={animationTooltip}
            type="button"
          >
            <WandSparkles size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          {isAnimationMenuOpen ? (
            <div ref={animationMenuRef} className="galaxybrain-animation-menu">
              <div className="galaxybrain-animation-menu__label">Animation</div>
              <label className="galaxybrain-radio-row">
                <span>None</span>
                <input
                  type="radio"
                  name="galaxybrain-animation-mode-popup"
                  checked={filters.animationMode === 'none'}
                  onChange={() => activateAnimationMode('none')}
                />
              </label>
              <label className="galaxybrain-radio-row">
                <span>Camera tour</span>
                <input
                  type="radio"
                  name="galaxybrain-animation-mode-popup"
                  checked={filters.animationMode === 'camera-tour'}
                  onChange={() => activateAnimationMode('camera-tour')}
                />
              </label>
              <label className="galaxybrain-radio-row">
                <span>Orbit</span>
                <input
                  type="radio"
                  name="galaxybrain-animation-mode-popup"
                  checked={filters.animationMode === 'orbit-settle'}
                  onChange={() => activateAnimationMode('orbit-settle')}
                />
              </label>
            </div>
          ) : null}
        </div>

        <InteractiveGraph
          ref={graphRef}
          graphData={colorizedGraphData}
          themeTokens={themeTokens}
          emptyMessage={snapshot ? 'No notes match current filters.' : 'No markdown notes found in this vault.'}
          hintText="Click note → focus | Shift+click → collapse | Click tag → filter | Right-click note → menu | Drag to rotate"
          nodePrimaryAction="focus"
          showNodeContextMenu={true}
          ignoreCollapsible={filters.ignoreCollapsible}
          showAllLabels={filters.showAllLabels}
          impactGlow={filters.impactGlow}
          particleSpeed={filters.particleSpeed}
          particleRandomness={filters.particleRandomness}
          particleStyle={filters.particleStyle}
          particleTrailLength={filters.particleTrailLength}
          showInlineLabelToggle={false}
          onOpenNode={handleOpenNode}
          onAnimationStateChange={setAnimationState}
        />
      </div>
      {isSidebarOpen ? sidebar : null}
    </div>
  );
}
