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
            createOrUpdatePerson: jest.fn(),
            createOrUpdateInvitation: jest.fn(),
            createOrUpdateOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventbriteService>(EventbriteService);
    eventsService = module.get<EventsService>(EventsService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

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
        location: 'Test Location',
        organizer: 'CACE',
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
        name: { text: 'Test Event', html: '<p>Test Event</p>' },
        description: { text: 'Test description' },
        start: { utc: '2023-06-01T00:00:00Z' },
        end: { utc: '2023-06-01T02:00:00Z' },
        url: 'https://example.com/event',
        venue_id: 'venue-id',
      };
      const eventbriteVenue = {
        name: 'Test Venue',
        address: {
          address_1: 'Test Address 1',
          address_2: 'Test Address 2',
          city: 'Test City',
          region: 'Test Region',
          postal_code: '12345',
          country: 'Test Country',
          latitude: '0',
          longitude: '0',
        },
      };

      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(eventbriteEvent),
      } as any);
      jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(eventbriteVenue),
      } as any);

      const result = await service.getEvent(apiUrl);

      expect(result).toEqual({
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
        location: 'Test Venue',
        organizer: 'CACE',
      });

      expect(fetch).toHaveBeenCalledWith(apiUrl, {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
      expect(fetch).toHaveBeenCalledWith(
        'https://www.eventbriteapi.com/v3/venues/venue-id/',
        {
          headers: {
            Authorization: 'Bearer test-token',
          },
        },
      );
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
        company: 'Test Company',
        eventId: 'event-id',
        orderId: 'order-id',
        ticketType: 'ticket-type',
        memberId: 'member-id',
        position: 'Test Position',
      };
      jest.spyOn(service, 'getAttendee').mockResolvedValue(attendee);
      jest
        .spyOn(eventsService, 'createOrUpdatePerson')
        .mockResolvedValue(undefined);
      jest
        .spyOn(eventsService, 'createOrUpdateInvitation')
        .mockResolvedValue(undefined);
      jest.spyOn(service, 'syncEvents').mockResolvedValue(undefined);

      await service.syncAttendee(apiUrl);

      expect(service.getAttendee).toHaveBeenCalledWith(apiUrl);
      expect(eventsService.createOrUpdatePerson).toHaveBeenCalledWith({
        id: 'attendee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Test Company',
        position: 'Test Position',
        memberId: 'member-id',
      });
      expect(service.syncEvents).toHaveBeenCalledWith(
        'https://www.eventbriteapi.com/v3/events/event-id/',
      );
    });
  });

  describe('syncOrder', () => {
    it('should sync order', async () => {
      const apiUrl = 'https://example.com/api';
      const order = {
        id: 'order-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        status: 'placed',
        createdAt: '2023-06-01T00:00:00Z',
      };
      jest.spyOn(service, 'getOrder').mockResolvedValue(order);
      jest
        .spyOn(eventsService, 'createOrUpdateOrder')
        .mockResolvedValue(undefined);

      const result = await service.syncOrder(apiUrl);

      expect(result).toEqual(order);
      expect(service.getOrder).toHaveBeenCalledWith(apiUrl);
      expect(eventsService.createOrUpdateOrder).toHaveBeenCalledWith(order);
    });
  });

  describe('getOrder', () => {
    it('should get order', async () => {
      const apiUrl = 'https://example.com/api';
      const eventbriteOrder = {
        id: 'order-id',
        name: 'John',
        first_name: 'John',
        last_name: 'Doe',
        created: '2023-06-01T00:00:00Z',
        event_id: 'event-id',
        status: 'placed',
        email: 'john@example.com',
      };
      jest.spyOn(global, 'fetch').mockResolvedValue({
        json: jest.fn().mockResolvedValue(eventbriteOrder),
      } as any);

      const result = await service.getOrder(apiUrl);

      expect(result).toEqual({
        id: 'order-id',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: '2023-06-01T00:00:00Z',
        email: 'john@example.com',
        eventId: 'event-id',
        status: 'placed',
      });
      expect(fetch).toHaveBeenCalledWith(apiUrl, {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
    });
  });

  describe('getAttendee', () => {
    it('should get attendee', async () => {
      const apiUrl = 'https://example.com/api';
      const eventbriteAttendee = {
        id: 'attendee-id',
        order_id: 'order-id',
        profile: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
        },
        event_id: 'event-id',
        questions: [
          {
            id: 'question-1',
            label: 'Empresa',
          },
          {
            id: 'question-2',
            label: 'Número de socio',
          },
          {
            id: 'question-3',
            label: 'Cargo',
          },
        ],
        answers: [
          {
            question: 'Empresa',
            answer: 'Test Company',
            type: 'text',
            question_id: 'question-1',
          },
          {
            question: 'Número de socio',
            answer: 'member-id',
            type: 'text',
            question_id: 'question-2',
          },
          {
            question: 'Cargo',
            answer: 'Test Position',
            type: 'text',
            question_id: 'question-3',
          },
        ],
        ticket_class_name: 'ticket-type',
      };
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(eventbriteAttendee),
      } as any);

      const result = await service.getAttendee(apiUrl);

      expect(result).toEqual({
        id: 'attendee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Test Company',
        memberId: 'member-id',
        position: 'Test Position',
        eventId: 'event-id',
        orderId: 'order-id',
        ticketType: 'ticket-type',
      });
      expect(fetch).toHaveBeenCalledWith(apiUrl, {
        headers: {
          Authorization: 'Bearer test-token',
        },
      });
    });
  });
});
