import { Test, TestingModule } from '@nestjs/testing';
import { EventsService, Event } from './events.service';
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
});
