import { SetMetadata } from '@nestjs/common';

export const SKIP_API_KEY_KEY = 'skipApiKey';

/** Skip the global ApiKeyAuthGuard (e.g. citizen Image loads with HMAC query sig). */
export const SkipApiKey = () => SetMetadata(SKIP_API_KEY_KEY, true);
