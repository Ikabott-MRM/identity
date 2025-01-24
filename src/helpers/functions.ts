import { HttpStatus, Logger } from '@nestjs/common';
import { IResponseData, ResponseData } from './interfaces';
import { RequestError } from './errors';
import { number } from 'joi';

export const sendResponse = <T extends Exclude<any, RequestError>>(
  data: T,
  statusCode: HttpStatus,
  message: string,
): IResponseData<T> => {
  const res = new ResponseData(data);
  res.statusCode = statusCode;
  res.message = message;
  return res;
};

export const sendErrorResponse = (
  code: RequestError,
  status: number,
  message: string,
) => {
  return {
    status,
    error: {
      code,
      message,
    },
  };
};

function getModelValue(obj, path) {
  path = path.split(':');
  let current = obj;
  if (typeof current !== 'object') {
    return undefined;
  }
  return current[path.shift()];
}

function setSchemaValue(obj, path, value) {
  path = path.split(':');
  let current = obj;
  if (path.length == 1) {
    current[path.shift()] = value;
  } else {
    const prop = path.shift();
    if (current[prop] === undefined) {
      current[prop] = {};
    }
    current = current[prop];
  }
  return current;
}

export const mapDataWithRules = function (
  data: any,
  mappingRules: Record<string, string>,
) {
  if (!mappingRules) {
    return data;
  }

  const schemaObject = {};

  for (const prop in mappingRules) {
    const modelField = getModelValue(data, mappingRules[prop]);
    setSchemaValue(schemaObject, prop, modelField);
  }

  return schemaObject;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const retryOperation = async function (operation, logger: Logger) {
  const retries = 3;
  const delayMs = 500;
  const retryableErrorCodes = [
    '1213',
    '1205',
    '1040',
    '2002',
    '2006',
    '2013',
    '2055',
  ];
  const onRetry = (error, attempt: number, retriesLeft: number) => {
    logger.debug(
      `Retrying due to error: ${error.code}- ${error.message}. Attempt ${attempt}, ${retriesLeft} retries left.`,
      error.stack,
    );
  };

  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;

      // Check if the error code is included on the retryable error codes array
      if (attempt <= retries && retryableErrorCodes.includes(error.code)) {
        onRetry(error, attempt, retries - attempt);
        await delay(delayMs * attempt);
      } else {
        logger.error(
          `Max attempts reached or error code not included on retryable error codes.`,
        );
        throw error;
      }
    }
  }
};
