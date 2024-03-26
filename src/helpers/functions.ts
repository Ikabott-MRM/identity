import { HttpStatus } from '@nestjs/common';
import { IResponseData, ResponseData } from 'src/helpers/interfaces';

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
