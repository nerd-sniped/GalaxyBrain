import type { EventRef } from 'obsidian';
import { App, TAbstractFile, TFile } from 'obsidian';
import { buildGraphData } from '../../../src/lib/graph-core';
import { parseVaultNote } from '../../../src/lib/vault-parser';
import type { ParsedNote } from '../../../src/lib/types';
import type { GalaxyBrainGraphSnapshot } from './plugin-types';

export class GalaxyBrainGraphStore {
  private readonly app: App;
  private readonly listeners = new Set<() => void>();
  private readonly eventRefs: EventRef[] = [];
  private snapshot: GalaxyBrainGraphSnapshot | null = null;
  private rebuildTimer: number | null = null;
  private started = false;

  constructor(app: App) {
    this.app = app;
  }

  getSnapshot = (): GalaxyBrainGraphSnapshot | null => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    this.eventRefs.push(
      this.app.vault.on('create', (file) => this.onVaultChange(file)),
      this.app.vault.on('modify', (file) => this.onVaultChange(file)),
      this.app.vault.on('delete', (file) => this.onVaultChange(file)),
      this.app.vault.on('rename', (file, oldPath) => this.onVaultChange(file, oldPath)),
    );

    await this.rebuild();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;

    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
      this.rebuildTimer = null;
    }

    this.eventRefs.splice(0).forEach((ref) => this.app.vault.offref(ref));
    this.listeners.clear();
  }

  private onVaultChange(file: TAbstractFile, oldPath?: string): void {
    if (!this.shouldRebuildFor(file, oldPath)) return;

    if (this.rebuildTimer !== null) {
      window.clearTimeout(this.rebuildTimer);
    }

    this.rebuildTimer = window.setTimeout(() => {
      this.rebuildTimer = null;
      void this.rebuild();
    }, 180);
  }

  private shouldRebuildFor(file: TAbstractFile, oldPath?: string): boolean {
    if (file instanceof TFile) {
      return file.extension === 'md';
    }
    return Boolean(oldPath?.toLowerCase().endsWith('.md'));
  }

  private async rebuild(): Promise<void> {
    const notes: ParsedNote[] = [];
    const noteMetadataEntries: GalaxyBrainGraphSnapshot['noteMetadata'] extends Map<infer K, infer V>
      ? Array<[K, V]>
      : never = [];

    for (const file of this.app.vault.getMarkdownFiles()) {
      try {
        const raw = await this.app.vault.cachedRead(file);
        const note = parseVaultNote(raw, file.path);
        notes.push(note);
        noteMetadataEntries.push([
          note.id,
          {
            id: note.id,
            title: note.frontmatter.title ?? note.id,
            relativePath: note.relativePath,
            tags: note.tags,
            createdAt: file.stat.ctime,
            modifiedAt: file.stat.mtime,
          },
        ]);
      } catch (error) {
        console.warn(`[galaxybrain-preview] Failed to read ${file.path}:`, error);
      }
    }

    this.snapshot = {
      graphData: buildGraphData(notes, {
        visibility: 'all',
        includeCallouts: false,
        mapNotePath: (note) => note.relativePath,
      }),
      noteMetadata: new Map(noteMetadataEntries),
    };

    this.listeners.forEach((listener) => listener());
  }
}
