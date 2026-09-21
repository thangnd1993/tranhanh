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
  fuelPrices: {
    titleKey: 'seo.fuelPrices.title',
    descriptionKey: 'seo.fuelPrices.description',
    robots: publicRobots,
    paths: pagePaths.fuelPrices,
  },
  trafficFine: {
    titleKey: 'seo.trafficFine.title',
    descriptionKey: 'seo.trafficFine.description',
    robots: publicRobots,
    paths: pagePaths.trafficFine,
  },
  showcase: {
    titleKey: 'seo.showcase.title',
    descriptionKey: 'seo.showcase.description',
    robots: privateRobots,
    paths: pagePaths.showcase,
  },
  login: {
    titleKey: 'seo.login.title',
    descriptionKey: 'seo.login.description',
    robots: privateRobots,
    paths: pagePaths.login,
  },
  register: {
    titleKey: 'seo.register.title',
    descriptionKey: 'seo.register.description',
    robots: privateRobots,
    paths: pagePaths.register,
  },
  account: {
    titleKey: 'seo.account.title',
    descriptionKey: 'seo.account.description',
    robots: privateRobots,
    paths: pagePaths.account,
  },
  garage: {
    titleKey: 'seo.garage.title',
    descriptionKey: 'seo.garage.description',
    robots: privateRobots,
    paths: pagePaths.garage,
  },
  forgotPassword: {
    titleKey: 'seo.forgot.title',
    descriptionKey: 'seo.forgot.description',
    robots: privateRobots,
    paths: pagePaths.forgotPassword,
  },
  resetPassword: {
    titleKey: 'seo.reset.title',
    descriptionKey: 'seo.reset.description',
    robots: privateRobots,
    paths: pagePaths.resetPassword,
  },
};
