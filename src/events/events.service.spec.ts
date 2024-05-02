import { Test, TestingModule } from '@nestjs/testing';
import { EventsService, Event, Invitee } from './events.service';
import { Knex } from 'knex';

describe('EventsService', () => {
  let service: EventsService;
  let knexMock: jest.Mocked<Knex>;

  beforeEach(async () => {
    const knexInstance = {
      insert: jest.fn().mockResolvedValue(undefined),
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockResolvedValue(undefined),
      first: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Knex>;

    knexMock = jest
      .fn()
      .mockReturnValue(knexInstance) as unknown as jest.Mocked<Knex>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: 'KnexConnection',
          useValue: knexMock,
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
        eventId: '',
      };

      await service.createOrUpdateInvitee(invitee);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'invitee-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(knexMock().insert).toHaveBeenCalledWith({
        id: 'invitee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it('should update an invitee if it exists', async () => {
      const invitee: Invitee = {
        id: 'invitee-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        eventId: '',
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
        eventId: '',
      };

      jest.spyOn(knexMock(), 'first').mockResolvedValueOnce(expectedInvitee);

      const result = await service.getInviteeById(inviteeId);

      expect(knexMock().where).toHaveBeenCalledWith('id', 'invitee-id');
      expect(knexMock().first).toHaveBeenCalled();
      expect(result).toEqual(expectedInvitee);
    });
  });
});
