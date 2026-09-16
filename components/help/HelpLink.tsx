'use client';

import Link from 'next/link';
import { CaretRight, Question } from '@phosphor-icons/react';

/** A small inline link to a Help Center article - the reusable mechanism behind PART 8's contextual help. */
export function HelpLink({ slug, label = 'Get help with this' }: { slug: string; label?: string }) {
  return (
    <Link href={`/help/${slug}`} className="help-inline-link">
      <Question size={13} aria-hidden="true" />
      <span>{label}</span>
      <CaretRight size={11} aria-hidden="true" />
    </Link>
  );
}
