import { pagePaths, PageId } from '../i18n/routes';
import { TranslationKey } from '../i18n/vi';
import { privateRobots, publicRobots, SeoRobotsConfig } from './models';

export interface PageDefinition {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  robots: SeoRobotsConfig;
  paths: (typeof pagePaths)[PageId];
}
export const seoPages: Record<PageId, PageDefinition> = {
  home: {
    titleKey: 'seo.home.title',
    descriptionKey: 'seo.home.description',
    robots: publicRobots,
    paths: pagePaths.home,
  },
  showcase: {
    titleKey: 'seo.showcase.title',
    descriptionKey: 'seo.showcase.description',
    robots: privateRobots,
    paths: pagePaths.showcase,
  },
};
