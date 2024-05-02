import { PresentationDefinitionV2 } from '@web5/credentials';

type InputDescriptor = {
  id: string;
  name: string;
  purpose: string;
  constraints: any;
};

export class PresentationsDefinitions {
  private presentationsDefinitions: PresentationDefinitionV2[] = [
    {
      id: 'PD_Attendee',
      name: 'Credentials verification for certifying attendance to event',
      purpose:
        'Confirm the applicant holds an invitation credential for the event of interest',
      input_descriptors: [
        {
          id: 'invitationVerification',
          name: 'Invitation verification',
          purpose: "Verify the applicant's invitation credential",
          constraints: {
            fields: [
              {
                path: ['$.type[*]'],
                filter: {
                  type: 'string',
                  pattern: 'InvitationCredential',
                },
              },
              //https://developer.tbd.website/docs/web5/build/verifiable-credentials/presentation-definition
            ],
          },
        },
      ],
    },
  ];

  async get(id: any): Promise<PresentationDefinitionV2> {
    const pd = this.presentationsDefinitions.find((pd) => pd.id === id);
    if (!pd) {
      throw new Error(`PD with ID ${id} not found`);
    }
    return pd;
  }

  async addInputDescriptor(
    id: string,
    eventName: string,
  ): Promise<PresentationDefinitionV2> {
    const presentation = await this.get(id);
    if (presentation) {
      presentation.input_descriptors[0].constraints.fields.push({
        path: ['$.credentialSubject.eventName'],
        filter: {
          type: 'string',
          pattern: eventName,
        },
      });
      return presentation;
    } else {
      throw new Error(`Presentation definition with ID ${id} not found.`);
    }
  }
}
