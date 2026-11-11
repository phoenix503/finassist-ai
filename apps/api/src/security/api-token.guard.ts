import {
  CanActivate,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.DOCUMENTS_API_TOKEN;
    if (!expected) {
      throw new ServiceUnavailableException('Document API authentication is not configured');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.header('authorization') ?? '';
    const match = /^Bearer (.+)$/.exec(authorization);
    const supplied = match?.[1] ?? '';
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);

    if (
      expectedBuffer.length !== suppliedBuffer.length ||
      !timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
      throw new UnauthorizedException('A valid bearer token is required');
    }

    return true;
  }
}
