import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    private configService;
    private readonly logger;
    constructor(authService: AuthService, configService: ConfigService);
    handleWebhook(rawBody: Buffer, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
