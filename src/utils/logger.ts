import winston from "winston";
import path from "path";
import fs from "fs";

const LOG_DIR = path.join(process.cwd(), ".data", "logs");
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaString}`;
  })
);

export const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    // Write errors to error.log
    new winston.transports.File({
      filename: path.join(LOG_DIR, "error.log"),
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all events output combined.log
    new winston.transports.File({
      filename: path.join(LOG_DIR, "combined.log"),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
});

// Always append live terminal outputs in development and production
logger.add(
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), logFormat),
  })
);

export default logger;
