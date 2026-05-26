export const PASSWORD_SERVICE_TOKEN = 'IPasswordService';

export interface IPasswordService {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}
