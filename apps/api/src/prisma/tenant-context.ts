import { AsyncLocalStorage } from 'async_hooks';

export class TenantContext {
  private static storage = new AsyncLocalStorage<{ tenantId: string | null }>();

  static run<T>(tenantId: string | null, callback: () => T): T {
    return this.storage.run({ tenantId }, callback);
  }

  static getTenantId(): string | null {
    const store = this.storage.getStore();
    return store ? store.tenantId : null;
  }
}
