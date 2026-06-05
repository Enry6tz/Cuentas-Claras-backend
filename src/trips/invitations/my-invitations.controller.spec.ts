import { Test, TestingModule } from '@nestjs/testing';
import { User } from '@prisma/client';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { MyInvitationsController } from './my-invitations.controller';
import { InvitationsService } from './invitations.service';

describe('MyInvitationsController', () => {
  let controller: MyInvitationsController;

  const service = {
    findForUser: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
  };

  const user = { id: 'user-invitee' } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MyInvitationsController],
      providers: [{ provide: InvitationsService, useValue: service }],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MyInvitationsController>(MyInvitationsController);
    jest.clearAllMocks();
  });

  it('findMine should delegate to findForUser with the current user id', () => {
    service.findForUser.mockReturnValue('result');

    expect(controller.findMine(user)).toBe('result');
    expect(service.findForUser).toHaveBeenCalledWith('user-invitee');
  });

  it('accept should delegate with invitation id and current user id', () => {
    controller.accept('inv-1', user);

    expect(service.accept).toHaveBeenCalledWith('inv-1', 'user-invitee');
  });

  it('reject should delegate with invitation id and current user id', () => {
    controller.reject('inv-1', user);

    expect(service.reject).toHaveBeenCalledWith('inv-1', 'user-invitee');
  });
});
