/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_META_PIXEL_ID: string | undefined;
  readonly VITE_PRIVACY_POLICY_VERSION: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
