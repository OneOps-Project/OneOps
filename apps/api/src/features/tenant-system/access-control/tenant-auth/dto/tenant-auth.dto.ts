import { z } from "zod";
export const loginInput = z
  .object({
    username: z.string().trim().toLowerCase().min(1).max(254),
    password: z.string().min(1).max(128),
  })
  .strict();
export type AuthIdentity = {
  id: string;
  username: string;
  role: "EMPLOYEE" | "MANAGER";
  superAdmin: boolean;
  manageAccounts: boolean;
  status: string;
  version: number;
};
export abstract class AuthAccounts {
  abstract authenticate(
    login: string,
    password: string,
  ): Promise<AuthIdentity | null>;
  abstract identity(id: string): Promise<AuthIdentity>;
}
