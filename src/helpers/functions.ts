import { HttpStatus } from '@nestjs/common';
import { IResponseData, ResponseData } from './interfaces';

export const sendResponse = <T>(
  data: T,
  statusCode: HttpStatus,
  message: string,
): IResponseData<T> => {
  const res = new ResponseData(data);
  res.statusCode = statusCode;
  res.message = message;
  return res;
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
