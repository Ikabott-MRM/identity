import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DidJwtAuthGuard extends AuthGuard('did-jwt') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const required = this.configService.get<boolean>('didAuth.required');
    if (required === false) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const required = this.configService.get<boolean>('didAuth.required');
    if (required === false) {
      return user || null;
    }
    if (err || !user) {
      throw err || new UnauthorizedException(info?.message || 'Unauthorized');
    }

    const request = context.switchToHttp().getRequest();
    const pathDid = request.params?.did;
    if (pathDid && user.did !== pathDid) {
      throw new ForbiddenException('JWT DID does not match path DID.');
    }

    return user;
  }
}
