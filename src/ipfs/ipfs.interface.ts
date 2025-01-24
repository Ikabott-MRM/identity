export interface IpfsGateway {
  uploadContent(content: string, name?: string): Promise<string>;
  getContent(cid: string): Promise<string | object>;

  pinCid?(Cid: string): Promise<string>;
  unpinCid(Cid: string): Promise<string>;
}
