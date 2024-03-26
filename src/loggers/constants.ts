import { format, transports } from "winston";
import "winston-daily-rotate-file";

const { combine, colorize, timestamp, label, printf } = format;
const CATEGORY = "werk3";
const ENV = process.env.NODE_ENV;

export const transportsOptions: any = [
  new transports.DailyRotateFile({
    filename: `./logs/error.%DATE%`,
    level: "error",
    datePattern: "YYYY-MM-DD",
    zippedArchive: false,
    maxSize: "20m",
  }),
  new transports.DailyRotateFile({
    filename: `./logs/warn.%DATE%`,
    level: "warn",
    datePattern: "YYYY-MM-DD",
    zippedArchive: false,
    maxSize: "20m",
  }),
  new transports.DailyRotateFile({
    filename: `./logs/combined.%DATE%`,
    datePattern: "YYYY-MM-DD",
    zippedArchive: false,
    maxSize: "20m",
  }),
];

export const winstonLoggerOptions = {
  exitOnError: false,
  level: "info",
  format: combine(
    label({ label: CATEGORY }),
    timestamp(),
    colorize(),
    printf(({ level, message, context, timestamp, stack }) => {
      return `${timestamp} [${context}] ${level}: ${message}${
        stack ? ` - ${stack}` : ""
      }`;
    }),
  ),
  transports:
    ENV === "production"
      ? transportsOptions
      : transportsOptions.concat(new transports.Console({ level: "debug" })),
};
