import { Test, TestingModule } from '@nestjs/testing';
import { ParticipationRole, User } from '@prisma/client';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { TripAccessGuard } from '../../common/guards/trip-role.guard';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

describe('InvitationsController', () => {
  let controller: InvitationsController;

  const service = {
    findByTrip: jest.fn(),
    createInvitation: jest.fn(),
    cancel: jest.fn(),
  };

  const actor = { id: 'user-creator' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [{ provide: InvitationsService, useValue: service }],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TripAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InvitationsController>(InvitationsController);
    jest.clearAllMocks();
  });

  it('findAll should delegate to findByTrip', () => {
    service.findByTrip.mockReturnValue('result');

    expect(controller.findAll('trip-1')).toBe('result');
    expect(service.findByTrip).toHaveBeenCalledWith('trip-1');
  });

  it('create should delegate with actor id, invitee id and role', () => {
    controller.create('trip-1', actor, {
      userId: 'user-invitee',
      role: ParticipationRole.SUPERVISOR,
    });

    expect(service.createInvitation).toHaveBeenCalledWith(
      'trip-1',
      'user-creator',
      'user-invitee',
      ParticipationRole.SUPERVISOR,
    );
  });

  it('cancel should delegate with actor id and invitation id', async () => {
    await controller.cancel('trip-1', 'inv-1', actor);

    expect(service.cancel).toHaveBeenCalledWith(
      'trip-1',
      'user-creator',
      'inv-1',
    );
  });
});
