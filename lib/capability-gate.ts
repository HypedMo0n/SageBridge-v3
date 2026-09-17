import type { Capabilities, ConnectorInfo } from './api';

// A financial write (customer.create, quote.create, invoice.create) must
// never be enabled just because its metadata call is still in flight or
// failed - a fetch failure must fail CLOSED, not fall back to "assume
// supported". This is the single source of truth for that decision so
// CreateWizard and the customer-create form can't drift from each other.

export type LoadStatus = 'loading' | 'error' | 'loaded';

export type ActionAvailability =
  | { status: 'checking' }
  | { status: 'blocked'; reason: BlockedReason; message: string }
  | { status: 'unsupported' }
  | { status: 'ready' };

export type BlockedReason =
  | 'capabilities_unavailable'
  | 'connector_status_unavailable'
  | 'no_connector'
  | 'connector_offline'
  | 'connector_missing_capability';

export function resolveActionAvailability(params: {
  action: string;
  capabilitiesStatus: LoadStatus;
  capabilities: Capabilities | null;
  connectorsStatus: LoadStatus;
  connectors: ConnectorInfo[] | null;
}): ActionAvailability {
  const { action, capabilitiesStatus, capabilities, connectorsStatus, connectors } = params;

  if (capabilitiesStatus === 'loading') return { status: 'checking' };
  if (capabilitiesStatus === 'error') {
    return {
      status: 'blocked',
      reason: 'capabilities_unavailable',
      message: 'Could not verify what SageBridge currently supports. Check your connection and try again.',
    };
  }

  // The API's deployment-wide flag is a ceiling, not a guarantee - it says
  // this release COULD support the action at all, never that any given
  // company's connector actually can right now.
  if (capabilities?.features[action] !== true) return { status: 'unsupported' };

  if (connectorsStatus === 'loading') return { status: 'checking' };
  if (connectorsStatus === 'error') {
    return {
      status: 'blocked',
      reason: 'connector_status_unavailable',
      message: 'Could not check this company\'s connector status. Check your connection and try again.',
    };
  }

  const live = (connectors ?? []).filter((connector) => !connector.revokedAt);
  if (live.length === 0) {
    return {
      status: 'blocked',
      reason: 'no_connector',
      message: 'No Sage 50 connector is paired with this company yet.',
    };
  }

  const online = live.filter((connector) => connector.online);
  if (online.length === 0) {
    return {
      status: 'blocked',
      reason: 'connector_offline',
      message: 'The Sage 50 connector for this company is offline.',
    };
  }

  // An older connector build that never advertised capabilities reports
  // an empty supportedActions array, not a missing field - that must
  // block the same as one that explicitly lacks the capability, not be
  // treated as "unknown, so allow it".
  const capable = online.some((connector) => connector.supportedActions.includes(action));
  if (!capable) {
    return {
      status: 'blocked',
      reason: 'connector_missing_capability',
      message: 'The connected Sage 50 connector does not support this action yet. Update the connector.',
    };
  }

  return { status: 'ready' };
}
