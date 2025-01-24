import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IpfsGateway } from './ipfs.interface';

@Injectable()
export class PinataGatewayService implements IpfsGateway {
  private readonly pinataApiRul = `https://api.pinata.cloud`;
  private readonly pinataGateway = process.env.PINATA_GATEWAY;
  private readonly secretAccessToken = process.env.PINATA_JWT_TOKEN;
  private readonly logger = new Logger(PinataGatewayService.name);

  //cuando se suba una credencial se va a subir pasando el
  //string que es encrypted data
  //cuando se suba el manifest se va a pasar un json object
  //pero para simplificar lo puedo pasar coo un string, no?
  async uploadContent(content: string, name?: string): Promise<string> {
    try {
      const formData = new FormData();
      const fileBlob = new Blob([content], { type: 'text/plain' });

      formData.append('file', fileBlob);

      const response = await axios.post(
        `${this.pinataApiRul}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.secretAccessToken}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data.IpfsHash;
    } catch (error) {
      this.logger.error(
        `An error has occurred while uploading content to ipfs`,
        error,
      );
      throw error;
    }
  }

  async getContent(cid: string): Promise<string | object> {
    try {
      const response = await axios.get(`${this.pinataGateway}/ipfs/${cid}`, {
        headers: {
          Authorization: `Bearer ${this.secretAccessToken}`,
        },
      });

      console.log(typeof response.data);
      return response.data;
    } catch (error) {
      this.logger.error(
        `An error has occurred while getting content from ipfs`,
        error,
      );
      throw error;
    }
  }

  //en pinata unpin es delete
  async unpinCid(cid: string): Promise<string> {
    try {
      const response = await axios.delete(
        `${this.pinataApiRul}/pinning/unpin/${cid}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretAccessToken}`,
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `An error has occurred while deleting content from ipfs`,
        error,
      );
      throw error;
    }
  }
}
