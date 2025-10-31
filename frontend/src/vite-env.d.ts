/// <reference types="vite/client" />

interface ImportMetaEnv {
  DEV: any;
  readonly VITE_API_BASE_URL: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

