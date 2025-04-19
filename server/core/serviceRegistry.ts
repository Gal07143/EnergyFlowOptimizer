/**
 * Service Registry for Energy Management System
 * 
 * This module provides a centralized registry for all services in the EMS.
 * It handles service lifecycle management, dependency injection, and discovery.
 */

export interface ServiceLifecycle {
  initialize?(): Promise<void>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

export interface ServiceConfig {
  dependencies?: string[];
  [key: string]: any;
}

export class ServiceRegistry {
  private static instance: ServiceRegistry;
  private services: Map<string, any> = new Map();
  private configs: Map<string, ServiceConfig> = new Map();
  private initialized: Set<string> = new Set();
  private started: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    return ServiceRegistry.instance;
  }

  /**
   * Register a service with the registry
   * @param name Service name
   * @param serviceInstance Service instance
   * @param config Service configuration
   */
  public register<T>(name: string, serviceInstance: T, config: ServiceConfig = {}): void {
    if (this.services.has(name)) {
      console.warn(`Service ${name} is already registered. Overwriting.`);
    }
    
    this.services.set(name, serviceInstance);
    this.configs.set(name, config);
    console.log(`Service registered: ${name}`);
  }

  /**
   * Get a service by name
   * @param name Service name
   * @returns Service instance
   */
  public getService<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }
    return service as T;
  }

  /**
   * Check if a service exists
   * @param name Service name
   * @returns boolean indicating if service exists
   */
  public hasService(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Initialize a specific service and its dependencies
   * @param name Service name
   */
  public async initializeService(name: string): Promise<void> {
    if (this.initialized.has(name)) {
      return;
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Cannot initialize service ${name}: Not registered`);
    }

    const config = this.configs.get(name) || {};
    
    // Initialize dependencies first
    if (config.dependencies && config.dependencies.length > 0) {
      for (const dependency of config.dependencies) {
        await this.initializeService(dependency);
      }
    }

    // Initialize the service if it implements the lifecycle interface
    if (service.initialize && typeof service.initialize === 'function') {
      console.log(`Initializing service: ${name}`);
      await service.initialize();
    }

    this.initialized.add(name);
  }

  /**
   * Start a specific service and its dependencies
   * @param name Service name
   */
  public async startService(name: string): Promise<void> {
    if (this.started.has(name)) {
      return;
    }

    // Ensure service is initialized
    if (!this.initialized.has(name)) {
      await this.initializeService(name);
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Cannot start service ${name}: Not registered`);
    }

    const config = this.configs.get(name) || {};
    
    // Start dependencies first
    if (config.dependencies && config.dependencies.length > 0) {
      for (const dependency of config.dependencies) {
        await this.startService(dependency);
      }
    }

    // Start the service if it implements the lifecycle interface
    if (service.start && typeof service.start === 'function') {
      console.log(`Starting service: ${name}`);
      await service.start();
    }

    this.started.add(name);
  }

  /**
   * Stop a specific service
   * @param name Service name
   */
  public async stopService(name: string): Promise<void> {
    if (!this.started.has(name)) {
      return;
    }

    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Cannot stop service ${name}: Not registered`);
    }

    // Find dependent services
    const dependentServices = Array.from(this.configs.entries())
      .filter(([_, config]) => config.dependencies?.includes(name))
      .map(([serviceName]) => serviceName);

    // Stop dependent services first
    for (const dependentService of dependentServices) {
      await this.stopService(dependentService);
    }

    // Stop the service if it implements the lifecycle interface
    if (service.stop && typeof service.stop === 'function') {
      console.log(`Stopping service: ${name}`);
      await service.stop();
    }

    this.started.delete(name);
  }

  /**
   * Initialize all registered services
   */
  public async initializeAll(): Promise<void> {
    for (const serviceName of this.services.keys()) {
      await this.initializeService(serviceName);
    }
  }

  /**
   * Start all registered services
   */
  public async startAll(): Promise<void> {
    for (const serviceName of this.services.keys()) {
      await this.startService(serviceName);
    }
  }

  /**
   * Stop all running services
   */
  public async stopAll(): Promise<void> {
    // Stop in reverse dependency order
    const startedServices = Array.from(this.started);
    for (const serviceName of startedServices.reverse()) {
      await this.stopService(serviceName);
    }
  }
}

// Export a singleton instance
export const serviceRegistry = ServiceRegistry.getInstance();