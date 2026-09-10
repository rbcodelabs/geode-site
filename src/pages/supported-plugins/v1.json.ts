import type { APIRoute } from 'astro';
import { supportedPluginsRegistry } from '../../lib/supportedPlugins.mjs';

export const GET = (() =>
  new Response(`${JSON.stringify(supportedPluginsRegistry, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })) satisfies APIRoute;
