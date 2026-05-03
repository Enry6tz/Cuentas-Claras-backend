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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const clerk_auth_guard_1 = require("../common/guards/clerk-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const error_response_dto_1 = require("../common/dto/error-response.dto");
const create_trip_dto_1 = require("./dto/create-trip.dto");
const update_trip_dto_1 = require("./dto/update-trip.dto");
const trip_entity_1 = require("./entities/trip.entity");
const trips_service_1 = require("./trips.service");
let TripsController = class TripsController {
    tripsService;
    constructor(tripsService) {
        this.tripsService = tripsService;
    }
    findAll(user) {
        return this.tripsService.findAllForUser(user.id);
    }
    create(user, dto) {
        return this.tripsService.create(user.id, dto);
    }
    findOne(user, id) {
        return this.tripsService.findOne(user.id, id);
    }
    update(user, id, dto) {
        return this.tripsService.update(user.id, id, dto);
    }
    async remove(user, id) {
        await this.tripsService.remove(user.id, id);
    }
};
exports.TripsController = TripsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Listar mis trips',
        description: 'Devuelve todos los trips donde el usuario autenticado es participante (CREATOR, SUPERVISOR o MEMBER). Excluye trips soft-deleted. Cada trip viene con `_count` (cantidad de participantes y gastos).',
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Lista de trips ordenada por createdAt desc.',
        schema: {
            properties: {
                data: {
                    type: 'array',
                    items: { $ref: (0, swagger_1.getSchemaPath)(trip_entity_1.TripEntity) },
                },
            },
        },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TripsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Crear un trip',
        description: 'Crea un trip y registra al usuario autenticado como `CREATOR` (rol unico por trip). Operacion atomica: Trip + Participation se crean en la misma transaccion.',
    }),
    (0, swagger_1.ApiBody)({ type: create_trip_dto_1.CreateTripDto }),
    (0, swagger_1.ApiCreatedResponse)({
        description: 'Trip creado. La respuesta incluye el primer participante (yo, como CREATOR).',
        schema: {
            properties: {
                data: { $ref: (0, swagger_1.getSchemaPath)(trip_entity_1.TripEntity) },
            },
        },
    }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Body invalido (campos faltantes, formato incorrecto, etc.).',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_trip_dto_1.CreateTripDto]),
    __metadata("design:returntype", void 0)
], TripsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Detalle de un trip',
        description: 'Devuelve el trip con la lista completa de participantes (incluye datos publicos del User). Falla con 403 si el usuario no es participante, o 404 si el trip no existe o esta soft-deleted.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid', description: 'UUID del trip' }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Trip encontrado, con participantes y datos de cada uno.',
        schema: {
            properties: {
                data: { $ref: (0, swagger_1.getSchemaPath)(trip_entity_1.TripEntity) },
            },
        },
    }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'El parametro `id` no es un UUID valido.',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiForbiddenResponse)({
        description: 'No sos participante de este trip.',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiNotFoundResponse)({
        description: 'No existe trip con ese id (o esta soft-deleted).',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TripsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({
        summary: 'Actualizar un trip',
        description: 'Solo el `CREATOR` del trip puede actualizarlo (BR02). Permite cambiar nombre, descripcion, fechas, baseCurrency, y/o status (ACTIVE <-> FINALIZED). Todos los campos del body son opcionales.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiBody)({ type: update_trip_dto_1.UpdateTripDto }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Trip actualizado.',
        schema: {
            properties: {
                data: { $ref: (0, swagger_1.getSchemaPath)(trip_entity_1.TripEntity) },
            },
        },
    }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'Body invalido o `id` mal formado.',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiForbiddenResponse)({
        description: 'No sos CREATOR del trip (BR02).',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiNotFoundResponse)({
        description: 'No existe trip con ese id, o esta soft-deleted.',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_trip_dto_1.UpdateTripDto]),
    __metadata("design:returntype", void 0)
], TripsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({
        summary: 'Eliminar (soft delete) un trip',
        description: 'Solo el `CREATOR` puede eliminar (BR02). Implementacion soft-delete: setea `deletedAt = NOW()`. Los datos del trip (participaciones, gastos, pagos) NO se borran, solo se ocultan de los listados.',
    }),
    (0, swagger_1.ApiParam)({ name: 'id', format: 'uuid' }),
    (0, swagger_1.ApiNoContentResponse)({
        description: 'Trip eliminado (soft). Sin body en la respuesta.',
    }),
    (0, swagger_1.ApiBadRequestResponse)({
        description: 'El parametro `id` no es un UUID valido.',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiForbiddenResponse)({
        description: 'No sos CREATOR del trip (BR02).',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    (0, swagger_1.ApiNotFoundResponse)({
        description: 'No existe trip con ese id, o ya estaba soft-deleted.',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TripsController.prototype, "remove", null);
exports.TripsController = TripsController = __decorate([
    (0, swagger_1.ApiTags)('Trips'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiExtraModels)(trip_entity_1.TripEntity),
    (0, swagger_1.ApiUnauthorizedResponse)({
        description: 'Falta JWT, esta vencido, o es invalido.',
        type: error_response_dto_1.ErrorResponseDto,
    }),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    (0, common_1.Controller)('trips'),
    __metadata("design:paramtypes", [trips_service_1.TripsService])
], TripsController);
//# sourceMappingURL=trips.controller.js.map