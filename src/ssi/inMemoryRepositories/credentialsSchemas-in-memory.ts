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
      type: ['InvitationCredential'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        eventName: 'name',
        eventDate: 'startDate',
        eventLocation: 'location',
        inviteeName: 'firstName',
        inviteeLastname: 'lastName',
        typeOfInvitation: 'typeOfInvitation',
        membershipNumber: 'nro_socio',
        companyName: 'companyName',
        inviteeJobPosition: 'jobPosition',
      },
    },
    {
      id: 'Attendance',
      type: ['AttendanceCredential'],
      contexts: ['https://www.w3.org/2018/credentials/v1'],
      mappingRulesDescriptor: {
        eventName: 'name',
        eventOrganizer: 'organizer',
        eventLocation: 'location',
        dateAndTimeOfAttendance: 'dateAndTimeOfAttendance',
        inviteeName: 'firstName',
        inviteeLastname: 'lastName',
        typeOfInvitation: 'typeOfInvitation',
        membershipNumber: 'nro_socio',
        companyName: 'companyName',
        inviteeJobPosition: 'jobPosition',
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
