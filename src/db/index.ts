import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from '../config/database';

export const db = drizzle(sql);
