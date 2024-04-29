import { Controller, Get, HttpException, Query } from '@nestjs/common';
import { EventsService, Invitee } from '../events/events.service';

@Controller('invitee')
export class InviteeController {
  constructor(private eventsService: EventsService) {}

  @Get('/')
  async getInvitee(
    @Query('poll') poll,
    @Query('orderId') orderId,
  ): Promise<Invitee> {
    poll = poll === '1';
    const invitee = await this.eventsService.getInviteeByOrderId(orderId, poll);

    if (!invitee) {
      throw new HttpException('Invitee not found', 404);
    }

    return invitee;
  }
}
