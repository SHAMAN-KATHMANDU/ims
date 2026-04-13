declare namespace NodeJS {
  interface ProcessEnv {
    /** Server-to-server API URL (used inside the docker network). */
    API_INTERNAL_URL: string;
    /** Public-facing API URL (used for absolute links in rendered HTML). */
    API_PUBLIC_URL: string;
    /** Shared secret for /api/v1/internal/* calls. */
    INTERNAL_API_TOKEN: string;
    /** Shared secret for the tenant-site /api/revalidate endpoint. */
    REVALIDATE_SECRET: string;
  }
}

export {};
