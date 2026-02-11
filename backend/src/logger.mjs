import winston from "winston";

const { combine, timestamp, errors, json } = winston.format;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: {
    service: "baeun-api",
    env: process.env.NODE_ENV || "development",
  },
  transports: [new winston.transports.Console()],
});

export default logger;
