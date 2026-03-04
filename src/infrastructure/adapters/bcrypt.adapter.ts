import { compare, hash } from "bcryptjs";

export class BcryptAdapter {
  static async hash(plainText: string, saltRounds = 10): Promise<string> {
    return await hash(plainText, saltRounds);
  }

  static async compare(plainText: string, hash: string): Promise<boolean> {
    return await compare(plainText, hash);
  }
}
