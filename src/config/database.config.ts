import 'dotenv/config';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { getAppConfig } from './app.config';
import { Agent } from '../agents/entities/agent.entity';
import { Solution } from '../solutions/entities/solution.entity';
import { Feedback } from '../feedback/entities/feedback.entity';
import { AuditLog } from '../common/entities/audit-log.entity';

const appConfig = getAppConfig();

function buildDataSourceOptions(includeMigrations: boolean): DataSourceOptions {
  return {
    type: 'postgres',
    host: appConfig.databaseHost,
    port: appConfig.databasePort,
    username: appConfig.databaseUser,
    password: appConfig.databasePassword,
    database: appConfig.databaseName,
    entities: [Agent, Solution, Feedback, AuditLog],
    migrations: includeMigrations ? ['migrations/*.ts'] : [],
    synchronize: false,
    logging: appConfig.nodeEnv !== 'production',
  };
}

export const dataSourceOptions: DataSourceOptions = buildDataSourceOptions(false);
export const migrationDataSourceOptions: DataSourceOptions =
  buildDataSourceOptions(true);

const dataSource = new DataSource(migrationDataSourceOptions);

export default dataSource;
