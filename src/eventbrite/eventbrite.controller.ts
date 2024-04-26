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

export class WebhookResponse {
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
  constructor(private eventbriteService: EventbriteService) {}

  @Post('/attendee-webhook')
  async handleAttendeeWebhook(
    @Body() dto: WebhookDTO,
  ): Promise<WebhookResponse> {
    console.log({ dto });
    if (dto.config.action === 'attendee.updated') {
      const attendee = await this.eventbriteService.syncAttendee(dto.api_url);
      return {
        action: dto.config.action,
        api_url: dto.api_url,
        endpoint_url: dto.config.endpoint_url,
        webhook_id: dto.config.webhook_id,
        changes: attendee,
      };
    }
  }

  @Post('/order-webhook')
  async handleOrderWebhook(@Body() dto: WebhookDTO): Promise<WebhookResponse> {
    console.log({ dto });
    if (
      dto.config.action === 'order.updated' ||
      dto.config.action === 'order.placed' ||
      dto.config.action === 'order.refunded'
    ) {
      const order = await this.eventbriteService.syncOrder(dto.api_url);
      return {
        action: dto.config.action,
        api_url: dto.api_url,
        endpoint_url: dto.config.endpoint_url,
        webhook_id: dto.config.webhook_id,
        changes: order,
      };
    }
  }

  @Post('/event-webhook')
  async handleEventWebhook(
    @Body() webhookDto: WebhookDTO,
  ): Promise<WebhookResponse> {
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
