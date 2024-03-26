import { transportsOptions } from "./constants";

describe("Winston Logger Options", () => {
  let ENV: string;
  beforeEach(() => {
    jest.resetModules();
    ENV = process.env.NODE_ENV;
  });
  test("Should be 3 transport options inside winston logger", async () => {
    process.env.NODE_ENV = "production";
    const winstonLoggerOptions = (await require("./constants"))
      .winstonLoggerOptions;
    expect(winstonLoggerOptions.transports.length).toBe(
      transportsOptions.length,
    );
  });
  test("Should be 4 transport options inside winston logger", async () => {
    process.env.NODE_ENV = "test";
    const winstonLoggerOptions = (await require("./constants"))
      .winstonLoggerOptions;
    expect(winstonLoggerOptions.transports.length).toBe(
      transportsOptions.length + 1,
    );
  });
  afterAll(() => {
    process.env.NODE_ENV = ENV;
  });
});
