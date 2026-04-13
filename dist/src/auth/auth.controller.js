"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const svix_1 = require("svix");
const auth_service_1 = require("./auth.service");
let AuthController = AuthController_1 = class AuthController {
    authService;
    configService;
    logger = new common_1.Logger(AuthController_1.name);
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
    }
    async handleWebhook(rawBody, req, res) {
        const webhookSecret = this.configService.get('clerk.webhookSecret');
        if (!webhookSecret) {
            this.logger.error('CLERK_WEBHOOK_SECRET is not configured');
            return res
                .status(common_1.HttpStatus.INTERNAL_SERVER_ERROR)
                .json({ message: 'Webhook secret not configured' });
        }
        const svixId = req.headers['svix-id'];
        const svixTimestamp = req.headers['svix-timestamp'];
        const svixSignature = req.headers['svix-signature'];
        if (!svixId || !svixTimestamp || !svixSignature) {
            return res
                .status(common_1.HttpStatus.BAD_REQUEST)
                .json({ message: 'Missing svix headers' });
        }
        const wh = new svix_1.Webhook(webhookSecret);
        let evt;
        try {
            const payload = rawBody.toString('utf8');
            evt = wh.verify(payload, {
                'svix-id': svixId,
                'svix-timestamp': svixTimestamp,
                'svix-signature': svixSignature,
            });
        }
        catch (err) {
            this.logger.error('Webhook verification failed', err);
            return res
                .status(common_1.HttpStatus.BAD_REQUEST)
                .json({ message: 'Invalid webhook signature' });
        }
        const eventType = evt.type;
        this.logger.log(`Received Clerk webhook: ${eventType}`);
        if (eventType === 'user.created' || eventType === 'user.updated') {
            const { id, email_addresses, first_name, last_name, image_url } = evt.data;
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
            }
            catch (err) {
                this.logger.error(`Failed to sync user ${id}`, err);
                return res
                    .status(common_1.HttpStatus.INTERNAL_SERVER_ERROR)
                    .json({ message: 'Failed to sync user' });
            }
        }
        if (eventType === 'user.deleted') {
            try {
                await this.authService.deleteUser(evt.data.id);
                this.logger.log(`User deleted: ${evt.data.id}`);
            }
            catch {
                this.logger.warn(`User ${evt.data.id} not found for deletion`);
            }
        }
        return res.status(common_1.HttpStatus.OK).json({ received: true });
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('webhook'),
    (0, swagger_1.ApiOperation)({ summary: 'Handle Clerk webhook events' }),
    __param(0, (0, common_1.RawBody)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Buffer, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "handleWebhook", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map