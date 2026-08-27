import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// Registered globally in main.ts. Anything a controller/service didn't
// already turn into a proper HttpException lands here — without this, an
// unexpected error (a bad Prisma query, a null-deref) would leak its raw
// message and stack straight into the HTTP response.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const { status, body } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const request =
        host.getType() === 'http'
          ? host.switchToHttp().getRequest<Request>()
          : undefined;
      this.logger.error(
        `${request ? `${request.method} ${request.url} -> ` : ''}${status}: ${
          exception instanceof Error ? exception.message : String(exception)
        }`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // WS/RPC contexts have no Express response to write to — the logging
    // above is all we can safely do here without crashing the gateway.
    if (host.getType() !== 'http') return;

    const response = host.switchToHttp().getResponse<Response>();
    response.status(status).json(body);
  }

  private resolve(exception: unknown): { status: number; body: ErrorBody } {
    // Nest's own exceptions (BadRequestException, NotFoundException, the
    // ValidationPipe's 400s, ...) already carry the right status and a
    // client-safe message — pass them through unchanged.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const body: ErrorBody =
        typeof raw === 'string'
          ? { statusCode: status, message: raw }
          : { ...(raw as Record<string, unknown>), statusCode: status } as ErrorBody;
      return { status, body };
    }

    // Prisma errors a service didn't already catch — map the common cases
    // instead of letting a raw internal error message reach the client.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            statusCode: HttpStatus.CONFLICT,
            message: 'A record with this value already exists.',
          },
        };
      }
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          body: { statusCode: HttpStatus.NOT_FOUND, message: 'Record not found.' },
        };
      }
    }

    // Anything else is a bug — it's fully logged above; the client only
    // ever sees a generic message, never internals.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      },
    };
  }
}
