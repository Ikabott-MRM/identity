import { Test, TestingModule } from '@nestjs/testing';
import { EventsService, Event, Invitee, Order } from './events.service';
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

  describe('createEvent', () => {
    it('should create an event', async () => {
      const event: Event = {
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
      };

      await service.createEvent(event);

      expect(knexMock().insert).toHaveBeenCalledWith({
        id: 'event-id',
        name: 'Test Event',
        description: 'Test description',
        startDate: '2023-06-01T00:00:00Z',
        endDate: '2023-06-01T02:00:00Z',
        url: 'https://example.com/event',
      });
    });
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
      });
    });
  });

  describe('createOrUpdateInvitee', () => {
    it('should create an invitee if it does not exist', async () => {
      const invitee: Invitee = {
        id: 'invitee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        orderId: 'order-id',
        ticketType: 'VIP',
        companyName: 'Example Inc.',
      };

      const resendMock = {
        emails: {
          send: jest.fn().mockResolvedValue(undefined),
        },
      };
      (Resend as jest.Mock).mockReturnValue(resendMock);

      await service.createOrUpdateInvitee(invitee);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'invitee-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().insert).toHaveBeenCalledWith({
        id: 'invitee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        ticketType: 'VIP',
      });
      expect(resendMock.emails.send).toHaveBeenCalled();
    });

    it('should update an invitee if it exists', async () => {
      const invitee: Invitee = {
        id: 'invitee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        orderId: 'order-id',
        ticketType: 'VIP',
        companyName: 'Example Inc.',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce({
        id: 'invitee-id',
      });

      await service.createOrUpdateInvitee(invitee);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'invitee-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().update).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        ticketType: 'VIP',
      });
    });
  });

  describe('getInviteeById', () => {
    it('should get an invitee by ID', async () => {
      const inviteeId = 'invitee-id';
      const expectedInvitee: Invitee = {
        id: 'invitee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        orderId: 'order-id',
        ticketType: 'VIP',
        companyName: 'Example Inc.',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce(expectedInvitee);

      const result = await service.getInviteeById(inviteeId);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'invitee-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(result).toEqual(expectedInvitee);
    });
  });

  describe('getInviteeByOrderId', () => {
    it('should get an invitee by order ID', async () => {
      const orderId = 'order-id';
      const expectedInvitee: Invitee = {
        id: 'invitee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: 'event-id',
        orderId: 'order-id',
        ticketType: 'VIP',
        companyName: 'Example Inc.',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce(expectedInvitee);

      const result = await service.getInviteeByOrderId(orderId, false);

      expect(knexMock().where).toHaveBeenCalledWith('orderId', 'order-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(result).toEqual(expectedInvitee);
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

  describe('getInviteesByEventId', () => {
    it('should get invitees by event ID', async () => {
      const eventId = 'event-id';
      const expectedInvitees: Invitee[] = [
        {
          id: 'invitee-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          eventId: 'event-id',
          orderId: 'order-1',
          ticketType: 'VIP',
          companyName: 'Example Inc.',
        },
        {
          id: 'invitee-2',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          eventId: 'event-id',
          orderId: 'order-2',
          ticketType: 'General',
          companyName: 'Example Co.',
        },
      ];

      jest.spyOn(knexMock(), 'where').mockResolvedValueOnce(expectedInvitees);

      const result = await service.getInviteesByEventId(eventId);

      expect(knexMock().where).toHaveBeenCalledWith('eventId', 'event-id');
      expect(result).toEqual(expectedInvitees);
    });
  });
});
