/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_CONTROL_CENTER_URL?: string;
  readonly VITE_WEBSITE_CONNECTOR_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
