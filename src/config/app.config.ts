import { registerAs } from '@nestjs/config';

export interface AppConfig {
  databaseHost: string;
  databasePort: number;
  databaseName: string;
  databaseUser: string;
  databasePassword: string;
  port: number;
  nodeEnv: string;
}

function getNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const getAppConfig = (): AppConfig => ({
  databaseHost: process.env.DATABASE_HOST ?? 'localhost',
  databasePort: getNumber(process.env.DATABASE_PORT, 5432),
  databaseName: process.env.DATABASE_NAME ?? 'agentoverflow',
  databaseUser: process.env.DATABASE_USER ?? 'agentoverflow',
  databasePassword: process.env.DATABASE_PASSWORD ?? '',
  port: getNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
});

export default registerAs('app', getAppConfig);
