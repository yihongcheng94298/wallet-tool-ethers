import { createI18n } from 'vue-i18n';

// import cn from './config/cn';
import en from './config/en';
import cn from './config/cn-tw';

const i18n = createI18n({
    locale: localStorage.getItem('locale') || 'en',
    // locale: 'en',
    silentTranslationWarn: true,
    messages: {
        cn,
        en,
        // tc,
    }
})

export default i18n;
