import { HttpStatus } from '@nestjs/common';

export interface IResponseData<T> {
  data: any;
  message?: string;
  statusCode?: HttpStatus;
}

export class ResponseData<T> implements IResponseData<T> {
  data: any;
  message: string;
  statusCode: HttpStatus;

  constructor(data: T) {
    this.data = data;
  }
}
