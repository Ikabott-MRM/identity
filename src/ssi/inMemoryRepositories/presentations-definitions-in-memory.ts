import { PresentationDefinitionV2 } from '@web5/credentials';

export class PresentationsDefinitions {
  private presentationsDefinitions: PresentationDefinitionV2[] = [
    {
      id: 'PD_DriversLicense',
      name: 'Credentials verification for certifying validity of drivers license',
      purpose:
        'Confirm the applicant holds a divers license credential that has not expired and has been issued by the issuer of interest',
      input_descriptors: [
        {
          id: 'driversLicenseVerification',
          name: 'Drivers License verification',
          purpose: "Verify the applicant's drivers license credential",
          constraints: {
            fields: [
              {
                path: ['$.type[*]'],
                filter: {
                  type: 'string',
                  pattern:
                    'https://identity-iovf.xyz/schemas/driversLicenseSchema',
                },
              },
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

  /**
   *
   * @param id id of the presentation definition to which issuer is going to be added as a constraint
   * @param issuer issuer did that is going to be set as the string pattern against which the credential issuer is going to be tested
   * @returns presentation definition associated to id passed as parameter with the issuer as an added constraint
   */
  async addIssuerAsConstraint(
    id: string,
    issuer: string,
  ): Promise<PresentationDefinitionV2> {
    const presentation = await this.get(id);
    if (presentation) {
      presentation.input_descriptors[0].constraints.fields.push({
        path: ['$.issuer'],
        filter: {
          type: 'string',
          pattern: issuer,
        },
      });
      return presentation;
    } else {
      throw new Error(`Presentation definition with ID ${id} not found.`);
    }
  }
}
