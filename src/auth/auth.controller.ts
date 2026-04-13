import {
  Controller,
  Post,
  Req,
  Res,
  RawBody,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Clerk webhook events' })
  async handleWebhook(
    @RawBody() rawBody: Buffer,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const webhookSecret = this.configService.get<string>(
      'clerk.webhookSecret',
    );

    if (!webhookSecret) {
      this.logger.error('CLERK_WEBHOOK_SECRET is not configured');
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Webhook secret not configured' });
    }

    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Missing svix headers' });
    }

    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      const payload = rawBody.toString('utf8');
      evt = wh.verify(payload, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      this.logger.error('Webhook verification failed', err);
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: 'Invalid webhook signature' });
    }

    const eventType = evt.type;
    this.logger.log(`Received Clerk webhook: ${eventType}`);

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;
      const primaryEmail = email_addresses?.[0]?.email_address;
      const name = [first_name, last_name].filter(Boolean).join(' ') || 'User';

      try {
        const user = await this.authService.upsertUser({
          clerkId: id,
          email: primaryEmail,
          name,
          avatarUrl: image_url,
        });
        this.logger.log(`User synced: ${user.email} (${eventType})`);
      } catch (err) {
        this.logger.error(`Failed to sync user ${id}`, err);
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Failed to sync user' });
      }
    }

    if (eventType === 'user.deleted') {
      try {
        await this.authService.deleteUser(evt.data.id);
        this.logger.log(`User deleted: ${evt.data.id}`);
      } catch {
        this.logger.warn(`User ${evt.data.id} not found for deletion`);
      }
    }

    return res.status(HttpStatus.OK).json({ received: true });
  }
}
