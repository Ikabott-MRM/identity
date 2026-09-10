export type RequestSchemaId =
  | 'drivers_license'
  | 'production_registry'
  | 'donor'
  | 'fundraiser'
  | 'associate';

export type CredentialTypeConfig = {
  requestSchemaId: RequestSchemaId;
  issuanceSchemaId: string;
  requiredFields: string[];
};

export const CREDENTIAL_TYPES: Record<RequestSchemaId, CredentialTypeConfig> = {
  drivers_license: {
    requestSchemaId: 'drivers_license',
    issuanceSchemaId: 'DriversLicense',
    requiredFields: ['name', 'lastname', 'category'],
  },
  production_registry: {
    requestSchemaId: 'production_registry',
    issuanceSchemaId: 'ProductionRegistry',
    requiredFields: ['tipo', 'cantidad', 'precio', 'fecha_entrega'],
  },
  donor: {
    requestSchemaId: 'donor',
    issuanceSchemaId: 'donor',
    requiredFields: ['name', 'lastname'],
  },
  fundraiser: {
    requestSchemaId: 'fundraiser',
    issuanceSchemaId: 'fundraiser',
    requiredFields: ['name', 'lastname', 'projectName'],
  },
  associate: {
    requestSchemaId: 'associate',
    issuanceSchemaId: 'associate',
    requiredFields: ['name', 'lastname'],
  },
};

/** Stack / new-tenant default (non-Geyser pilot). */
export const DEFAULT_REQUEST_SCHEMA_ID: RequestSchemaId = 'associate';

export function isSupportedRequestSchemaId(
  schemaId: string,
): schemaId is RequestSchemaId {
  return schemaId in CREDENTIAL_TYPES;
}

export function getCredentialTypeByRequestSchemaId(schemaId: string) {
  if (!isSupportedRequestSchemaId(schemaId)) {
    return null;
  }
  return CREDENTIAL_TYPES[schemaId];
}
