// Type declarations to help with certain TypeScript issues
declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    NODE_ENV?: string;
    PROJECT_ID: string;
    DATASET_ID: string;
    GOOGLE_APPLICATION_CREDENTIALS: string;
    CORS_ORIGIN?: string;
  }
}

// Fix for string types
interface String {
  toString(): string;
} 