class Schema {
  id: string;
  contexts: string[];
  type: string[];
  mappingRulesDescriptor: Record<string, string>;
}

export class CredentialsSchemasInMemoryRepository {
  private credentialsSchemas: Schema[] = [
    // Legacy — kept for backward compatibility with existing credentials/requests.
    {
      id: 'DriversLicense',
      type: ['https://identity-iovf.xyz/schemas/driversLicense'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        firstname: 'name',
        lastname: 'lastname',
        licenseCategory: 'category',
        // Photo integrity claims — Identity embeds these; Emisor must not supply.
        photoHash: 'photoHash',
        photoHashAlg: 'photoHashAlg',
        document_id: 'document_id',
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
        photoHash: 'photoHash',
        photoHashAlg: 'photoHashAlg',
        document_id: 'document_id',
      },
    },
    // Geyser: Donor / Donante
    {
      id: 'donor',
      type: ['https://identity-iovf.xyz/schemas/donor'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        firstname: 'name',
        lastname: 'lastname',
        photoHash: 'photoHash',
        photoHashAlg: 'photoHashAlg',
        document_id: 'document_id',
      },
    },
    // Geyser: Fundraiser
    {
      id: 'fundraiser',
      type: ['https://identity-iovf.xyz/schemas/fundraiser'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        firstname: 'name',
        lastname: 'lastname',
        projectName: 'projectName',
        role: 'role',
        photoHash: 'photoHash',
        photoHashAlg: 'photoHashAlg',
        document_id: 'document_id',
      },
    },
    // Stack pilot default: Socio / Associate
    {
      id: 'associate',
      type: ['https://identity-iovf.xyz/schemas/associate'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        firstname: 'name',
        lastname: 'lastname',
        photoHash: 'photoHash',
        photoHashAlg: 'photoHashAlg',
        document_id: 'document_id',
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
