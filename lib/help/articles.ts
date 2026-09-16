import type { HelpArticle } from './types';

// Every article body is written from what this repository and its sibling
// API/connector repos actually implement (see the pre-coding audit in the
// project history). Where the connector's exact behavior could not be
// confirmed from source, the article says so explicitly with a `confirm`
// block instead of guessing - see CONNECTOR & SYNC below.

const TROUBLESHOOTING_FOOTER = 'Still stuck? Contact Support and include your diagnostic information.';

export const ARTICLES: HelpArticle[] = [
  // ───────────────────────── Getting Started ─────────────────────────
  {
    slug: 'what-is-sagebridge',
    title: 'What is SageBridge?',
    summary: 'A mobile and web companion for your Sage 50 company.',
    category: 'getting-started',
    body: [
      { type: 'p', text: 'SageBridge lets you check customers, invoices, quotes, and products from your Sage 50 company on your phone or in a browser - without opening Sage 50 itself.' },
      { type: 'p', text: 'A small program called the SageBridge Connector runs on the Windows computer where Sage 50 is installed. It keeps your SageBridge account in sync with Sage 50, and it is the only thing that ever writes changes back into Sage 50.' },
      { type: 'list', items: ['View customers, invoices, quotes, and products synced from Sage 50', 'Create new customers, invoices, and quotes from your phone', 'See sales trends, outstanding balances, and overdue invoices at a glance'] },
    ],
    related: ['what-is-the-connector', 'install-connector', 'business-pulse'],
  },
  {
    slug: 'system-requirements',
    title: 'System requirements',
    summary: 'What you need on the office computer and on your phone.',
    category: 'getting-started',
    body: [
      { type: 'p', text: 'SageBridge has two parts: the Connector (installed once, on the Windows computer with Sage 50) and the app itself (used from any modern phone or web browser, nothing to install).' },
      { type: 'list', items: ['A Windows computer with Sage 50 already installed and licensed', 'That computer connected to the internet', 'A modern phone, tablet, or computer with a web browser for the SageBridge app itself'] },
      { type: 'confirm', text: 'The exact supported Windows versions and Sage 50 editions have not been published anywhere in the connector project yet. This should be confirmed with the connector team before publishing a specific version list to customers.' },
    ],
    related: ['install-connector', 'sage-50-not-detected'],
  },
  {
    slug: 'install-connector',
    title: 'Install the SageBridge Connector',
    summary: 'Set up the Connector on the Windows computer that runs Sage 50.',
    category: 'getting-started',
    body: [
      { type: 'p', text: 'The Connector is a small program that sits beside Sage 50 on your office computer. Install it once on that computer - not on your phone.' },
      { type: 'steps', items: [
        'Download the SageBridge Connector for Windows from the button above.',
        'Run the installer on the same computer where Sage 50 is installed.',
        'Follow the on-screen steps to finish setup.',
        'Open SageBridge on your phone or browser and continue to "Connect your Sage 50 company".',
      ] },
      { type: 'note', text: 'No password for Sage 50 or SageBridge is ever typed during installation.' },
    ],
    related: ['connect-sage-50', 'system-requirements', 'sage-50-not-detected'],
  },
  {
    slug: 'connect-sage-50',
    title: 'Connect your Sage 50 company',
    summary: 'Pair the Connector with your SageBridge account using a one-time code.',
    category: 'getting-started',
    body: [
      { type: 'p', text: 'Once the Connector is installed, you connect it to your SageBridge account with a short pairing code - similar to pairing a smart TV.' },
      { type: 'steps', items: [
        'In SageBridge, open Pair with Sage 50 and generate a pairing code.',
        'Enter that code into the SageBridge Connector on the office computer.',
        'Wait for SageBridge to confirm the connection - this usually takes a few seconds.',
      ] },
      { type: 'note', text: 'The pairing code is single-use and expires after a short time. If it expires before you enter it, just generate a new one.' },
      { type: 'warning', text: 'Never share a pairing code with anyone outside your business - it grants access to this Sage 50 company.' },
    ],
    related: ['first-sync', 'pairing-failed', 'connection-status'],
  },
  {
    slug: 'first-sync',
    title: 'First synchronization',
    summary: 'What happens the first time SageBridge reads your Sage 50 data.',
    category: 'getting-started',
    body: [
      { type: 'p', text: 'After your company connects, SageBridge brings in your existing customers, invoices, products, and quotes from Sage 50. Depending on how much data your company has, this can take anywhere from under a minute to several minutes.' },
      { type: 'p', text: 'You can watch this progress on the setup screen - it moves through stages like importing customers, importing invoices, and finalizing setup before your workspace opens.' },
      { type: 'note', text: 'You do not need to keep the app open while this runs. It continues on the connector even if you close SageBridge and come back later.' },
    ],
    related: ['connect-sage-50', 'how-often-does-sagebridge-sync', 'what-does-last-synced-mean'],
  },
  {
    slug: 'sign-in-from-phone',
    title: 'Sign in from your phone',
    summary: 'Use your SageBridge account on any phone or browser.',
    category: 'getting-started',
    body: [
      { type: 'p', text: 'Your SageBridge account is separate from the office computer. Once your company is connected, sign in from any phone, tablet, or browser using your SageBridge email and password.' },
      { type: 'p', text: 'You do not need the office computer nearby to sign in or to browse your synced data - only to make the initial connection.' },
      { type: 'note', text: 'If you use a shared work computer for Sage 50, keep in mind your SageBridge sign-in is personal to you, not shared with the connector.' },
    ],
    related: ['sign-in-problems', 'connect-sage-50'],
  },
  {
    slug: 'connection-status',
    title: 'Understanding connection status',
    summary: 'What the status indicator on your screen actually means.',
    category: 'getting-started',
    body: [
      { type: 'p', text: 'SageBridge shows a small status dot for your connector wherever it matters - Settings, and the setup screen.' },
      { type: 'list', items: [
        'Online (green): the connector is running and recently checked in.',
        'Offline (grey): the connector has not checked in recently - usually because the office computer is off or asleep, or the connector isn’t running.',
        'Revoked: this connector has been disconnected on purpose and needs to be re-paired to reconnect.',
      ] },
      { type: 'p', text: 'Being "online" is about the connector being reachable - it is a separate fact from whether your data has synced recently. See "What does Last synced mean?" for that.' },
    ],
    related: ['connector-online-vs-offline', 'what-does-last-synced-mean', 'connector-offline'],
  },

  // ───────────────────────── Using SageBridge ─────────────────────────
  {
    slug: 'business-pulse',
    title: 'Business Pulse: your daily overview',
    summary: 'The Home screen summary of sales, receivables, and what needs attention.',
    category: 'using-sagebridge',
    body: [
      { type: 'p', text: 'The Home screen (Business Pulse) gives you a quick daily read on the business: sales this month compared to last month, how much customers owe you, and a short list of invoices that need a chase.' },
      { type: 'list', items: [
        'Sales this month, with the trend versus last month',
        'Customers owe you: total outstanding, and how much of that is overdue',
        'Receivables broken down by how overdue they are',
        'Needs attention: a short list of things worth a look today',
        'Needs a chase: your most overdue invoices',
      ] },
      { type: 'note', text: 'These figures come from the last successful sync, not from Sage 50 in real time. Check "Last synced" if a number looks out of date.' },
    ],
    related: ['what-does-last-synced-mean', 'reports', 'invoices'],
  },
  {
    slug: 'customers',
    title: 'Customers',
    summary: 'Browse the customers synced from Sage 50.',
    category: 'using-sagebridge',
    body: [
      { type: 'p', text: 'The Customers list shows every customer synced from Sage 50, with their outstanding balance. Open a customer to see their contact details, invoices, and quick actions to call or email them.' },
      { type: 'note', text: 'Customer information is read from Sage 50. Editing an existing customer’s details isn’t available yet - only creating new customers is.' },
    ],
    related: ['creating-a-customer', 'records-dont-match'],
  },
  {
    slug: 'invoices',
    title: 'Invoices',
    summary: 'View, export, and email invoices synced from Sage 50.',
    category: 'using-sagebridge',
    body: [
      { type: 'p', text: 'The Work tab lists your invoices, with filters for overdue, open, and paid. Open an invoice to see its total, outstanding balance, and due date.' },
      { type: 'list', items: [
        'Export PDF: downloads the invoice as a PDF, generated by the connector from Sage 50.',
        'Email: sends the invoice by email, when email is set up for your workspace. If it isn’t set up yet, the button explains that instead of failing silently.',
      ] },
      { type: 'note', text: 'Individual line items aren’t shown yet - only the totals Sage 50 reports. Nothing is invented to fill that gap.' },
    ],
    related: ['creating-an-invoice', 'invoice-creation-failed', 'records-dont-match'],
  },
  {
    slug: 'quotes',
    title: 'Quotes',
    summary: 'Create quotes from SageBridge and post them to Sage 50.',
    category: 'using-sagebridge',
    body: [
      { type: 'p', text: 'SageBridge can create a quote and post it to Sage 50, using the same guided flow as creating an invoice.' },
      { type: 'note', text: 'There is no quote list or history in SageBridge yet - Sage 50 does not currently hand quote records back to SageBridge, so nothing is shown here rather than showing something incomplete or wrong. Your quotes still exist in Sage 50 as normal.' },
    ],
    related: ['creating-a-quote', 'quote-creation-failed'],
  },
  {
    slug: 'products-and-services',
    title: 'Products & Services',
    summary: 'Browse your Sage 50 catalogue, including stock levels.',
    category: 'using-sagebridge',
    body: [
      { type: 'p', text: 'The Products & Services list shows everything in your Sage 50 catalogue - stocked items and services - synced from the last sync.' },
      { type: 'list', items: [
        'Stocked items show quantity on hand, with a reorder flag when stock is at or below your Sage 50 reorder level.',
        'Services are shown without a stock count.',
      ] },
      { type: 'note', text: 'This list is read-only - products and services are managed in Sage 50, not from SageBridge.' },
    ],
    related: ['creating-an-invoice', 'creating-a-quote'],
  },
  {
    slug: 'reports',
    title: 'Reports',
    summary: 'Sales trends, receivables aging, and your top outstanding customers.',
    category: 'using-sagebridge',
    body: [
      { type: 'p', text: 'Reports summarizes what has already synced: invoiced and collected totals for a chosen period, a six-month invoiced-versus-collected chart, receivables by age, and your top customers by outstanding balance.' },
      { type: 'note', text: 'PDF and CSV export are shown but disabled - the API doesn’t have an export endpoint yet, so the buttons say so instead of pretending to work.' },
    ],
    related: ['business-pulse', 'records-dont-match'],
  },
  {
    slug: 'search',
    title: 'Search',
    summary: 'Find a customer, invoice, or product from one search box.',
    category: 'using-sagebridge',
    body: [
      { type: 'p', text: 'Search looks across customers, invoices, and products at once. Use the chips to narrow results to just one type.' },
      { type: 'p', text: 'Search only covers data that has already synced from Sage 50 - if something was just created in Sage 50 directly, it may not appear until the next sync.' },
    ],
    related: ['how-often-does-sagebridge-sync', 'missing-recent-changes'],
  },
  {
    slug: 'creating-a-customer',
    title: 'Creating a customer',
    summary: 'Add a new customer that gets posted straight to Sage 50.',
    category: 'using-sagebridge',
    body: [
      { type: 'steps', items: [
        'From Customers, tap New Customer and fill in a name (required), plus email, phone, and address if you have them.',
        'Submit - SageBridge sends this to the connector as a job.',
        'Watch the progress: Queued → Creating → Refreshing → Ready.',
        'Once ready, you’re taken to the new customer’s page.',
      ] },
      { type: 'note', text: 'The customer is created in Sage 50 itself, by the connector - not just inside SageBridge.' },
    ],
    related: ['customer-creation-failed', 'customers'],
  },
  {
    slug: 'creating-an-invoice',
    title: 'Creating an invoice',
    summary: 'Build and post an invoice to Sage 50 in a few steps.',
    category: 'using-sagebridge',
    body: [
      { type: 'steps', items: [
        'Choose Invoice, then pick the customer.',
        'Add one or more products or services from your Sage 50 catalogue.',
        'Review the draft and choose payment terms.',
        'Post it - SageBridge waits for Sage 50 to confirm before showing the created invoice.',
      ] },
      { type: 'note', text: 'Invoice posting depends on the connector installed on the office computer. If that connector is an older version that doesn’t yet support creating invoices, SageBridge tells you posting is temporarily unavailable rather than showing a confusing error.' },
    ],
    related: ['invoice-creation-failed', 'invoices'],
  },
  {
    slug: 'creating-a-quote',
    title: 'Creating a quote',
    summary: 'Build and post a quote to Sage 50.',
    category: 'using-sagebridge',
    body: [
      { type: 'steps', items: [
        'Choose Quote, then pick the customer.',
        'Add products or services.',
        'Review the draft.',
        'Post it - SageBridge waits for Sage 50 to confirm.',
      ] },
      { type: 'note', text: 'Once posted, the quote lives in Sage 50. SageBridge doesn’t keep a list of past quotes yet - see the Quotes article for why.' },
    ],
    related: ['quote-creation-failed', 'quotes'],
  },

  // ───────────────────────── Connector & Sync ─────────────────────────
  {
    slug: 'what-is-the-connector',
    title: 'What is the SageBridge Connector?',
    summary: 'The bridge between Sage 50 and your SageBridge account.',
    category: 'connector-sync',
    body: [
      { type: 'p', text: 'The Connector is a program installed on the Windows computer where Sage 50 lives. It reads your Sage 50 data to keep SageBridge up to date, and it’s the only component that ever writes new customers, invoices, or quotes back into Sage 50.' },
      { type: 'p', text: 'Your phone and browser never talk to Sage 50 directly - everything goes through this connector.' },
    ],
    related: ['install-connector', 'does-sagebridge-run-in-background'],
  },
  {
    slug: 'does-sage-50-need-to-be-open',
    title: 'Does Sage 50 need to be open?',
    summary: 'Whether Sage 50 itself must be running for SageBridge to work.',
    category: 'connector-sync',
    body: [
      { type: 'confirm', text: 'Whether the connector requires the Sage 50 application window to be open (versus only the underlying Sage data/company files being accessible) has not been confirmed against the connector’s current implementation. This needs a direct answer from the connector team before it’s published as fact.' },
      { type: 'p', text: 'What is confirmed: the computer running the connector needs to be turned on and connected to the internet for syncing to happen.' },
    ],
    related: ['computer-turned-off', 'sage-50-not-detected'],
  },
  {
    slug: 'does-sagebridge-run-in-background',
    title: 'Does SageBridge run in the background?',
    summary: 'How the connector keeps running without you watching it.',
    category: 'connector-sync',
    body: [
      { type: 'p', text: 'Yes - once installed, the connector is meant to keep running on the office computer without anyone needing to keep a window open, checking in periodically and picking up sync and job work automatically.' },
      { type: 'confirm', text: 'The exact background-run mechanism (a Windows service versus a background application that needs the user logged in) has not been confirmed from the connector source for this article. If your connector stops running after a restart or logout, treat that as a question for Contact Support rather than something you did wrong.' },
    ],
    related: ['restarting-the-connector', 'connector-offline'],
  },
  {
    slug: 'how-often-does-sagebridge-sync',
    title: 'How often does SageBridge sync?',
    summary: 'How frequently your Sage 50 data refreshes in SageBridge.',
    category: 'connector-sync',
    body: [
      { type: 'confirm', text: 'The exact sync interval used by the connector has not been published or confirmed for this article. What’s confirmed is that the connector checks in periodically (a "heartbeat") to report it’s online, separately from actually syncing new data - see "What does Last synced mean?" for why those are two different things.' },
      { type: 'p', text: 'There is no manual "sync now" button in SageBridge today - the API doesn’t currently support triggering a sync on demand.' },
    ],
    related: ['what-does-last-synced-mean', 'missing-recent-changes'],
  },
  {
    slug: 'what-does-last-synced-mean',
    title: 'What does "Last synced" mean?',
    summary: 'The difference between the connector being online and your data being fresh.',
    category: 'connector-sync',
    body: [
      { type: 'p', text: '"Last synced" is the last time the connector successfully finished sending data to SageBridge. This is a different fact from the connector being "online" - a connector can be online (reachable right now) while its last successful sync was a while ago, if the most recent attempt only partly succeeded.' },
      { type: 'p', text: 'SageBridge only advances "last synced" when a sync actually completes without errors, so a stuck or partly-failed sync won’t be shown as if everything is current.' },
    ],
    related: ['connector-online-vs-offline', 'missing-recent-changes', 'sync-failed'],
  },
  {
    slug: 'connector-online-vs-offline',
    title: 'Connector Online vs Offline',
    summary: 'What these two states mean and what to do about Offline.',
    category: 'connector-sync',
    body: [
      { type: 'list', items: [
        'Online: the connector has checked in with SageBridge recently and is reachable.',
        'Offline: the connector hasn’t checked in recently - the office computer may be off, asleep, disconnected from the internet, or the connector isn’t running.',
      ] },
      { type: 'p', text: 'Offline does not mean your data is lost - it means SageBridge can’t currently reach the connector to sync or post new work. Everything picks back up once the connector checks in again.' },
    ],
    related: ['connector-offline', 'computer-turned-off', 'internet-connection-lost'],
  },
  {
    slug: 'restarting-the-connector',
    title: 'Restarting the connector',
    summary: 'When and how to restart the SageBridge Connector.',
    category: 'connector-sync',
    body: [
      { type: 'p', text: 'If the connector shows Offline for longer than expected while the office computer is clearly on and online, restarting it is a reasonable first step.' },
      { type: 'confirm', text: 'The exact restart procedure (a system tray icon, a Windows service, or something else) depends on the installer, which is still being finalized by the connector team - see docs/CONNECTOR_INSTALLER_UX.md for the target experience. Until that ships, restarting means closing and reopening the connector program, or restarting the computer.' },
    ],
    related: ['connector-offline', 'connector-online-vs-offline'],
  },
  {
    slug: 'moving-to-another-computer',
    title: 'Moving SageBridge to another computer',
    summary: 'What to do if Sage 50 moves to a different office computer.',
    category: 'connector-sync',
    body: [
      { type: 'steps', items: [
        'Install the SageBridge Connector on the new computer.',
        'Generate a new pairing code from SageBridge and enter it there.',
        'Once the new computer is connected, disconnect the connector on the old computer from Settings so it can no longer sync or post changes.',
      ] },
      { type: 'note', text: 'Each computer pairs as its own connector - moving computers is a new pairing, not a transfer of the old one.' },
    ],
    related: ['reconnecting-a-company', 'disconnecting-a-computer'],
  },
  {
    slug: 'reconnecting-a-company',
    title: 'Reconnecting a company',
    summary: 'Re-pair a company whose connector was disconnected or revoked.',
    category: 'connector-sync',
    body: [
      { type: 'p', text: 'If a connector was disconnected (on purpose, from Settings, or because it needed to be replaced), the company itself isn’t deleted - only that connector’s ability to sync or post changes stops.' },
      { type: 'steps', items: [
        'Make sure the connector is installed and running on the computer that should be connected.',
        'Generate a new pairing code from SageBridge.',
        'Enter the code in the connector to re-pair.',
      ] },
    ],
    related: ['connect-sage-50', 'pairing-failed', 'disconnecting-a-computer'],
  },
  {
    slug: 'computer-turned-off',
    title: 'What happens when the computer is turned off?',
    summary: 'Your SageBridge data is safe - it just stops updating.',
    category: 'connector-sync',
    body: [
      { type: 'p', text: 'When the office computer is off, the connector can’t check in or sync. SageBridge shows the connector as Offline and keeps showing the data from the last successful sync - nothing is lost or deleted.' },
      { type: 'p', text: 'Creating a new customer, invoice, or quote while the connector is offline will wait, queued, until the connector is back online to pick it up.' },
    ],
    related: ['connector-online-vs-offline', 'internet-connection-lost'],
  },
  {
    slug: 'internet-connection-lost',
    title: 'What happens when the internet connection is lost?',
    summary: 'How SageBridge behaves when the office loses internet.',
    category: 'connector-sync',
    body: [
      { type: 'p', text: 'If the office computer loses its internet connection, the connector can’t reach SageBridge - the same as being turned off from SageBridge’s point of view. It shows as Offline until the connection is restored, then resumes automatically.' },
      { type: 'p', text: 'Your existing synced data stays visible in SageBridge the whole time - only new syncing and posting pause.' },
    ],
    related: ['connector-online-vs-offline', 'could-not-reach-sagebridge'],
  },

  // ───────────────────────── Troubleshooting ─────────────────────────
  {
    slug: 'sync-problems',
    title: 'Sync problems',
    summary: 'Start here if something isn’t syncing correctly.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'Pick whichever matches what you’re seeing:' },
      { type: 'list', items: [
        'The connector shows Offline → Connector offline',
        'The app itself won’t load or shows a connection error → Could not reach SageBridge',
        'A change made in Sage 50 isn’t showing up → SageBridge isn’t showing recent Sage changes',
        'A number in SageBridge doesn’t match Sage 50 → Records don’t match Sage 50',
        'Setting up a new company got stuck or failed → Synchronization failed',
      ] },
    ],
    related: ['connector-offline', 'could-not-reach-sagebridge', 'missing-recent-changes', 'records-dont-match', 'sync-failed'],
  },
  {
    slug: 'connector-offline',
    title: 'Connector offline',
    summary: 'The connector hasn’t checked in with SageBridge recently.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: a grey "Offline" status next to your connector, in Settings or on the setup screen.' },
      { type: 'p', text: 'What it means: SageBridge hasn’t heard from the connector on your office computer recently. Your existing data is still shown from the last successful sync - nothing is deleted.' },
      { type: 'list', items: [
        'Try this first: make sure the office computer is turned on, awake, and connected to the internet.',
        'Confirm the SageBridge Connector program is running on that computer.',
        'If that doesn’t work: restart the connector (see Restarting the connector), then check back in a couple of minutes.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['connector-online-vs-offline', 'restarting-the-connector', 'computer-turned-off'],
  },
  {
    slug: 'could-not-reach-sagebridge',
    title: 'Could not reach SageBridge',
    summary: 'Your phone or browser couldn’t contact the SageBridge service.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: an error like "Could not reach SageBridge. Check your connection and try again."' },
      { type: 'p', text: 'What it means: this is about your phone or browser’s own connection to the internet, not the office connector - the request never got a response at all.' },
      { type: 'list', items: [
        'Try this first: check that your phone or computer has a working internet connection, then try again.',
        'If that doesn’t work: try a different network (for example, switch from Wi-Fi to mobile data), or try again in a few minutes.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['connector-offline', 'sign-in-problems'],
  },
  {
    slug: 'no-company-available',
    title: 'No company available',
    summary: 'Your account isn’t yet linked to a Sage 50 company.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: SageBridge says no company is available and can’t show a connector or provisioning status.' },
      { type: 'p', text: 'What it means: your account isn’t yet a member of any company, or your workspace hasn’t loaded that membership.' },
      { type: 'list', items: [
        'Try this first: refresh your workspace from the same screen.',
        'If that doesn’t work: ask whoever manages your organization to confirm you’ve been added to the right company.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['connect-sage-50', 'sign-in-problems'],
  },
  {
    slug: 'missing-recent-changes',
    title: 'SageBridge isn’t showing recent Sage changes',
    summary: 'A change made in Sage 50 hasn’t appeared in SageBridge yet.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: something you just changed in Sage 50 directly isn’t showing up in SageBridge.' },
      { type: 'p', text: 'What it means: SageBridge only shows data as of the last successful sync - it does not update the instant something changes in Sage 50.' },
      { type: 'list', items: [
        'Try this first: check "Last synced" for your connector - if it’s recent, the change may not have been picked up by the most recent sync window yet.',
        'Confirm the connector shows Online, not Offline.',
        'If that doesn’t work: wait for the next sync to complete and check again.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['what-does-last-synced-mean', 'how-often-does-sagebridge-sync', 'connector-offline'],
  },
  {
    slug: 'sage-50-not-detected',
    title: 'Sage 50 couldn’t be detected',
    summary: 'The connector can’t find a Sage 50 company on this computer.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: the connector reports it can’t find Sage 50 during setup.' },
      { type: 'p', text: 'What it means: the connector is installed but isn’t able to reach a Sage 50 company file on this computer.' },
      { type: 'list', items: [
        'Try this first: confirm Sage 50 is installed on this same computer and that you can open a company in it normally.',
        'If that doesn’t work: contact support with the exact message shown - the required Sage 50 detection details are still being finalized on the connector side.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['system-requirements', 'install-connector'],
  },
  {
    slug: 'pairing-failed',
    title: 'Pairing failed',
    summary: 'The pairing code didn’t connect the office computer.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: entering the pairing code in the connector didn’t complete the connection.' },
      { type: 'p', text: 'What it means: most often, the code expired before it was entered, or was mistyped - pairing codes are single-use and short-lived on purpose.' },
      { type: 'list', items: [
        'Try this first: generate a brand-new pairing code and enter it right away.',
        'Double-check the office computer has an internet connection while pairing.',
        'If that doesn’t work: confirm you’re pairing the right company if your organization has more than one.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['connect-sage-50', 'reconnecting-a-company'],
  },
  {
    slug: 'sync-failed',
    title: 'Synchronization failed',
    summary: 'Setting up or syncing a company reported a failure.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: the setup or sync progress screen shows a failed status with a message.' },
      { type: 'p', text: 'What it means: something interrupted the connector while it was importing or syncing your Sage 50 data.' },
      { type: 'list', items: [
        'Try this first: use Retry provisioning on the setup screen.',
        'Confirm the connector still shows Online and the office computer is connected.',
        'If that doesn’t work: note the exact error message shown and contact support with it.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['first-sync', 'connector-offline'],
  },
  {
    slug: 'sign-in-problems',
    title: 'Sign-in problems',
    summary: 'Trouble signing in to your SageBridge account.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: SageBridge won’t let you sign in, or ends your session unexpectedly.' },
      { type: 'list', items: [
        'Try this first: double-check your email and password, and that you’ve verified your email address if asked to.',
        'If your session simply expired, sign in again - this is normal after time away from the app.',
        'If that doesn’t work: use the password reset option, or contact support if you don’t receive the reset email.',
      ] },
      { type: 'warning', text: 'Support will never ask you for your password. If anyone does, don’t provide it - see Safe support practices.' },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['sign-in-from-phone', 'safe-support-practices'],
  },
  {
    slug: 'records-dont-match',
    title: 'Records don’t match Sage 50',
    summary: 'A balance or detail in SageBridge looks different from Sage 50.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: a customer balance, invoice total, or other figure in SageBridge doesn’t match what Sage 50 shows.' },
      { type: 'p', text: 'What it means: SageBridge only shows what synced as of "Last synced" - if Sage 50 changed since then, they’ll disagree until the next sync.' },
      { type: 'list', items: [
        'Try this first: check "Last synced" and confirm the connector is Online.',
        'If the connector is online and recently synced but the mismatch continues: treat this as a possible data issue rather than a display delay, and contact support with the specific record and both values.',
      ] },
      { type: 'warning', text: 'Do not rely on SageBridge for a figure that must be exact and current-to-the-second (for example, right before recording a payment) - always confirm against Sage 50 itself for anything financially sensitive.' },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['what-does-last-synced-mean', 'missing-recent-changes'],
  },
  {
    slug: 'customer-creation-failed',
    title: 'Customer creation failed',
    summary: 'Creating a new customer didn’t complete.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: an error while creating a customer, or a job that times out waiting for Sage 50.' },
      { type: 'list', items: [
        'Try this first: confirm the connector shows Online - creation needs the connector to be reachable.',
        'Check that the customer name doesn’t conflict with an existing Sage 50 customer.',
        'If that doesn’t work: note the exact error message and contact support with it - it usually reflects a real message from Sage 50 rather than a generic failure.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['creating-a-customer', 'connector-offline'],
  },
  {
    slug: 'invoice-creation-failed',
    title: 'Invoice creation failed',
    summary: 'Creating a new invoice didn’t complete.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: an error while creating an invoice, or a message that invoice posting is temporarily unavailable.' },
      { type: 'p', text: '"Temporarily unavailable" specifically means the connector on the office computer is running a version that doesn’t yet support posting invoices - it isn’t a mistake on your part.' },
      { type: 'list', items: [
        'Try this first: confirm the connector shows Online.',
        'If you see "temporarily unavailable": the office connector needs updating - contact support to confirm.',
        'For any other error: note the exact message and contact support with it.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['creating-an-invoice', 'connector-offline'],
  },
  {
    slug: 'quote-creation-failed',
    title: 'Quote creation failed',
    summary: 'Creating a new quote didn’t complete.',
    category: 'troubleshooting',
    body: [
      { type: 'p', text: 'What you’re seeing: an error while creating a quote, or a job that times out waiting for Sage 50.' },
      { type: 'list', items: [
        'Try this first: confirm the connector shows Online.',
        'If that doesn’t work: note the exact error message and contact support with it.',
      ] },
      { type: 'note', text: TROUBLESHOOTING_FOOTER },
    ],
    related: ['creating-a-quote', 'connector-offline'],
  },

  // ───────────────────────── Security & Privacy ─────────────────────────
  {
    slug: 'what-sagebridge-accesses',
    title: 'What information SageBridge accesses',
    summary: 'The Sage 50 data SageBridge reads and writes.',
    category: 'security-privacy',
    body: [
      { type: 'p', text: 'SageBridge accesses only the data needed to show and create the records you use in the app: customers, invoices, quotes, and products for the company or companies you’re a member of.' },
      { type: 'p', text: 'SageBridge does not access other companies in Sage 50 that you haven’t connected, and does not access unrelated files on the office computer.' },
    ],
    related: ['company-and-user-isolation', 'how-sagebridge-connects-to-sage-50'],
  },
  {
    slug: 'how-sagebridge-connects-to-sage-50',
    title: 'How SageBridge connects to Sage 50',
    summary: 'The connector is the only path between SageBridge and Sage 50.',
    category: 'security-privacy',
    body: [
      { type: 'p', text: 'SageBridge never connects to Sage 50 directly. All reading and writing goes through the SageBridge Connector installed on the office computer, which is the only component with access to the Sage 50 company file.' },
      { type: 'p', text: 'Your phone or browser talks only to the SageBridge service, which talks only to your paired connector - never to Sage 50 itself.' },
    ],
    related: ['what-is-the-connector', 'connector-credential-protection'],
  },
  {
    slug: 'where-data-is-processed',
    title: 'Where SageBridge data is processed and stored',
    summary: 'Requires confirmation before this is published to customers.',
    category: 'security-privacy',
    needsConfirmation: true,
    body: [
      { type: 'confirm', text: 'The specific data region/hosting location for SageBridge’s database has not been confirmed for this article, and should not be guessed. Confirm the authoritative answer before publishing this article to customers.' },
    ],
    related: ['what-sagebridge-accesses'],
  },
  {
    slug: 'connector-credential-protection',
    title: 'Connector credential protection',
    summary: 'How the connector’s access to Sage 50 is kept secure.',
    category: 'security-privacy',
    body: [
      { type: 'p', text: 'The credential that lets a connector sync and post to Sage 50 is stored encrypted on the office computer using Windows’ own protection for the signed-in user, and is never written to disk as plain text.' },
      { type: 'p', text: 'SageBridge stores connector credentials in hashed form on its own servers as well - not in a form that can be read back.' },
      { type: 'warning', text: 'SageBridge support will never ask you to share a connector credential, pairing code, or any token. See Safe support practices.' },
    ],
    related: ['safe-support-practices', 'disconnecting-a-computer'],
  },
  {
    slug: 'company-and-user-isolation',
    title: 'Company and user isolation',
    summary: 'Your data is scoped to your own company and organization.',
    category: 'security-privacy',
    body: [
      { type: 'p', text: 'Every request SageBridge makes on your behalf is scoped to the specific company and organization you belong to. A connector paired to your company can only sync and post data for that company - not any other.' },
      { type: 'p', text: 'If your organization has more than one Sage 50 company connected, each is kept separate.' },
    ],
    related: ['what-sagebridge-accesses', 'disconnecting-a-computer'],
  },
  {
    slug: 'disconnecting-a-computer',
    title: 'Disconnecting or revoking a computer',
    summary: 'Remove a connector’s access to your company.',
    category: 'security-privacy',
    body: [
      { type: 'p', text: 'If a computer should no longer have access to sync or post to your Sage 50 company - it was replaced, decommissioned, or you’re not sure it’s trusted - disconnect it from Settings.' },
      { type: 'steps', items: [
        'Open Settings and find the Sage 50 connection section.',
        'Choose Disconnect Sage 50 for that computer, then confirm.',
        'The connector immediately loses the ability to sync or make changes. Your existing Sage 50 data is not deleted.',
      ] },
      { type: 'note', text: 'To reconnect that computer later, it needs a fresh pairing code - see Reconnecting a company.' },
    ],
    related: ['reconnecting-a-company', 'moving-to-another-computer'],
  },
  {
    slug: 'safe-support-practices',
    title: 'Safe support practices',
    summary: 'What SageBridge support will and will not ask you for.',
    category: 'security-privacy',
    body: [
      { type: 'warning', text: 'Never provide any of the following to anyone claiming to be SageBridge support: your password, a connector credential, a pairing code, an API token or key, or Cloudflare account details.' },
      { type: 'p', text: 'Genuine SageBridge support can help using safe diagnostic information - your company name, when the problem happened, the exact error message, and the sanitized diagnostics from the Diagnostics page. None of that includes credentials.' },
    ],
    related: ['connector-credential-protection', 'disconnecting-a-computer'],
  },
];

export function findArticle(slug: string): HelpArticle | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function articlesByCategory(category: string): HelpArticle[] {
  return ARTICLES.filter((a) => a.category === category);
}
