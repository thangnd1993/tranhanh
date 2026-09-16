import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, SignJWT } from 'jose';

export interface AccessClaims {
  userId: string;
  sessionId: string;
  issuedAt: Date;
  expiresAt: Date;
}
@Injectable()
export class AuthTokenService {
  private readonly audience = 'tranhanh-api';
  private readonly issuer = 'tranhanh-auth';
  private readonly secret: Uint8Array;
  private readonly ttlSeconds: number;
  constructor(config: ConfigService) {
    this.secret = new TextEncoder().encode(config.getOrThrow<string>('AUTH_ACCESS_SECRET'));
    this.ttlSeconds = config.getOrThrow<number>('AUTH_ACCESS_TTL_SECONDS');
  }
  async sign(userId: string, sessionId: string): Promise<{ token: string; expiresAt: Date }> {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + this.ttlSeconds * 1000);
    const token = await new SignJWT({ sid: sessionId, type: 'access' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setJti(randomUUID())
      .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.secret);
    return { token, expiresAt };
  }
  async verify(token: string): Promise<AccessClaims> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        algorithms: ['HS256'],
        audience: this.audience,
        issuer: this.issuer,
      });
      if (payload.type !== 'access' || !payload.sub || typeof payload.sid !== 'string' || !payload.iat || !payload.exp)
        throw new Error('Invalid claims');
      return {
        userId: payload.sub,
        sessionId: payload.sid,
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: new Date(payload.exp * 1000),
      };
    } catch {
      throw new UnauthorizedException('Authentication required.');
    }
  }
}
