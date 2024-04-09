import { Body, Controller, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { EventbriteService } from './eventbrite.service';

export class WebhookConfigDTO {
  @IsString()
  endpoint_url: string;
  @IsString()
  webhook_id: string;
  @IsString()
  user_id: string;
  @IsString()
  action: string;
}

export class WebhookDTO {
  @IsString()
  api_url: string;
  @IsNotEmpty()
  config: WebhookConfigDTO;
}

export class EventWebhookResponse {
  @IsString()
  action: string;
  @IsString()
  api_url: string;
  @IsString()
  endpoint_url: string;
  @IsString()
  webhook_id: string;
  @IsObject()
  changes: any;
}

@Controller('eventbrite')
export class EventbriteController {
  constructor(
    private configService: ConfigService,
    private eventbriteService: EventbriteService,
  ) {
    console.log('Eventbrite controller created');
  }

  @Post('/attendee-webhook')
  async handleAttendeeWebhook(@Body() dto: WebhookDTO): Promise<void> {}

  @Post('/event-webhook')
  async handleEventWebhook(
    @Body() webhookDto: WebhookDTO,
  ): Promise<EventWebhookResponse> {
    if (
      webhookDto.config.action === 'event.created' ||
      webhookDto.config.action === 'event.updated'
    ) {
      const event = await this.eventbriteService.syncEvents(webhookDto.api_url);
      return {
        action: webhookDto.config.action,
        api_url: webhookDto.api_url,
        endpoint_url: webhookDto.config.endpoint_url,
        webhook_id: webhookDto.config.webhook_id,
        changes: event,
      };
    }

    return {
      action: webhookDto.config.action,
      api_url: webhookDto.api_url,
      endpoint_url: webhookDto.config.endpoint_url,
      webhook_id: webhookDto.config.webhook_id,
      changes: {},
    };
  }
}
