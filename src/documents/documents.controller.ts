import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
  Req,
  StreamableFile,
  UnauthorizedException,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { createReadStream, existsSync, statSync } from 'fs';
import { basename, join, normalize, resolve } from 'path';
import { Knex } from 'knex';
import { Response } from 'express';
import { SkipApiKey } from '../auth/decorators/skip-api-key.decorator';
import { DidAuthService } from '../auth/did-auth/did-auth.service';
import { AuthService } from '../auth/auth.service';
import {
  DocumentUrlService,
  EMISOR_ROLE,
  VERIFIER_ROLE,
} from './document-url.service';
import { VerifierSessionService } from '../verifier/verifier-session.service';

@ApiTags('documents')
@ApiSecurity('api-key')
@Controller('documents')
export class DocumentsController {
  /** Multer dest is `documents/` relative to process.cwd(). */
  private readonly documentsRoot = resolve(join(process.cwd(), 'documents'));

  constructor(
    private readonly documentUrlService: DocumentUrlService,
    private readonly authService: AuthService,
    private readonly didAuthService: DidAuthService,
    private readonly verifierSessionService: VerifierSessionService,
    @Inject('KnexConnection') private readonly knex: Knex,
  ) {}

  @Get(':documentId/url')
  @ApiOperation({
    summary:
      'Return a short-lived signed URL (subject DID JWT, verifier session, or Emisor API key)',
  })
  async getSignedUrl(
    @Param('documentId') documentId: string,
    @Req() req: { headers: Record<string, string | undefined> },
  ) {
    const request = await this.knex('request')
      .where({ document_id: documentId })
      .first();
    if (!request) {
      throw new NotFoundException('Document not found.');
    }

    const authorization = req.headers['authorization'];

    // Verifier session Bearer → mint role:verifier signed URL
    const verifierUser =
      this.verifierSessionService.tryVerifyBearer(authorization);
    if (verifierUser) {
      this.verifierSessionService.assertDocumentsRead(verifierUser);
      return {
        url: this.documentUrlService.createAccessUrl(
          documentId,
          VERIFIER_ROLE,
        ),
        document_id: documentId,
      };
    }

    // Subject DID JWT → ownership check
    if (authorization?.startsWith('Bearer ')) {
      try {
        const token = authorization.slice('Bearer '.length).trim();
        const didUser = this.didAuthService.verifyAccessToken(token);
        if (request.subject_did !== didUser.did) {
          throw new ForbiddenException('Document not owned by this DID.');
        }
        return {
          url: this.documentUrlService.createAccessUrl(
            documentId,
            didUser.did,
          ),
          document_id: documentId,
        };
      } catch (err) {
        if (
          err instanceof ForbiddenException ||
          err instanceof UnauthorizedException
        ) {
          throw err;
        }
      }
    }

    // Emisor: valid API key alone mints role:emisor URL
    const apiKey = req.headers['x-api-key'];
    if (apiKey && (await this.authService.validateApiKey(apiKey))) {
      return {
        url: this.documentUrlService.createAccessUrl(documentId, EMISOR_ROLE),
        document_id: documentId,
      };
    }

    throw new UnauthorizedException(
      'DID JWT, verifier session, or valid API key required.',
    );
  }

  /**
   * Signed document download. Citizen Image tags cannot send x-api-key, so this
   * route skips the API key guard and relies on HMAC query params instead.
   * Emisor / Verifier role URLs still require API key and/or verifier Bearer.
   */
  @Get(':documentId')
  @SkipApiKey()
  @ApiOperation({
    summary: 'Stream a document when a valid HMAC signature is present',
  })
  async getDocument(
    @Param('documentId') documentId: string,
    @Query('exp') exp: string,
    @Query('did') didOrRole: string,
    @Query('sig') sig: string,
    @Req() req: { headers: Record<string, string | undefined> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    if (!exp || !didOrRole || !sig) {
      throw new UnauthorizedException(
        'Missing document signature parameters (exp, did, sig).',
      );
    }

    this.documentUrlService.assertValid(documentId, exp, didOrRole, sig);

    const request = await this.knex('request')
      .where({ document_id: documentId })
      .first();
    if (!request) {
      throw new NotFoundException('Document not found.');
    }

    if (didOrRole.startsWith('did:')) {
      if (request.subject_did !== didOrRole) {
        throw new ForbiddenException('Document not owned by this DID.');
      }
    } else if (didOrRole === EMISOR_ROLE) {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || !(await this.authService.validateApiKey(apiKey))) {
        throw new UnauthorizedException(
          'Emisor document URLs require a valid x-api-key.',
        );
      }
    } else if (didOrRole === VERIFIER_ROLE) {
      // Session required for photo fetch (HMAC already validated above).
      const authorization = req.headers['authorization'];
      const verifierUser =
        this.verifierSessionService.tryVerifyBearer(authorization);
      if (!verifierUser) {
        throw new UnauthorizedException(
          'Verifier document URLs require a valid verifier session Bearer token.',
        );
      }
      this.verifierSessionService.assertDocumentsRead(verifierUser);
    } else {
      throw new ForbiddenException('Unsupported document access principal.');
    }

    const storedPath = request.document_url as string;
    const safeName = basename(storedPath || '');
    if (!safeName) {
      throw new NotFoundException('Document file missing.');
    }

    const filePath = normalize(join(this.documentsRoot, safeName));
    if (!filePath.startsWith(this.documentsRoot)) {
      throw new ForbiddenException('Invalid document path.');
    }
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      throw new NotFoundException('Document not found.');
    }

    res.setHeader('Cache-Control', 'private, max-age=60');

    return new StreamableFile(createReadStream(filePath), {
      disposition: `inline; filename="${safeName}"`,
    });
  }
}
