class Schema {
  id: string;
  contexts: string[];
  type: string[];
  mappingRulesDescriptor: Record<string, string>;
}

export class CredentialsSchemasInMemoryRepository {
  private credentialsSchemas: Schema[] = [
    {
      id: 'Invitation',
      // type: ['InvitationCredential'],
      //TODO le cambie el tipo pq para guardar en DWN el schema tiene que ser el tipo de la credencial y
      //para trabajar con protocolos, el schema tiene que ser el schmea del tipo definido en el protocolo
      type: ['https://identity-iovf.xyz/schemas/dirversLicenseSchema'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        firstname: 'name',
        lastname: 'lastname',
        licenseCateogry: 'category',
      },
    },
  ];

  async get(schemaId: any): Promise<Schema> {
    const schema = this.credentialsSchemas.find(
      (schema) => schema.id === schemaId,
    );
    if (!schema) {
      throw new Error(`Schema with ID ${schemaId} not found`);
    }
    return schema;
  }
}
