import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ItemView, Plugin, WorkspaceLeaf } from 'obsidian';
import { GalaxyBrainPanel } from './src/galaxybrain-panel';
import { GalaxyBrainGraphStore } from './src/graph-store';

export const VIEW_TYPE_GALAXYBRAIN = 'galaxybrain-view';
const ICON_NAME = 'git-fork';

class GalaxyBrainView extends ItemView {
  private readonly plugin: GalaxyBrainPlugin;
  private reactRoot: Root | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: GalaxyBrainPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_GALAXYBRAIN;
  }

  getDisplayText(): string {
    return 'GalaxyBrain';
  }

  getIcon(): string {
    return ICON_NAME;
  }

  async onOpen(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.addClass('galaxybrain-view__content');

    const mount = this.contentEl.createDiv({ cls: 'galaxybrain-view__mount' });
    this.reactRoot = createRoot(mount);
    this.reactRoot.render(createElement(GalaxyBrainPanel, {
      app: this.app,
      store: this.plugin.store,
    }));
  }

  async onClose(): Promise<void> {
    this.reactRoot?.unmount();
    this.reactRoot = null;
    this.contentEl.empty();
  }
}

export default class GalaxyBrainPlugin extends Plugin {
  readonly store = new GalaxyBrainGraphStore(this.app);

  async onload(): Promise<void> {
    this.registerView(
      VIEW_TYPE_GALAXYBRAIN,
      (leaf) => new GalaxyBrainView(leaf, this),
    );

    this.addRibbonIcon(ICON_NAME, 'Open GalaxyBrain', () => {
      void this.activateView();
    });

    this.addCommand({
      id: 'open-galaxybrain',
      name: 'Open GalaxyBrain',
      callback: () => {
        void this.activateView();
      },
    });

    void this.store.start();
  }

  onunload(): void {
    this.store.stop();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_GALAXYBRAIN);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_GALAXYBRAIN)[0];

    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({
        type: VIEW_TYPE_GALAXYBRAIN,
        active: true,
      });
    }

    workspace.revealLeaf(leaf);
  }
}
