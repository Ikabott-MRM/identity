import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventbriteController, WebhookDTO } from './eventbrite.controller';
import { EventbriteService } from './eventbrite.service';
import { EventsService } from '../events/events.service';

describe('EventbriteController', () => {
  let controller: EventbriteController;
  let eventbriteService: EventbriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventbriteController],
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
          },
        },
      ],
    }).compile();

    controller = module.get<EventbriteController>(EventbriteController);
    eventbriteService = module.get<EventbriteService>(EventbriteService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleAttendeeWebhook', () => {
    it('should handle attendee webhook', async () => {
      const dto: WebhookDTO = {
        api_url: 'https://example.com/api',
        config: {
          endpoint_url: 'https://example.com/webhook',
          webhook_id: 'webhook-id',
          user_id: 'user-id',
          action: 'attendee.updated',
        },
      };

      await expect(
        controller.handleAttendeeWebhook(dto),
      ).resolves.not.toThrow();
    });
  });

  describe('handleEventWebhook', () => {
    it('should handle event webhook for event.created action', async () => {
      const webhookDto: WebhookDTO = {
        api_url: 'https://example.com/api',
        config: {
          endpoint_url: 'https://example.com/webhook',
          webhook_id: 'webhook-id',
          user_id: 'user-id',
          action: 'event.created',
        },
      };

      const event = {
        id: 'event-id',
        name: 'Test Event',
        description: 'Test Description',
        startDate: '2022-01-01T00:00:00Z',
        endDate: '2022-01-01T01:00:00Z',
        url: 'https://example.com/event',
      };

      jest.spyOn(eventbriteService, 'syncEvents').mockResolvedValue(event);

      const response = await controller.handleEventWebhook(webhookDto);

      expect(response).toEqual({
        action: 'event.created',
        api_url: 'https://example.com/api',
        endpoint_url: 'https://example.com/webhook',
        webhook_id: 'webhook-id',
        changes: event,
      });

      expect(eventbriteService.syncEvents).toHaveBeenCalledWith(
        'https://example.com/api',
      );
    });

    it('should handle event webhook for other actions', async () => {
      const webhookDto: WebhookDTO = {
        api_url: 'https://example.com/api',
        config: {
          endpoint_url: 'https://example.com/webhook',
          webhook_id: 'webhook-id',
          user_id: 'user-id',
          action: 'event.updated',
        },
      };

      jest.spyOn(eventbriteService, 'syncEvents');

      const response = await controller.handleEventWebhook(webhookDto);

      expect(response).toEqual({
        action: 'event.updated',
        api_url: 'https://example.com/api',
        endpoint_url: 'https://example.com/webhook',
        webhook_id: 'webhook-id',
        changes: {},
      });

      expect(eventbriteService.syncEvents).not.toHaveBeenCalled();
    });
  });
});
