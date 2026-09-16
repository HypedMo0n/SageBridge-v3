// Content model for the Help Center. Deliberately plain data (no CMS, no
// markdown parser) so an article is just an object: easy to search, edit,
// categorize, and link to from application code without touching a page
// component. See PART 11 of the Help Center spec for why this shape exists.

export type ContentBlock =
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; items: string[] }
  | { type: 'note'; text: string }
  | { type: 'warning'; text: string }
  | { type: 'confirm'; text: string };

export type CategoryId =
  | 'getting-started'
  | 'using-sagebridge'
  | 'connector-sync'
  | 'troubleshooting'
  | 'security-privacy';

export interface HelpCategory {
  id: CategoryId;
  label: string;
  description: string;
}

export interface HelpArticle {
  slug: string;
  title: string;
  summary: string;
  category: CategoryId;
  body: ContentBlock[];
  related?: string[];
  /** True when part of this article's content could not be verified against the repository and is flagged in-page instead of guessed. */
  needsConfirmation?: boolean;
}
