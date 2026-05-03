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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripEntity = exports.TripCountEntity = exports.ParticipationEntity = exports.UserPublicEntity = void 0;
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
class UserPublicEntity {
    id;
    name;
    email;
    avatarUrl;
}
exports.UserPublicEntity = UserPublicEntity;
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'b3f8c2e1-4a5d-4f7e-8c6d-9e0f1a2b3c4d',
        format: 'uuid',
    }),
    __metadata("design:type", String)
], UserPublicEntity.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Enrique Seitz' }),
    __metadata("design:type", String)
], UserPublicEntity.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'enrique@example.com' }),
    __metadata("design:type", String)
], UserPublicEntity.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'https://img.clerk.com/abc123.jpeg',
        nullable: true,
        required: false,
    }),
    __metadata("design:type", Object)
], UserPublicEntity.prototype, "avatarUrl", void 0);
class ParticipationEntity {
    id;
    userId;
    tripId;
    role;
    currentBalance;
    joinedAt;
    user;
}
exports.ParticipationEntity = ParticipationEntity;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], ParticipationEntity.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], ParticipationEntity.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], ParticipationEntity.prototype, "tripId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ParticipationRole, example: client_1.ParticipationRole.MEMBER }),
    __metadata("design:type", String)
], ParticipationEntity.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '0.00',
        description: 'Balance neto del participante en el trip, en la baseCurrency del trip. Decimal serializado como string. Positivo = le deben. Negativo = debe.',
    }),
    __metadata("design:type", String)
], ParticipationEntity.prototype, "currentBalance", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-05-03T18:42:00.000Z', format: 'date-time' }),
    __metadata("design:type", String)
], ParticipationEntity.prototype, "joinedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => UserPublicEntity, required: false }),
    __metadata("design:type", UserPublicEntity)
], ParticipationEntity.prototype, "user", void 0);
class TripCountEntity {
    participations;
    expenses;
}
exports.TripCountEntity = TripCountEntity;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 4 }),
    __metadata("design:type", Number)
], TripCountEntity.prototype, "participations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 12 }),
    __metadata("design:type", Number)
], TripCountEntity.prototype, "expenses", void 0);
class TripEntity {
    id;
    name;
    description;
    startDate;
    endDate;
    baseCurrency;
    status;
    createdAt;
    updatedAt;
    deletedAt;
    participations;
    _count;
}
exports.TripEntity = TripEntity;
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'uuid' }),
    __metadata("design:type", String)
], TripEntity.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bariloche 2026' }),
    __metadata("design:type", String)
], TripEntity.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Semana en Bariloche con los chicos', nullable: true }),
    __metadata("design:type", Object)
], TripEntity.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: '2026-07-15',
        format: 'date',
        nullable: true,
    }),
    __metadata("design:type", Object)
], TripEntity.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-22', format: 'date', nullable: true }),
    __metadata("design:type", Object)
], TripEntity.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ARS', description: 'ISO 4217 currency code' }),
    __metadata("design:type", String)
], TripEntity.prototype, "baseCurrency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.TripStatus, example: client_1.TripStatus.ACTIVE }),
    __metadata("design:type", String)
], TripEntity.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], TripEntity.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time' }),
    __metadata("design:type", String)
], TripEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'date-time', nullable: true }),
    __metadata("design:type", Object)
], TripEntity.prototype, "deletedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => [ParticipationEntity], required: false }),
    __metadata("design:type", Array)
], TripEntity.prototype, "participations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: () => TripCountEntity, required: false }),
    __metadata("design:type", TripCountEntity)
], TripEntity.prototype, "_count", void 0);
//# sourceMappingURL=trip.entity.js.map