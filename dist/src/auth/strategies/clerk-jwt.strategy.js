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
var ClerkJwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkJwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const jwks_rsa_1 = require("jwks-rsa");
const prisma_service_1 = require("../../prisma/prisma.service");
let ClerkJwtStrategy = ClerkJwtStrategy_1 = class ClerkJwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'clerk-jwt') {
    configService;
    prisma;
    logger = new common_1.Logger(ClerkJwtStrategy_1.name);
    constructor(configService, prisma) {
        const issuerUrl = configService.get('clerk.issuerUrl');
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKeyProvider: (0, jwks_rsa_1.passportJwtSecret)({
                jwksUri: `${issuerUrl}/.well-known/jwks.json`,
                cache: true,
                rateLimit: true,
            }),
            issuer: issuerUrl,
            algorithms: ['RS256'],
        });
        this.configService = configService;
        this.prisma = prisma;
    }
    async validate(payload) {
        let user = await this.prisma.user.findUnique({
            where: { clerkId: payload.sub },
        });
        if (!user) {
            this.logger.log(`User ${payload.sub} not in DB, creating from JWT claims`);
            try {
                user = await this.prisma.user.create({
                    data: {
                        clerkId: payload.sub,
                        email: payload.email ?? `${payload.sub}@clerk.dev`,
                        name: [payload.first_name, payload.last_name]
                            .filter(Boolean)
                            .join(' ') || 'User',
                        avatarUrl: payload.image_url ?? null,
                    },
                });
            }
            catch {
                user = await this.prisma.user.findUnique({
                    where: { clerkId: payload.sub },
                });
            }
        }
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
};
exports.ClerkJwtStrategy = ClerkJwtStrategy;
exports.ClerkJwtStrategy = ClerkJwtStrategy = ClerkJwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], ClerkJwtStrategy);
//# sourceMappingURL=clerk-jwt.strategy.js.map