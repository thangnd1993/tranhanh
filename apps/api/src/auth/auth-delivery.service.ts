import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordResetDelivery {
  deliver(email: string, token: string): Promise<void>;
}
export const PASSWORD_RESET_DELIVERY = Symbol('PASSWORD_RESET_DELIVERY');

/** Development/test adapter. It never logs tokens; tests may inspect captured delivery in process memory. */
@Injectable()
export class DevelopmentPasswordResetDelivery implements PasswordResetDelivery {
  private readonly tokens = new Map<string, string>();
  constructor(private readonly config: ConfigService) {}
  async deliver(email: string, token: string): Promise<void> {
    if (this.config.getOrThrow<string>('NODE_ENV') === 'production') return;
    this.tokens.set(email, token);
  }
  take(email: string): string | undefined {
    const token = this.tokens.get(email);
    this.tokens.delete(email);
    return token;
  }
}
