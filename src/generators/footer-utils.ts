/**
 * Shared footer resolution utilities
 * Resolves FooterConfig into a normalized ResolvedFooter for all generators
 */

import type { FooterConfig, FooterSocialLinks, FormMetadata } from '../types/schema.js';

export interface ResolvedFooterSeparator {
  enabled: boolean;
  color: string;
  thickness: number;
}

export interface ResolvedFooter {
  enabled: boolean;
  left: string;
  center: string;
  right: string;
  separator: ResolvedFooterSeparator;
  socialLinks: FooterSocialLinks;
}

/**
 * Resolve footer configuration with backward compatibility.
 * When footer is undefined, falls back to legacy version-only behavior.
 */
export function resolveFooterConfig(
  footer: FooterConfig | undefined,
  form: FormMetadata
): ResolvedFooter {
  // Legacy fallback: no footer config, show version if available
  if (!footer) {
    return {
      enabled: !!form.version,
      left: '',
      center: form.version ? `Version ${form.version}` : '',
      right: '',
      separator: { enabled: false, color: '#cccccc', thickness: 0.5 },
      socialLinks: {},
    };
  }

  // Explicit disable
  if (footer.enabled === false) {
    return {
      enabled: false,
      left: '',
      center: '',
      right: '',
      separator: { enabled: false, color: '#cccccc', thickness: 0.5 },
      socialLinks: {},
    };
  }

  let left = footer.left ?? '';
  let center = footer.center ?? '';
  let right = footer.right ?? '';

  // Shorthand: text -> center
  if (footer.text && !center) {
    center = footer.text;
  }

  // Shorthand: copyright -> left
  if (footer.copyright && !left) {
    left = footer.copyright;
  }

  // Shorthand: showPageNumbers -> right
  if (footer.showPageNumbers && !right) {
    right = 'Page {{page}} of {{pages}}';
  }

  // Shorthand: showVersion -> append to center
  if (footer.showVersion && form.version) {
    const versionText = `Version ${form.version}`;
    center = center ? `${center} - ${versionText}` : versionText;
  }

  // Shorthand: showDate
  if (footer.showDate) {
    const dateText = '{{date}}';
    if (!left && !footer.copyright) {
      left = dateText;
    } else if (!right && !footer.showPageNumbers) {
      right = dateText;
    } else {
      center = center ? `${center} | ${dateText}` : dateText;
    }
  }

  // Resolve static template variables
  left = resolveStaticVariables(left, form);
  center = resolveStaticVariables(center, form);
  right = resolveStaticVariables(right, form);

  // Filter social links to only include non-empty URLs
  const socialLinks: FooterSocialLinks = {};
  if (footer.socialLinks) {
    const src = footer.socialLinks;
    if (src.youtube) socialLinks.youtube = src.youtube;
    if (src.x) socialLinks.x = src.x;
    if (src.facebook) socialLinks.facebook = src.facebook;
    if (src.linkedin) socialLinks.linkedin = src.linkedin;
    if (src.github) socialLinks.github = src.github;
    if (src.website) socialLinks.website = src.website;
  }

  const hasContent = !!(left || center || right || Object.keys(socialLinks).length > 0);

  return {
    enabled: hasContent,
    left,
    center,
    right,
    separator: {
      enabled: footer.separator?.enabled ?? false,
      color: footer.separator?.color ?? '#cccccc',
      thickness: footer.separator?.thickness ?? 0.5,
    },
    socialLinks,
  };
}

/**
 * Resolve static template variables (everything except page/pages which are per-page)
 */
function resolveStaticVariables(text: string, form: FormMetadata): string {
  if (!text) return text;

  return text
    .replace(/\{\{title\}\}/g, form.title ?? '')
    .replace(/\{\{version\}\}/g, form.version ?? '')
    .replace(/\{\{author\}\}/g, form.author ?? '')
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
}

/**
 * Resolve per-page template variables (page number and total pages)
 */
export function resolvePageVariables(text: string, pageNum: number, totalPages: number): string {
  if (!text) return text;

  return text
    .replace(/\{\{page\}\}/g, String(pageNum))
    .replace(/\{\{pages\}\}/g, String(totalPages));
}

/**
 * Social link platform labels for display
 */
export const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  x: 'X',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  website: 'Website',
};
