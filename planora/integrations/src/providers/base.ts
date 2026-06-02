export abstract class BaseProvider {
  abstract readonly name: string;

  abstract initialize(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;
}
