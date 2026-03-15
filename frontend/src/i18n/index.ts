import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import commonEN from '../locales/en/common.json'
import authEN from '../locales/en/auth.json'
import playbookEN from '../locales/en/playbook.json'
import dialogsEN from '../locales/en/dialogs.json'
import adminEN from '../locales/en/admin.json'
import errorsEN from '../locales/en/errors.json'

import commonFR from '../locales/fr/common.json'
import authFR from '../locales/fr/auth.json'
import playbookFR from '../locales/fr/playbook.json'
import dialogsFR from '../locales/fr/dialogs.json'
import adminFR from '../locales/fr/admin.json'
import errorsFR from '../locales/fr/errors.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEN,
        auth: authEN,
        playbook: playbookEN,
        dialogs: dialogsEN,
        admin: adminEN,
        errors: errorsEN,
      },
      fr: {
        common: commonFR,
        auth: authFR,
        playbook: playbookFR,
        dialogs: dialogsFR,
        admin: adminFR,
        errors: errorsFR,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'playbook', 'dialogs', 'admin', 'errors'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  })

export default i18n
