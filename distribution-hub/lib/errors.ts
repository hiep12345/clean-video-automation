export class ActionError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
