/**
 * Base Service Class for Energy Management System
 * 
 * This module provides a base class for all services in the EMS,
 * enforcing a consistent interface and providing common functionality.
 */

import { ServiceLifecycle, ServiceConfig, serviceRegistry } from './serviceRegistry';

export abstract class BaseService implements ServiceLifecycle {
  protected name: string;
  protected config: ServiceConfig;
  protected isInitialized: boolean = false;
  protected isStarted: boolean = false;

  /**
   * Create a new service instance
   * @param name Service name
   * @param config Service configuration
   */
  constructor(name: string, config: ServiceConfig = {}) {
    this.name = name;
    this.config = config;
    
    // Auto-register with service registry
    serviceRegistry.register(name, this, config);
  }

  /**
   * Initialize the service
   * This method should be overridden by derived services
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    console.log(`Initializing service: ${this.name}`);
    
    // Perform initialization logic in derived classes
    await this.onInitialize();
    
    this.isInitialized = true;
    console.log(`Service ${this.name} initialized successfully`);
  }

  /**
   * Start the service
   * This method should be overridden by derived services
   */
  public async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.isStarted) {
      return;
    }
    
    console.log(`Starting service: ${this.name}`);
    
    // Perform start logic in derived classes
    await this.onStart();
    
    this.isStarted = true;
    console.log(`Service ${this.name} started successfully`);
  }

  /**
   * Stop the service
   * This method should be overridden by derived services
   */
  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }
    
    console.log(`Stopping service: ${this.name}`);
    
    // Perform stop logic in derived classes
    await this.onStop();
    
    this.isStarted = false;
    console.log(`Service ${this.name} stopped successfully`);
  }

  /**
   * Get a dependent service
   * @param serviceName Name of the dependent service
   * @returns Service instance
   */
  protected getService<T>(serviceName: string): T {
    return serviceRegistry.getService<T>(serviceName);
  }

  /**
   * Implementation of initialization logic
   * This method must be implemented by derived services
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Implementation of start logic
   * This method must be implemented by derived services
   */
  protected abstract onStart(): Promise<void>;

  /**
   * Implementation of stop logic
   * This method can be overridden by derived services
   */
  protected async onStop(): Promise<void> {
    // Default implementation does nothing
  }
}