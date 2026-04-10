import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres@localhost:5432/weekly_tracking',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
};
