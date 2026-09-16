// Connector download/version configuration.
//
// Audit result (see project history): sagebridge-connector has no GitHub
// Releases, no git tags, and no versioned installer artifact hosted
// anywhere reachable by a customer - only local build output. The API has
// no endpoint that serves a connector download URL or version either.
// NEXT_PUBLIC_CONNECTOR_DOWNLOAD_URL lets ops wire a real one in later
// without a code change; until it's set, the UI must say so honestly
// instead of linking to a fake executable.
export const CONNECTOR_DOWNLOAD_URL = process.env.NEXT_PUBLIC_CONNECTOR_DOWNLOAD_URL || '';
export const CONNECTOR_PLATFORM = 'Windows';

// The only version identifier found in source is the hardcoded constant
// SageBridge.Connector/ConnectorIdentity.cs -> ConnectorVersion.Current.
// It is not served by any API endpoint, so this cannot be fetched live -
// only mirrored by hand, or overridden via NEXT_PUBLIC_CONNECTOR_VERSION
// once a real release source exists.
export const CONNECTOR_LAST_KNOWN_VERSION = process.env.NEXT_PUBLIC_CONNECTOR_VERSION || '1.1.0';
