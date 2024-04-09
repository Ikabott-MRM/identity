import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';

export class Event {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  url: string;
}

@Injectable()
export class EventsService {
  constructor(@Inject('KnexConnection') private readonly knex: Knex) {}

  async createEvent(event: Event): Promise<void> {
    console.log('Creating event', event);
    console.log('Knex', this.knex);
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
}
