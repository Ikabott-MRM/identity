import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventbriteService } from './eventbrite.service';
import { EventsService } from '../events/events.service';

describe('EventbriteService', () => {
  let service: EventbriteService;
  let eventsService: EventsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventbriteService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-token'),
          },
        },
        {
          provide: EventsService,
          useValue: {
            createOrUpdateEvent: jest.fn(),
            createOrUpdateInvitee: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventbriteService>(EventbriteService);
    eventsService = module.get<EventsService>(EventsService);
  });

  afterEach(async () => {});

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('syncEvents', () => {
    it('should sync events', async () => {
      const apiUrl = 'https://example.com/api';
      const event = {
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
      };

      jest.spyOn(service, 'getEvent').mockResolvedValue(event);
      jest
        .spyOn(eventsService, 'createOrUpdateEvent')
        .mockResolvedValue(undefined);

      const result = await service.syncEvents(apiUrl);

      expect(result).toEqual(event);
      expect(service.getEvent).toHaveBeenCalledWith(apiUrl);
      expect(eventsService.createOrUpdateEvent).toHaveBeenCalledWith(event);
    });
  });

  describe('getEvent', () => {
    it('should get event', async () => {
      const apiUrl = 'https://example.com/api';
      const eventbriteEvent = {
        id: 'event-id',
        name: 'Test Event',
        description: { text: 'Test description' },
        start: { utc: '2023-06-01T00:00:00Z' },
        end: { utc: '2023-06-01T02:00:00Z' },
        url: 'https://example.com/event',
      };

      jest.spyOn(global, 'fetch').mockResolvedValue({
        json: jest.fn().mockResolvedValue(eventbriteEvent),
      } as any);

      const result = await service.getEvent(apiUrl);

      expect(result).toEqual({
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
      });

      expect(fetch).toHaveBeenCalledWith(apiUrl, {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
    });
  });

  describe('syncAttendee', () => {
    it('should sync attendee', async () => {
      const apiUrl = 'https://example.com/api';
      const attendee = {
        id: 'attendee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        orderId: 'order-id',
        ticketType: 'ticket-type',
        companyName: 'company-name',
      };
      jest.spyOn(service, 'getAttendee').mockResolvedValue(attendee);
      jest
        .spyOn(eventsService, 'createOrUpdateInvitee')
        .mockResolvedValue(undefined);

      const result = await service.syncAttendee(apiUrl);

      expect(result).toEqual(attendee);
      expect(service.getAttendee).toHaveBeenCalledWith(apiUrl);
      expect(eventsService.createOrUpdateInvitee).toHaveBeenCalledWith(
        attendee,
      );
    });
  });

  describe('getAttendee', () => {
    it('should get attendee', async () => {
      const apiUrl = 'https://example.com/api';
      const eventbriteAttendee = {
        id: 'attendee-id',
        profile: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
      };
      jest.spyOn(global, 'fetch').mockResolvedValue({
        json: jest.fn().mockResolvedValue(eventbriteAttendee),
      } as any);

      const result = await service.getAttendee(apiUrl);

      expect(result).toEqual({
        id: 'attendee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
      expect(fetch).toHaveBeenCalledWith(apiUrl, {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
    });
  });
});
