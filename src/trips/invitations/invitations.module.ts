import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { MyInvitationsController } from './my-invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [InvitationsController, MyInvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
