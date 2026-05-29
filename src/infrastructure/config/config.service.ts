import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  /**
   * Retrieves an environment variable by key.
   * Standard dynamic lookup of process.env.
   */
  get<T = string>(key: string): T | undefined {
    const val = process.env[key];
    if (val === undefined) {
      return undefined;
    }
    return val as unknown as T;
  }
}
