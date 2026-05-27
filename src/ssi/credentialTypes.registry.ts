export type RequestSchemaId = 'drivers_license' | 'production_registry';

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
};

export const DEFAULT_REQUEST_SCHEMA_ID: RequestSchemaId = 'drivers_license';

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
