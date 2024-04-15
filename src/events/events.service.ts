import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import { Resend } from 'resend';

export class Event {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  url: string;
}

export class Invitee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  eventId: string;
}

@Injectable()
export class EventsService {
  constructor(
    @Inject('KnexConnection') private readonly knex: Knex,
    private configService: ConfigService,
  ) {}

  async createEvent(event: Event): Promise<void> {
    await this.knex('event').insert({
      id: event.id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      url: event.url,
    });
  }

  async createOrUpdateEvent(event: Event): Promise<void> {
    const existingEvent = await this.knex('event')
      .where('id', event.id)
      .first();

    if (existingEvent) {
      await this.knex('event').where('id', event.id).update({
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        url: event.url,
      });
    } else {
      await this.knex('event').insert({
        id: event.id,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        url: event.url,
      });
    }
  }

  async createOrUpdateInvitee(invitee: Invitee): Promise<void> {
    const existingInvitee = await this.knex('invitee')
      .where('id', invitee.id)
      .first();

    if (existingInvitee) {
      await this.knex('invitee').where('id', invitee.id).update({
        firstName: invitee.firstName,
        lastName: invitee.lastName,
        email: invitee.email,
        eventId: invitee.eventId,
      });
    } else {
      await this.knex('invitee').insert({
        id: invitee.id,
        firstName: invitee.firstName,
        lastName: invitee.lastName,
        email: invitee.email,
        eventId: invitee.eventId,
      });

      await this.sendConfirmationEmail(invitee);
    }
  }

  async sendConfirmationEmail(invitee: Invitee): Promise<void> {
    const resend = new Resend(this.configService.getOrThrow('RESEND_API_KEY'));

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'vbermudez@infuy.com',
      subject: 'Aquí está tu invitación',
      text: `Hola ${invitee.firstName} ${invitee.lastName}, aquí está tu invitación: https://example.com/invite/${invitee.id}`,
    });
  }

  async getInviteeById(id: string): Promise<Invitee> {
    return this.knex('invitee').where('id', id).first();
  }
}
