import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { Config } from './config';

let logger: winston.Logger;

export function initLogger(config: Config): winston.Logger {
  if (logger) {
    return logger;
  }

  const logDir = config.logDir;
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const logFile = path.join(logDir, `epic-claimer-${timestamp}.log`);

  logger = winston.createLogger({
    level: config.logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    defaultMeta: { service: 'epic-claimer' },
    transports: [
      new winston.transports.File({ filename: logFile }),
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
      }),
    ],
  });

  if (process.env.NODE_ENV !== 'production') {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level}]: ${message}`;
          })
        ),
      })
    );
  }

  return logger;
}

export function getLogger(): winston.Logger {
  if (!logger) {
    throw new Error('Logger not initialized. Call initLogger first.');
  }
  return logger;
}
