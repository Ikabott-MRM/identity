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

    return invitee;
  }
}
