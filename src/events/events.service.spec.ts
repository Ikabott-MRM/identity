import { Test, TestingModule } from '@nestjs/testing';
import {
  EventsService,
  Event,
  Invitation,
  Order,
  Person,
} from './events.service';
import { Knex } from 'knex';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

jest.mock('resend');

describe('EventsService', () => {
  let service: EventsService;
  let knexMock: jest.Mocked<Knex>;
  let configServiceMock: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const knexInstance = {
      insert: jest.fn().mockResolvedValue(undefined),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(undefined),
      first: jest.fn().mockResolvedValue(undefined),
      select: jest.fn().mockResolvedValue([]),
      truncate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Knex>;

    knexMock = jest
      .fn()
      .mockReturnValue(knexInstance) as unknown as jest.Mocked<Knex>;

    configServiceMock = {
      getOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: 'KnexConnection',
          useValue: knexMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrUpdateEvent', () => {
    it('should create an event if it does not exist', async () => {
      const event: Event = {
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
        organizer: 'Test Organizer',
        location: 'Test Location',
      };

      await service.createOrUpdateEvent(event);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'event-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().insert).toHaveBeenCalledWith({
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
        organizer: 'Test Organizer',
      });
    });

    it('should update an event if it exists', async () => {
      const event: Event = {
        id: 'event-id',
        name: 'Updated Event',
        description: 'Updated description',
        startDate: '2023-06-02T00:00:00Z',
        endDate: '2023-06-02T02:00:00Z',
        url: 'https://example.com/updated-event',
        organizer: 'Updated Organizer',
        location: 'Updated Location',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce({
        id: 'event-id',
      });

      await service.createOrUpdateEvent(event);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'event-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().update).toHaveBeenCalledWith({
        name: 'Updated Event',
        description: 'Updated description',
        startDate: '2023-06-02T00:00:00Z',
        endDate: '2023-06-02T02:00:00Z',
        url: 'https://example.com/updated-event',
        organizer: 'Updated Organizer',
      });
    });
  });

  describe('createOrUpdateInvitation', () => {
    it('should create an invitation if it does not exist', async () => {
      const invitation: Invitation = {
        id: 'invitation-id',
        personId: 'person-id',
        eventId: 'event-id',
        ticketType: 'VIP',
        orderId: 'order-id',
      };

      const resendMock = {
        emails: {
          send: jest.fn().mockResolvedValue(undefined),
        },
      };
      (Resend as jest.Mock).mockReturnValue(resendMock);

      jest.spyOn(service, 'getPersonById').mockResolvedValueOnce({
        id: 'person-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Example Inc.',
        position: 'Developer',
        memberId: 'member-id',
      });

      jest.spyOn(service, 'getEventById').mockResolvedValueOnce({
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
        organizer: 'Test Organizer',
        location: 'Test Location',
      });

      await service.createOrUpdateInvitation(invitation);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'invitation-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().insert).toHaveBeenCalledWith({
        id: 'invitation-id',
        personId: 'person-id',
        eventId: 'event-id',
        ticketType: 'VIP',
        orderId: 'order-id',
      });
      expect(resendMock.emails.send).toHaveBeenCalled();
    });

    it('should update an invitation if it exists', async () => {
      const invitation: Invitation = {
        id: 'invitation-id',
        personId: 'person-id',
        eventId: 'event-id',
        ticketType: 'VIP',
        orderId: 'order-id',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce({
        id: 'invitation-id',
      });

      await service.createOrUpdateInvitation(invitation);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'invitation-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().update).toHaveBeenCalledWith({
        personId: 'person-id',
        eventId: 'event-id',
        ticketType: 'VIP',
        orderId: 'order-id',
      });
    });
  });

  describe('getInvitationByOrderId', () => {
    it('should get an invitation by order ID', async () => {
      const orderId = 'order-id';
      const expectedInvitation: Invitation = {
        id: 'invitation-id',
        personId: 'person-id',
        eventId: 'event-id',
        ticketType: 'VIP',
        orderId: 'order-id',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce(expectedInvitation);

      const result = await service.getInvitationByOrderId(orderId, false);

      expect(knexMock().where).toHaveBeenCalledWith('orderId', 'order-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(result).toEqual(expectedInvitation);
    });
  });

  describe('createOrUpdateOrder', () => {
    it('should create an order if it does not exist', async () => {
      const order: Order = {
        id: 'order-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        status: 'placed',
        createdAt: '2023-06-01T00:00:00Z',
      };

      await service.createOrUpdateOrder(order);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'order-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().insert).toHaveBeenCalledWith({
        id: 'order-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        status: 'placed',
        createdAt: '2023-06-01T00:00:00Z',
      });
    });

    it('should update an order if it exists', async () => {
      const order: Order = {
        id: 'order-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        status: 'completed',
        createdAt: '2023-06-01T00:00:00Z',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce({
        id: 'order-id',
      });

      await service.createOrUpdateOrder(order);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'order-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().update).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        status: 'completed',
        createdAt: '2023-06-01T00:00:00Z',
      });
    });
  });

  describe('getEventById', () => {
    it('should get an event by ID', async () => {
      const eventId = 'event-id';
      const expectedEvent: Event = {
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
        organizer: 'Test Organizer',
        location: 'Test Location',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce(expectedEvent);

      const result = await service.getEventById(eventId);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'event-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(result).toEqual(expectedEvent);
    });
  });

  describe('getPersonById', () => {
    it('should get a person by ID', async () => {
      const personId = 'person-id';
      const expectedPerson: Person = {
        id: 'person-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        company: 'Example Inc.',
        position: 'Developer',
        memberId: 'member-id',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce(expectedPerson);

      const result = await service.getPersonById(personId);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'person-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(result).toEqual(expectedPerson);
    });
  });

  describe('getInvitationsByEventId', () => {
    it('should get invitations by event ID', async () => {
      const eventId = 'event-id';
      const expectedInvitations: Invitation[] = [
        {
          id: 'invitation-1',
          personId: 'person-1',
          eventId: 'event-id',
          ticketType: 'VIP',
          orderId: 'order-1',
        },
        {
          id: 'invitation-2',
          personId: 'person-2',
          eventId: 'event-id',
          ticketType: 'General',
          orderId: 'order-2',
        },
      ];

      jest
        .spyOn(knexMock(), 'where')
        .mockResolvedValueOnce(expectedInvitations);

      const result = await service.getInvitationsByEventId(eventId);

      expect(knexMock().where).toHaveBeenCalledWith('eventId', 'event-id');
      expect(result).toEqual(expectedInvitations);
    });
  });

  describe('getOrdersByEventId', () => {
    it('should get orders by event ID', async () => {
      const eventId = 'event-id';
      const expectedOrders: Order[] = [
        {
          id: 'order-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          eventId: 'event-id',
          status: 'placed',
          createdAt: '2023-06-01T00:00:00Z',
        },
        {
          id: 'order-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          eventId: 'event-id',
          status: 'placed',
          createdAt: '2023-06-02T00:00:00Z',
        },
      ];

      jest.spyOn(knexMock(), 'where').mockResolvedValueOnce(expectedOrders);

      const result = await service.getOrdersByEventId(eventId);

      expect(knexMock().where).toHaveBeenCalledWith('eventId', 'event-id');
      expect(result).toEqual(expectedOrders);
    });
  });
});
