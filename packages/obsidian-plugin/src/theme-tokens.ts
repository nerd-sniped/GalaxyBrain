import { createDefaultGraphThemeTokens, type GraphThemeTokens } from '../../../src/lib/graph-ui';

function readCssVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
  return style.getPropertyValue(name).trim() || fallback;
}

export function resolveObsidianGraphThemeTokens(): GraphThemeTokens {
  const mode: 'dark' | 'light' = document.body.classList.contains('theme-light')
    ? 'light'
    : 'dark';
  const fallback = createDefaultGraphThemeTokens(mode);
  const styles = getComputedStyle(document.body);

  return {
    mode,
    fontFamily:
      readCssVar(styles, '--font-text', '') ||
      readCssVar(styles, '--font-interface', '') ||
      styles.fontFamily ||
      fallback.fontFamily,
    background: readCssVar(styles, '--background-primary', fallback.background),
    panelBackground: readCssVar(styles, '--background-secondary', fallback.panelBackground),
    panelBackgroundMuted: readCssVar(styles, '--background-modifier-form-field', fallback.panelBackgroundMuted),
    panelBorder: readCssVar(styles, '--background-modifier-border', fallback.panelBorder),
    textNormal: readCssVar(styles, '--text-normal', fallback.textNormal),
    textMuted: readCssVar(styles, '--text-muted', fallback.textMuted),
    accent: readCssVar(styles, '--interactive-accent', fallback.accent),
    accentHover: readCssVar(styles, '--interactive-accent-hover', fallback.accentHover),
    accentText: readCssVar(styles, '--text-on-accent', fallback.accentText),
    error: readCssVar(styles, '--text-error', fallback.error),
    labelText: readCssVar(styles, '--text-normal', fallback.labelText),
    labelOutline: readCssVar(styles, '--background-primary', fallback.labelOutline),
    calloutBackground: readCssVar(styles, '--background-secondary', fallback.calloutBackground),
    calloutText: readCssVar(styles, '--interactive-accent', fallback.calloutText),
  };
}
