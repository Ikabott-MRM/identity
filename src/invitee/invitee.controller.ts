import { Controller, Get, HttpException, Query } from '@nestjs/common';
import { EventsService } from '../events/events.service';

export class GetInviteeResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  eventId: string;
  orderId: string;
  ticketType: string;
  companyName: string;
  event: {
    id: string;
    name: string;
    description: string;
    startDate: string;
    location: string;
    endDate: string;
    url: string;
  };
  credential: string;
}

@Controller('invitee')
export class InviteeController {
  constructor(private eventsService: EventsService) {}

  @Get('/')
  async getInvitee(
    @Query('poll') poll,
    @Query('orderId') orderId,
  ): Promise<GetInviteeResponse> {
    if (!orderId) {
      throw new HttpException('orderId is required', 400);
    }

    if (poll !== '0' && poll !== '1') {
      throw new HttpException('poll must be 0 or 1', 400);
    }

    poll = poll === '1';

    const invitee = await this.eventsService.getInviteeByOrderId(orderId, poll);

    if (!invitee) {
      throw new HttpException('Invitee not found', 404);
    }

    const event = await this.eventsService.getEventById(invitee.eventId);

    return {
      ...invitee,
      event,
      credential: 'placeholder',
    };
  }
}
