const winston = require('winston');

// Define logging levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Define the format for the logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }), // Apply colors to all log levels
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define the "transports" (where logs will be sent)
const transports = [
  // Always log to the console
  new winston.transports.Console({
    format: logFormat,
  }),
  
  // You can also add file transports for production
  // new winston.transports.File({
  //   filename: 'logs/error.log',
  //   level: 'error',
  // }),
  // new winston.transports.File({ filename: 'logs/all.log' }),
];

// Create the logger instance
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'debug', // Set the most verbose level
  transports,
  format: winston.format.combine(winston.format.errors({ stack: true })), // Ensure error stacks are logged
  exitOnError: false, // Do not exit on handled exceptions
});

// Create a stream object with a 'write' function that winston can use
// This is to pipe Morgan's HTTP request logs into our Winston logger
logger.stream = {
  write: (message) => {
    logger.http(message.substring(0, message.lastIndexOf('\n')));
  },
};

module.exports = logger;