import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { IpfsGateway } from './ipfs.interface';

@Injectable()
export class KuboCompatibleGateway implements IpfsGateway {
  private readonly gatewayUrl = process.env.IPFS_GATEWAY_URL;
  //TODO ver que meto en config como obligatorio para que si o si haya algun valor de IPFS
  private readonly logger = new Logger(KuboCompatibleGateway.name);

  async uploadContent(content: string): Promise<string> {
    try {
      const formData = new FormData();
      const fileBlob = new Blob([content], { type: 'text/plain' });

      formData.append('file', fileBlob);
      //TODO por defecto add los deja pineados
      //para que no se pineen se tendria que pasar el arg pin en false
      const response = await axios.post(`${this.gatewayUrl}/add`, formData, {
        //TODO revisar que headers es necesario poner
      });
      return response.data.Hash;
    } catch (error) {
      this.logger.error(
        `An error has occurred while uploading content to ipfs`,
        error,
      );
      throw error;
    }
  }
  //TODO revisar resto de los endpoints

  async getContent(cid: string): Promise<string> {
    try {
      const response = await axios.get(`${this.gatewayUrl}/cat?arg=${cid}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `An error has occurred while getting content from ipfs`,
        error,
      );
      throw error;
    }
  }

  async pinCid(cid: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.gatewayUrl}/pin/add?arg=${cid}`,
      );
      return response.data.Pins[0];
    } catch (error) {
      this.logger.error(
        `An error has occurred while pinning content to ipfs`,
        error,
      );
      throw error;
    }
  }

  async unpinCid(cid: string): Promise<string> {
    try {
      const response = await axios.post(`${this.gatewayUrl}/pin/rm?arg=${cid}`);
      return response.data.Pins[0];
    } catch (error) {
      this.logger.error(
        `An error has occurred while deleting content from ipfs`,
        error,
      );
      throw error;
    }
  }
}
