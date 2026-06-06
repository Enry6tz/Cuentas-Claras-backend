import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Codigo de error de negocio en SNAKE_UPPER_CASE por cada HTTP status.
 * Se usa como fallback cuando un `throw` no provee un `code` propio.
 */
const STATUS_CODE_MAP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Filtro global que unifica TODAS las respuestas de error al formato del
 * Entregable 4:
 *
 *   { "error": { "code": "TRIP_NOT_FOUND", "message": "...", "details": ... } }
 *
 * - HttpException con response objeto que trae `code` -> se usa tal cual.
 * - Errores de validacion del ValidationPipe (message: string[]) -> VALIDATION_ERROR.
 * - HttpException estandar -> el `code` se deriva del status (ver STATUS_CODE_MAP).
 * - Prisma.PrismaClientKnownRequestError -> se mapea a status + code de negocio.
 * - Cualquier otra cosa -> 500 INTERNAL_SERVER_ERROR.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, body } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${body.error.code}: ${body.error.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        },
      },
    };
  }

  private fromHttpException(exception: HttpException): {
    status: number;
    body: ErrorBody;
  } {
    const status = exception.getStatus();
    const res = exception.getResponse();
    const fallbackCode = STATUS_CODE_MAP[status] ?? 'ERROR';

    // Response como string simple: `new NotFoundException('Trip not found')`
    if (typeof res === 'string') {
      return {
        status,
        body: { error: { code: fallbackCode, message: res } },
      };
    }

    const r = res as Record<string, unknown>;

    // Forma de dominio: `new NotFoundException({ code, message, details })`
    if (typeof r.code === 'string') {
      return {
        status,
        body: {
          error: {
            code: r.code,
            message: this.asMessage(r.message) ?? exception.message,
            ...(r.details !== undefined ? { details: r.details } : {}),
          },
        },
      };
    }

    // Errores de validacion del ValidationPipe: message es un array
    if (Array.isArray(r.message)) {
      return {
        status,
        body: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: r.message,
          },
        },
      };
    }

    // HttpException estandar de NestJS: { statusCode, message, error }
    return {
      status,
      body: {
        error: {
          code: fallbackCode,
          message: this.asMessage(r.message) ?? exception.message,
        },
      },
    };
  }

  private fromPrisma(exception: Prisma.PrismaClientKnownRequestError): {
    status: number;
    body: ErrorBody;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          body: {
            error: {
              code: 'RESOURCE_ALREADY_EXISTS',
              message: 'A record with this value already exists',
            },
          },
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          body: {
            error: { code: 'NOT_FOUND', message: 'Record not found' },
          },
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          body: {
            error: {
              code: 'FOREIGN_KEY_CONSTRAINT',
              message: 'Foreign key constraint failed',
            },
          },
        };
      default:
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          body: {
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Internal server error',
            },
          },
        };
    }
  }

  private asMessage(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}
