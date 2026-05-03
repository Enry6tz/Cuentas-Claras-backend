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
exports.UpdateTripDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
const create_trip_dto_1 = require("./create-trip.dto");
class UpdateTripDto extends (0, swagger_1.PartialType)(create_trip_dto_1.CreateTripDto) {
    status;
}
exports.UpdateTripDto = UpdateTripDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        enum: client_1.TripStatus,
        description: 'ACTIVE = acepta gastos/pagos. FINALIZED = solo lectura.',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(client_1.TripStatus),
    __metadata("design:type", String)
], UpdateTripDto.prototype, "status", void 0);
//# sourceMappingURL=update-trip.dto.js.map