export abstract class ChecklogAccess {
  abstract authorize(
    cookie?: string,
  ): Promise<{ id: string; username: string }>;
}
