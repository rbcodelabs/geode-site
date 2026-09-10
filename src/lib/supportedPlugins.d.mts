export type SupportedPluginPlatform = 'desktop' | 'mobile';
export type SupportedPluginStatus = 'active' | 'withdrawn';

export interface SupportedPlugin {
  id: string;
  name: string;
  description: string;
  github: { owner: string; repo: string };
  manifest: { version: string; releaseTag: string; minAppVersion: string };
  platforms: SupportedPluginPlatform[];
  minimumGeodeVersion: string;
  certifiedWithGeodeVersion: string;
  artifactHashes: {
    'main.js': string;
    'manifest.json': string;
    'styles.css'?: string;
  };
  evidenceUrl: string;
  status: SupportedPluginStatus;
}

export interface SupportedPluginsRegistry {
  schemaVersion: 1;
  plugins: SupportedPlugin[];
}

export function validateSupportedPluginsRegistry(value: unknown): SupportedPluginsRegistry;
export const supportedPluginsRegistry: SupportedPluginsRegistry;
