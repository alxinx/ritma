import { createClient } from "redis";
import { LogErrores } from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', async (err) => {
    try {
        await LogErrores.create({
            modulo: 'RTM-DB-REDIS',
            nivel: 'CRITICAL',
            error: `REDIS ERROR: ${err.message}`,
            stack: err.stack
        });
    } catch (logError) {
        console.error('Error logging Redis error:', logError);
    }

    console.error('Redis error:', err);
});

export default redisClient;
