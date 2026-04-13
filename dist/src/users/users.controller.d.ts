import { UsersService } from './users.service';
import { User } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    getProfile(user: User): {
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
    updateProfile(user: User, dto: UpdateUserDto): Promise<{
        id: string;
        clerkId: string;
        email: string;
        name: string;
        avatarUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    search(query: string): Promise<{
        id: string;
        email: string;
        name: string;
        avatarUrl: string | null;
    }[]>;
}
