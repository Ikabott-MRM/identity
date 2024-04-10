import { Inject, Injectable } from '@nestjs/common';
import { Knex } from 'knex';

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
}

@Injectable()
export class EventsService {
  constructor(@Inject('KnexConnection') private readonly knex: Knex) {}

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
      });
    } else {
      await this.knex('invitee').insert({
        id: invitee.id,
        firstName: invitee.firstName,
        lastName: invitee.lastName,
        email: invitee.email,
      });
    }
  }

  async getInviteeById(id: string): Promise<Invitee> {
    return this.knex('invitee').where('id', id).first();
  }
}
