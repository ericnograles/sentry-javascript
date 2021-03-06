import { addGlobalEventProcessor, getCurrentHub } from '@sentry/hub';
import { Integration, Options } from '@sentry/types';
import { logger } from '@sentry/utils/logger';

export const installedIntegrations: string[] = [];

/** Map of integrations assigned to a client */
export interface IntegrationIndex {
  [key: string]: Integration;
}

/** Gets integration to install */
export function getIntegrationsToSetup(options: Options): Integration[] {
  const defaultIntegrations = (options.defaultIntegrations && [...options.defaultIntegrations]) || [];
  const userIntegrations = options.integrations;
  let integrations: Integration[] = [];
  if (Array.isArray(userIntegrations)) {
    const userIntegrationsNames = userIntegrations.map(i => i.name);
    const pickedIntegrationsNames: string[] = [];

    // Leave only unique default integrations, that were not overridden with provided user integrations
    defaultIntegrations.forEach(defaultIntegration => {
      if (
        userIntegrationsNames.indexOf(getIntegrationName(defaultIntegration)) === -1 &&
        pickedIntegrationsNames.indexOf(getIntegrationName(defaultIntegration)) === -1
      ) {
        integrations.push(defaultIntegration);
        pickedIntegrationsNames.push(getIntegrationName(defaultIntegration));
      }
    });

    // Don't add same user integration twice
    userIntegrations.forEach(userIntegration => {
      if (pickedIntegrationsNames.indexOf(getIntegrationName(userIntegration)) === -1) {
        integrations.push(userIntegration);
        pickedIntegrationsNames.push(getIntegrationName(userIntegration));
      }
    });
  } else if (typeof userIntegrations === 'function') {
    integrations = userIntegrations(defaultIntegrations);
    integrations = Array.isArray(integrations) ? integrations : [integrations];
  } else {
    return [...defaultIntegrations];
  }

  return integrations;
}

/** Setup given integration */
export function setupIntegration(integration: Integration): void {
  if (installedIntegrations.indexOf(getIntegrationName(integration)) !== -1) {
    return;
  }
  integration.setupOnce(addGlobalEventProcessor, getCurrentHub);
  installedIntegrations.push(getIntegrationName(integration));
  logger.log(`Integration installed: ${getIntegrationName(integration)}`);
}

/**
 * Given a list of integration instances this installs them all. When `withDefaults` is set to `true` then all default
 * integrations are added unless they were already provided before.
 * @param integrations array of integration instances
 * @param withDefault should enable default integrations
 */
export function setupIntegrations<O extends Options>(options: O): IntegrationIndex {
  const integrations: IntegrationIndex = {};
  getIntegrationsToSetup(options).forEach(integration => {
    integrations[getIntegrationName(integration)] = integration;
    setupIntegration(integration);
  });
  return integrations;
}

/**
 * Returns the integration static id.
 * @param integration Integration to retrieve id
 */
function getIntegrationName(integration: Integration): string {
  /**
   * @depracted
   */
  // tslint:disable-next-line:no-unsafe-any
  return (integration as any).constructor.id || integration.name;
}
