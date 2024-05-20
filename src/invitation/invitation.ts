import { Controller, Get, HttpException, Query } from '@nestjs/common';
import { EventsService } from '../events/events.service';

export class GetInvitationResposne {
  id: string;
  orderId: string;
  ticketType: string;
  person: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    company: string;
    position: string;
    memberId: string;
  };
  event: {
    id: string;
    name: string;
    description: string;
    startDate: string;
    location: string;
    endDate: string;
    url: string;
  };
  credentialOffer: string;
}

@Controller('invitation')
export class InvitationController {
  constructor(private eventsService: EventsService) {}

  @Get('/')
  async getInvitee(
    @Query('poll') poll,
    @Query('orderId') orderId,
  ): Promise<GetInvitationResposne> {
    if (!orderId) {
      throw new HttpException('orderId is required', 400);
    }

    if (poll !== '0' && poll !== '1') {
      throw new HttpException('poll must be 0 or 1', 400);
    }

    poll = poll === '1';

    const invitation = await this.eventsService.getInvitationByOrderId(
      orderId,
      poll,
    );

    if (!invitation) {
      throw new HttpException('Invitation not found', 404);
    }

    const event = await this.eventsService.getEventById(invitation.eventId);

    // Should never be null. If so, we have a data integrity issue.
    if (!event) {
      throw new HttpException("Invitation's event not found.", 500);
    }

    const person = await this.eventsService.getPersonById(invitation.personId);
    if (!person) {
      throw new HttpException("Invitation's person not found", 500);
    }

    return {
      ...invitation,
      person,
      event,
      credentialOffer: 'placeholder',
    };
  }
}
