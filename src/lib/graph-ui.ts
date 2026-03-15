export type GraphAnimationMode = 'none' | 'camera-tour' | 'orbit-settle';
export type GraphParticleStyle = 'dot' | 'trail';

export interface GraphAnimationState {
  mode: GraphAnimationMode;
  running: boolean;
}

export interface GraphThemeTokens {
  mode: 'dark' | 'light';
  fontFamily: string;
  background: string;
  panelBackground: string;
  panelBackgroundMuted: string;
  panelBorder: string;
  textNormal: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentText: string;
  error: string;
  labelText: string;
  labelOutline: string;
  calloutBackground: string;
  calloutText: string;
}

export function createDefaultGraphThemeTokens(mode: 'dark' | 'light'): GraphThemeTokens {
  if (mode === 'light') {
    return {
      mode,
      fontFamily: 'sans-serif',
      background: '#f5f5f5',
      panelBackground: 'rgba(240,240,240,0.9)',
      panelBackgroundMuted: 'rgba(255,255,255,0.76)',
      panelBorder: 'rgba(0,0,0,0.12)',
      textNormal: '#111111',
      textMuted: 'rgba(17,17,17,0.62)',
      accent: '#2d72d9',
      accentHover: '#1f5cb7',
      accentText: '#ffffff',
      error: '#c23b30',
      labelText: '#111111',
      labelOutline: 'rgba(255,255,255,0.92)',
      calloutBackground: 'rgba(220,235,255,0.94)',
      calloutText: '#1a5fa8',
    };
  }

  return {
    mode,
    fontFamily: 'sans-serif',
    background: '#0a0a0a',
    panelBackground: 'rgba(20,20,20,0.9)',
    panelBackgroundMuted: 'rgba(0,0,0,0.55)',
    panelBorder: 'rgba(255,255,255,0.12)',
    textNormal: '#e0e0e0',
    textMuted: 'rgba(224,224,224,0.62)',
    accent: '#5aa0ff',
    accentHover: '#7fb6ff',
    accentText: '#08111f',
    error: '#ff6b6b',
    labelText: '#f2f4f8',
    labelOutline: 'rgba(0,0,0,0.8)',
    calloutBackground: 'rgba(10,30,60,0.88)',
    calloutText: '#74b9ff',
  };
}
