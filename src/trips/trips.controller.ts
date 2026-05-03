import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ErrorResponseDto } from '../common/dto/error-response.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripEntity } from './entities/trip.entity';
import { TripsService } from './trips.service';

/**
 * El CONTROLLER es la capa que expone HTTP. Su unico rol:
 *   - Recibir la request (con la URL y el body validado por el DTO).
 *   - Sacar el user actual del context (via `@CurrentUser()`).
 *   - Llamar al service.
 *   - Devolver la respuesta.
 *
 * No hay logica de negocio aca. Si tenes una validacion compleja o un calculo,
 * va al service. El controller debe leerse en 5 segundos.
 *
 * Decoradores aplicados a TODA la clase:
 *   @UseGuards(ClerkAuthGuard) -> bloquea cualquier request sin JWT valido de Clerk.
 *                                  El guard, por debajo, llama a la JwtStrategy
 *                                  que valida el token y popula `request.user`.
 *   @Controller('trips')       -> prefijo de rutas. Todas las rutas de aca
 *                                  empiezan con `/trips`.
 *   @ApiTags / @ApiBearerAuth  -> documentacion en Swagger (/api).
 *
 * @ApiExtraModels:
 *   Como `TripEntity` no aparece como `type` directo en ningun decorator
 *   (lo metemos manualmente en `schema` para envolverlo en `{ data }`),
 *   Swagger no lo descubriria automaticamente. Con @ApiExtraModels se lo
 *   forzamos para que quede registrado en components/schemas y poder
 *   referenciarlo con getSchemaPath().
 *
 * Sobre el wrap `{ data: ... }`:
 *   El TransformInterceptor global envuelve TODA respuesta exitosa en
 *   `{ data: T }`. Por eso en cada @ApiOkResponse / @ApiCreatedResponse
 *   describimos un objeto con una propiedad `data` que contiene el entity.
 */
@ApiTags('Trips')
@ApiBearerAuth()
@ApiExtraModels(TripEntity)
@ApiUnauthorizedResponse({
  description: 'Falta JWT, esta vencido, o es invalido.',
  type: ErrorResponseDto,
})
@UseGuards(ClerkAuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private tripsService: TripsService) {}

  /**
   * GET /trips -> listar mis trips.
   *
   * `@CurrentUser()` es un decorator custom que devuelve el `request.user`,
   * que es el registro completo de User de la DB (la JwtStrategy lo cargo
   * con `prisma.user.findUnique({ where: { clerkId } })`).
   *
   * Asi el service recibe `user.id` (UUID interno) y NO el clerkId, manteniendo
   * el dominio interno del backend desacoplado del IdP externo.
   */
  @Get()
  @ApiOperation({
    summary: 'Listar mis trips',
    description:
      'Devuelve todos los trips donde el usuario autenticado es participante (CREATOR, SUPERVISOR o MEMBER). Excluye trips soft-deleted. Cada trip viene con `_count` (cantidad de participantes y gastos).',
  })
  @ApiOkResponse({
    description: 'Lista de trips ordenada por createdAt desc.',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(TripEntity) },
        },
      },
    },
  })
  findAll(@CurrentUser() user: User) {
    return this.tripsService.findAllForUser(user.id);
  }

  /**
   * POST /trips -> crear un trip.
   *
   * `@Body() dto: CreateTripDto` -> Nest deserializa el JSON del body al DTO,
   * y el ValidationPipe global valida los decoradores. Si algo falla, devuelve
   * 400 Bad Request automaticamente con detalles del error.
   */
  @Post()
  @ApiOperation({
    summary: 'Crear un trip',
    description:
      'Crea un trip y registra al usuario autenticado como `CREATOR` (rol unico por trip). Operacion atomica: Trip + Participation se crean en la misma transaccion.',
  })
  @ApiBody({ type: CreateTripDto })
  @ApiCreatedResponse({
    description: 'Trip creado. La respuesta incluye el primer participante (yo, como CREATOR).',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(TripEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Body invalido (campos faltantes, formato incorrecto, etc.).',
    type: ErrorResponseDto,
  })
  create(@CurrentUser() user: User, @Body() dto: CreateTripDto) {
    return this.tripsService.create(user.id, dto);
  }

  /**
   * GET /trips/:id -> detalle de un trip.
   *
   * `ParseUUIDPipe` valida que el param sea un UUID valido. Si manda
   * "/trips/banana" devuelve 400 sin siquiera entrar al handler.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de un trip',
    description:
      'Devuelve el trip con la lista completa de participantes (incluye datos publicos del User). Falla con 403 si el usuario no es participante, o 404 si el trip no existe o esta soft-deleted.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'UUID del trip' })
  @ApiOkResponse({
    description: 'Trip encontrado, con participantes y datos de cada uno.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(TripEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'El parametro `id` no es un UUID valido.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'No sos participante de este trip.',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe trip con ese id (o esta soft-deleted).',
    type: ErrorResponseDto,
  })
  findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.tripsService.findOne(user.id, id);
  }

  /**
   * PATCH /trips/:id -> actualizar un trip.
   *
   * Usamos PATCH (no PUT) porque mandamos un subset de campos: solo lo que
   * cambia. PUT seria un reemplazo completo. La convencion REST moderna usa
   * PATCH para updates parciales.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar un trip',
    description:
      'Solo el `CREATOR` del trip puede actualizarlo (BR02). Permite cambiar nombre, descripcion, fechas, baseCurrency, y/o status (ACTIVE <-> FINALIZED). Todos los campos del body son opcionales.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBody({ type: UpdateTripDto })
  @ApiOkResponse({
    description: 'Trip actualizado.',
    schema: {
      properties: {
        data: { $ref: getSchemaPath(TripEntity) },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Body invalido o `id` mal formado.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'No sos CREATOR del trip (BR02).',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe trip con ese id, o esta soft-deleted.',
    type: ErrorResponseDto,
  })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.update(user.id, id, dto);
  }

  /**
   * DELETE /trips/:id -> soft delete del trip.
   *
   * `@HttpCode(204)` hace que respondamos "204 No Content" (la convencion REST
   * para delete exitoso). Sin esto, Nest devolveria 200 con body vacio.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar (soft delete) un trip',
    description:
      'Solo el `CREATOR` puede eliminar (BR02). Implementacion soft-delete: setea `deletedAt = NOW()`. Los datos del trip (participaciones, gastos, pagos) NO se borran, solo se ocultan de los listados.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({
    description: 'Trip eliminado (soft). Sin body en la respuesta.',
  })
  @ApiBadRequestResponse({
    description: 'El parametro `id` no es un UUID valido.',
    type: ErrorResponseDto,
  })
  @ApiForbiddenResponse({
    description: 'No sos CREATOR del trip (BR02).',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No existe trip con ese id, o ya estaba soft-deleted.',
    type: ErrorResponseDto,
  })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tripsService.remove(user.id, id);
  }
}
