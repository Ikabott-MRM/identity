class Schema {
  id: string;
  contexts: string[];
  type: string[];
  mappingRulesDescriptor: Record<string, string>;
}

export class CredentialsSchemasInMemoryRepository {
  private credentialsSchemas: Schema[] = [
    {
      id: 'DriversLicense',
      type: ['https://identity-iovf.xyz/schemas/driversLicense'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        firstname: 'name',
        lastname: 'lastname',
        licenseCategory: 'category',
      },
    },
    {
      id: 'ProductionRegistry',
      type: ['https://identity-iovf.xyz/schemas/productionRegistry'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        tipo: 'tipo',
        cantidad: 'cantidad',
        precio: 'precio',
        fechaEntrega: 'fecha_entrega',
      },
    },
  ];

  async get(schemaId: any): Promise<Schema> {
    const schema = this.credentialsSchemas.find(
      schema => schema.id === schemaId,
    );
    if (!schema) {
      throw new Error(`Schema with ID ${schemaId} not found`);
    }
    return schema;
  }
}
