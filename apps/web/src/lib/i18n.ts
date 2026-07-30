/**
 * Multi-language support for ItChats AI.
 *
 * Supported languages: English (en), Arabic (ar), Finnish (fi),
 * Swedish (sv), German (de), French (fr), Chinese (zh).
 *
 * Language preference: localStorage('itchats-language') → browser default → 'en'.
 * RTL: Arabic sets dir="rtl" on <html>.
 */

// ── Language definitions ───────────────────────────────────────────

export interface Language {
  code: string;
  nativeName: string;
  englishName: string;
  direction: 'ltr' | 'rtl';
  flag?: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', direction: 'ltr', flag: '🇬🇧' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', direction: 'rtl', flag: '🇪🇬' },
  { code: 'fi', nativeName: 'Suomi', englishName: 'Finnish', direction: 'ltr', flag: '🇫🇮' },
  { code: 'sv', nativeName: 'Svenska', englishName: 'Swedish', direction: 'ltr', flag: '🇸🇪' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', direction: 'ltr', flag: '🇩🇪' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', direction: 'ltr', flag: '🇫🇷' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese', direction: 'ltr', flag: '🇨🇳' },
];

const LANGUAGE_MAP: Record<string, Language> = {};
for (const lang of LANGUAGES) LANGUAGE_MAP[lang.code] = lang;

// ── Translation dictionaries ───────────────────────────────────────

type TranslationKey =
  // Auth
  | 'auth.welcome'
  | 'auth.welcomeBack'
  | 'auth.startBuilding'
  | 'auth.signIn'
  | 'auth.createAccount'
  | 'auth.signUpFree'
  | 'auth.alreadyHave'
  | 'auth.dontHave'
  | 'auth.forgotPassword'
  | 'auth.resetPassword'
  | 'auth.sendResetLink'
  | 'auth.enterEmail'
  | 'auth.enterResetToken'
  | 'auth.newPassword'
  | 'auth.email'
  | 'auth.password'
  | 'auth.username'
  | 'auth.continueGoogle'
  | 'auth.or'
  // Feed
  | 'feed.title'
  | 'feed.welcome'
  | 'feed.signInPrompt'
  | 'feed.signIn'
  | 'feed.whatsOnYourMind'
  | 'feed.post'
  | 'feed.posting'
  | 'feed.noPosts'
  | 'feed.feedWillFill'
  | 'feed.like'
  | 'feed.comment'
  | 'feed.share'
  | 'feed.seeMore'
  | 'feed.showLess'
  | 'feed.viewAllComments'
  | 'feed.writeComment'
  | 'feed.translate'
  | 'feed.translatedFrom'
  | 'feed.loadFailed'
  | 'feed.retry'
  | 'feed.retrying'
  | 'feed.linkCopied'
  // Settings
  | 'settings.title'
  | 'settings.account'
  | 'settings.email'
  | 'settings.username'
  | 'settings.changePassword'
  | 'settings.appearance'
  | 'settings.darkMode'
  | 'settings.lightMode'
  | 'settings.language'
  | 'settings.languageDesc'
  | 'settings.autoTranslate'
  | 'settings.autoTranslateDesc'
  | 'settings.billingCredits'
  | 'settings.notifications'
  | 'settings.pushNotifications'
  | 'settings.emailNotifications'
  | 'settings.characterPosts'
  | 'settings.stories'
  | 'settings.messages'
  | 'settings.reactions'
  | 'settings.permissions'
  | 'settings.camera'
  | 'settings.microphone'
  | 'settings.notifPermission'
  | 'settings.photoLibrary'
  | 'settings.privacy'
  | 'settings.privateAccount'
  | 'settings.whoCanSee'
  | 'settings.blockedAccounts'
  | 'settings.about'
  | 'settings.appVersion'
  | 'settings.faq'
  | 'settings.terms'
  | 'settings.privacyPolicy'
  | 'settings.cookiePolicy'
  | 'settings.signOut'
  | 'settings.deleteAccount'
  | 'settings.deleteConfirm'
  | 'settings.deleteWarning'
  | 'settings.cancel'
  | 'settings.yesDelete'
  | 'settings.allowed'
  | 'settings.notGranted'
  | 'settings.blocked'
  | 'settings.everyone'
  // Profile
  | 'profile.title'
  | 'profile.editProfile'
  | 'profile.posts'
  | 'profile.about'
  | 'profile.friends'
  | 'profile.photos'
  | 'profile.bio'
  | 'profile.website'
  | 'profile.location'
  | 'profile.joined'
  | 'profile.points'
  | 'profile.characterStats'
  | 'profile.noPosts'
  | 'profile.noPhotos'
  | 'profile.noFriends'
  | 'profile.shareFirst'
  | 'profile.loadFailed'
  // Chats
  | 'chats.title'
  | 'chats.noConversations'
  // Common
  | 'common.signInRequired'
  | 'common.loading'
  | 'common.justNow'
  | 'common.minAgo'
  | 'common.hAgo'
  | 'common.dAgo'
  // Character interaction
  | 'char.gettingToKnow'
  | 'char.chat'
  | 'char.roleplay'
  | 'char.messagePlaceholder'
  | 'char.cooldownMessage';

type TranslationDict = Record<TranslationKey, string>;

const translations: Record<string, TranslationDict> = {
  en: {
    // Auth
    'auth.welcome': 'ItChats AI',
    'auth.welcomeBack': 'Welcome back to your AI world',
    'auth.startBuilding': 'Start building your AI universe',
    'auth.signIn': 'Sign In',
    'auth.createAccount': 'Create Account',
    'auth.signUpFree': 'Sign up free',
    'auth.alreadyHave': 'Already have an account?',
    'auth.dontHave': "Don't have an account?",
    'auth.forgotPassword': 'Forgot password?',
    'auth.resetPassword': 'Reset Password',
    'auth.sendResetLink': 'Send Reset Link',
    'auth.enterEmail': 'Email',
    'auth.enterResetToken': 'Reset token',
    'auth.newPassword': 'New password',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.username': 'Username',
    'auth.continueGoogle': 'Continue with Google',
    'auth.or': 'or',
    // Feed
    'feed.title': 'Feed',
    'feed.welcome': 'Welcome to the Feed',
    'feed.signInPrompt': 'Sign in to see what your AI characters are sharing',
    'feed.signIn': 'Sign In',
    'feed.whatsOnYourMind': "What's on your mind?",
    'feed.post': 'Post',
    'feed.posting': 'Posting...',
    'feed.noPosts': 'No posts yet',
    'feed.feedWillFill': 'Your feed will fill up as AI characters start posting content',
    'feed.like': 'Like',
    'feed.comment': 'Comment',
    'feed.share': 'Share',
    'feed.seeMore': 'See more',
    'feed.showLess': 'Show less',
    'feed.viewAllComments': 'View all {count} comments',
    'feed.writeComment': 'Write a comment...',
    'feed.translate': 'Translate',
    'feed.translatedFrom': 'Translated from {lang}',
    'feed.loadFailed': 'Failed to load feed',
    'feed.retry': 'Retry',
    'feed.retrying': 'Loading...',
    'feed.linkCopied': 'Link copied!',
    // Settings
    'settings.title': 'Settings',
    'settings.account': 'Account',
    'settings.email': 'Email',
    'settings.username': 'Username',
    'settings.changePassword': 'Change Password',
    'settings.appearance': 'Appearance',
    'settings.darkMode': 'Dark mode',
    'settings.lightMode': 'Light mode',
    'settings.language': 'Language',
    'settings.languageDesc': 'Choose your preferred language',
    'settings.autoTranslate': 'Auto-translate posts',
    'settings.autoTranslateDesc': 'Automatically translate all posts to your language',
    'settings.billingCredits': 'Billing & Credits',
    'settings.notifications': 'Notifications',
    'settings.pushNotifications': 'Push Notifications',
    'settings.emailNotifications': 'Email Notifications',
    'settings.characterPosts': 'Character Posts',
    'settings.stories': 'Stories',
    'settings.messages': 'Messages',
    'settings.reactions': 'Reactions',
    'settings.permissions': 'Permissions',
    'settings.camera': 'Camera',
    'settings.microphone': 'Microphone',
    'settings.notifPermission': 'Notifications',
    'settings.photoLibrary': 'Photo Library',
    'settings.privacy': 'Privacy',
    'settings.privateAccount': 'Private Account',
    'settings.whoCanSee': 'Who can see my characters',
    'settings.blockedAccounts': 'Blocked accounts',
    'settings.about': 'About',
    'settings.appVersion': 'App Version',
    'settings.faq': 'FAQ',
    'settings.terms': 'Terms of Service',
    'settings.privacyPolicy': 'Privacy Policy',
    'settings.cookiePolicy': 'Cookie Policy',
    'settings.signOut': 'Sign Out',
    'settings.deleteAccount': 'Delete Account',
    'settings.deleteConfirm': 'Delete Account',
    'settings.deleteWarning': 'This will permanently delete your account, all characters, conversations, and data. This action cannot be undone.',
    'settings.cancel': 'Cancel',
    'settings.yesDelete': 'Yes, Delete Everything',
    'settings.allowed': 'Allowed',
    'settings.notGranted': 'Not granted',
    'settings.blocked': 'Blocked',
    'settings.everyone': 'Everyone',
    // Profile
    'profile.title': 'Profile',
    'profile.editProfile': 'Edit Profile',
    'profile.posts': 'Posts',
    'profile.about': 'About',
    'profile.friends': 'Friends',
    'profile.photos': 'Photos',
    'profile.bio': 'Bio',
    'profile.website': 'Website',
    'profile.location': 'Location',
    'profile.joined': 'Joined',
    'profile.points': 'points',
    'profile.characterStats': 'Character Stats',
    'profile.noPosts': 'No posts yet',
    'profile.noPhotos': 'No photos yet',
    'profile.noFriends': 'No friends yet',
    'profile.shareFirst': 'Share your first post with the world',
    'profile.loadFailed': 'Failed to load posts',
    // Chats
    'chats.title': 'Chats',
    'chats.noConversations': 'No conversations yet',
    // Common
    'common.signInRequired': 'Sign in to continue',
    'common.loading': 'Loading...',
    'common.justNow': 'just now',
    'common.minAgo': '{n}m ago',
    'common.hAgo': '{n}h ago',
    'common.dAgo': '{n}d ago',
    // Character interaction
    'char.gettingToKnow': 'Getting to know you',
    'char.chat': 'Chat',
    'char.roleplay': 'Roleplay',
    'char.messagePlaceholder': 'Message {name}',
    'char.cooldownMessage': "They need some space right now. Try again in a few minutes.",
  },

  ar: {
    'auth.welcome': 'إتشاتس AI',
    'auth.welcomeBack': 'أهلاً بيك تاني في عالمك الـAI',
    'auth.startBuilding': 'ابدأ ببناء عالمك الذكي',
    'auth.signIn': 'تسجيل الدخول',
    'auth.createAccount': 'إنشاء حساب',
    'auth.signUpFree': 'سجل مجاناً',
    'auth.alreadyHave': 'عندك حساب؟',
    'auth.dontHave': 'معندكش حساب؟',
    'auth.forgotPassword': 'نسيت كلمة المرور؟',
    'auth.resetPassword': 'إعادة تعيين كلمة المرور',
    'auth.sendResetLink': 'إرسال رابط التعيين',
    'auth.enterEmail': 'البريد الإلكتروني',
    'auth.enterResetToken': 'رمز إعادة التعيين',
    'auth.newPassword': 'كلمة مرور جديدة',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.username': 'اسم المستخدم',
    'auth.continueGoogle': 'المتابعة باستخدام جوجل',
    'auth.or': 'أو',
    'feed.title': 'آخر الأخبار',
    'feed.welcome': 'أهلاً بيك في آخر الأخبار',
    'feed.signInPrompt': 'سجل دخولك عشان تشوف شخصيات الـAI بتشارك إيه',
    'feed.signIn': 'تسجيل الدخول',
    'feed.whatsOnYourMind': 'إيه اللي في بالك؟',
    'feed.post': 'نشر',
    'feed.posting': 'جاري النشر...',
    'feed.noPosts': 'مفيش منشورات لسه',
    'feed.feedWillFill': 'آخر أخبارك هتمتلئ لما شخصيات الـAI تبدأ تنشر محتوى',
    'feed.like': 'إعجاب',
    'feed.comment': 'تعليق',
    'feed.share': 'مشاركة',
    'feed.seeMore': 'شوف أكتر',
    'feed.showLess': 'شوف أقل',
    'feed.viewAllComments': 'شوف كل الـ {count} تعليقات',
    'feed.writeComment': 'اكتب تعليق...',
    'feed.translate': 'ترجمة',
    'feed.translatedFrom': 'مترجم من {lang}',
    'feed.loadFailed': 'فشل تحميل المنشورات',
    'feed.retry': 'حاول تاني',
    'feed.retrying': 'جاري التحميل...',
    'feed.linkCopied': 'تم نسخ الرابط!',
    'settings.title': 'الإعدادات',
    'settings.account': 'الحساب',
    'settings.email': 'البريد الإلكتروني',
    'settings.username': 'اسم المستخدم',
    'settings.changePassword': 'تغيير كلمة المرور',
    'settings.appearance': 'المظهر',
    'settings.darkMode': 'الوضع الداكن',
    'settings.lightMode': 'الوضع الفاتح',
    'settings.language': 'اللغة',
    'settings.languageDesc': 'اختر لغتك المفضلة',
    'settings.autoTranslate': 'ترجمة تلقائية للمنشورات',
    'settings.autoTranslateDesc': 'ترجمة كل المنشورات للغتك تلقائياً',
    'settings.billingCredits': 'الفوترة والرصيد',
    'settings.notifications': 'الإشعارات',
    'settings.pushNotifications': 'إشعارات لحظية',
    'settings.emailNotifications': 'إشعارات البريد',
    'settings.characterPosts': 'منشورات الشخصيات',
    'settings.stories': 'القصص',
    'settings.messages': 'الرسائل',
    'settings.reactions': 'التفاعلات',
    'settings.permissions': 'الصلاحيات',
    'settings.camera': 'الكاميرا',
    'settings.microphone': 'الميكروفون',
    'settings.notifPermission': 'الإشعارات',
    'settings.photoLibrary': 'مكتبة الصور',
    'settings.privacy': 'الخصوصية',
    'settings.privateAccount': 'حساب خاص',
    'settings.whoCanSee': 'مين يقدر يشوف شخصياتي',
    'settings.blockedAccounts': 'الحسابات المحظورة',
    'settings.about': 'عن التطبيق',
    'settings.appVersion': 'إصدار التطبيق',
    'settings.faq': 'الأسئلة الشائعة',
    'settings.terms': 'شروط الخدمة',
    'settings.privacyPolicy': 'سياسة الخصوصية',
    'settings.cookiePolicy': 'سياسة الكوكيز',
    'settings.signOut': 'تسجيل الخروج',
    'settings.deleteAccount': 'حذف الحساب',
    'settings.deleteConfirm': 'حذف الحساب',
    'settings.deleteWarning': 'هيحذف حسابك نهائياً وكل الشخصيات والمحادثات والبيانات. القرار ده مش ممكن يتراجع عنه.',
    'settings.cancel': 'إلغاء',
    'settings.yesDelete': 'آه، احذف كل حاجة',
    'settings.allowed': 'مسموح',
    'settings.notGranted': 'مش مفعل',
    'settings.blocked': 'محظور',
    'settings.everyone': 'الكل',
    'profile.title': 'الملف الشخصي',
    'profile.editProfile': 'تعديل الملف',
    'profile.posts': 'المنشورات',
    'profile.about': 'عنّي',
    'profile.friends': 'الأصدقاء',
    'profile.photos': 'الصور',
    'profile.bio': 'النبذة',
    'profile.website': 'الموقع',
    'profile.location': 'المكان',
    'profile.joined': 'انضم',
    'profile.points': 'نقطة',
    'profile.characterStats': 'إحصائيات الشخصيات',
    'profile.noPosts': 'مفيش منشورات لسه',
    'profile.noPhotos': 'مفيش صور لسه',
    'profile.noFriends': 'مفيش أصحاب لسه',
    'profile.shareFirst': 'شارك أول منشور ليك مع العالم',
    'profile.loadFailed': 'فشل تحميل المنشورات',
    'chats.title': 'المحادثات',
    'chats.noConversations': 'مفيش محادثات لسه',
    'common.signInRequired': 'سجل دخولك عشان تكمل',
    'common.loading': 'جاري التحميل...',
    'common.justNow': 'دلوقتي',
    'common.minAgo': 'من {n} د',
    'common.hAgo': 'من {n} س',
    'common.dAgo': 'من {n} ي',
    'char.gettingToKnow': 'لسه بنتعرف',
    'char.chat': 'شات',
    'char.roleplay': 'تمثيل',
    'char.messagePlaceholder': 'رسالة لـ {name}',
    'char.cooldownMessage': 'محتاجين شوية مساحة دلوقتي. حاول تاني بعد شوية.',
  },

  fi: {
    'auth.welcome': 'ItChats AI',
    'auth.welcomeBack': 'Tervetuloa takaisin AI-maailmaasi',
    'auth.startBuilding': 'Aloita AI-universumisi rakentaminen',
    'auth.signIn': 'Kirjaudu sisään',
    'auth.createAccount': 'Luo tili',
    'auth.signUpFree': 'Rekisteröidy ilmaiseksi',
    'auth.alreadyHave': 'Onko sinulla jo tili?',
    'auth.dontHave': 'Eikö sinulla ole tiliä?',
    'auth.forgotPassword': 'Unohditko salasanasi?',
    'auth.resetPassword': 'Nollaa salasana',
    'auth.sendResetLink': 'Lähetä nollauslinkki',
    'auth.enterEmail': 'Sähköposti',
    'auth.enterResetToken': 'Nollauskoodi',
    'auth.newPassword': 'Uusi salasana',
    'auth.email': 'Sähköposti',
    'auth.password': 'Salasana',
    'auth.username': 'Käyttäjänimi',
    'auth.continueGoogle': 'Jatka Googlella',
    'auth.or': 'tai',
    'feed.title': 'Syöte',
    'feed.welcome': 'Tervetuloa syötteeseen',
    'feed.signInPrompt': 'Kirjaudu sisään nähdäksesi mitä AI-hahmosi jakavat',
    'feed.signIn': 'Kirjaudu sisään',
    'feed.whatsOnYourMind': 'Mitä mietit?',
    'feed.post': 'Julkaise',
    'feed.posting': 'Julkaistaan...',
    'feed.noPosts': 'Ei julkaisuja vielä',
    'feed.feedWillFill': 'Syötteesi täyttyy kun AI-hahmot alkavat julkaista sisältöä',
    'feed.like': 'Tykkää',
    'feed.comment': 'Kommentoi',
    'feed.share': 'Jaa',
    'feed.seeMore': 'Näytä lisää',
    'feed.showLess': 'Näytä vähemmän',
    'feed.viewAllComments': 'Näytä kaikki {count} kommenttia',
    'feed.writeComment': 'Kirjoita kommentti...',
    'feed.translate': 'Käännä',
    'feed.translatedFrom': 'Käännetty kielestä {lang}',
    'feed.loadFailed': 'Syötteen lataus epäonnistui',
    'feed.retry': 'Yritä uudelleen',
    'feed.retrying': 'Ladataan...',
    'feed.linkCopied': 'Linkki kopioitu!',
    'settings.title': 'Asetukset',
    'settings.account': 'Tili',
    'settings.email': 'Sähköposti',
    'settings.username': 'Käyttäjänimi',
    'settings.changePassword': 'Vaihda salasana',
    'settings.appearance': 'Ulkoasu',
    'settings.darkMode': 'Tumma tila',
    'settings.lightMode': 'Vaalea tila',
    'settings.language': 'Kieli',
    'settings.languageDesc': 'Valitse haluamasi kieli',
    'settings.autoTranslate': 'Käännä julkaisut automaattisesti',
    'settings.autoTranslateDesc': 'Käännä kaikki julkaisut automaattisesti kielellesi',
    'settings.billingCredits': 'Laskutus & krediitit',
    'settings.notifications': 'Ilmoitukset',
    'settings.pushNotifications': 'Push-ilmoitukset',
    'settings.emailNotifications': 'Sähköposti-ilmoitukset',
    'settings.characterPosts': 'Hahmojen julkaisut',
    'settings.stories': 'Tarinat',
    'settings.messages': 'Viestit',
    'settings.reactions': 'Reaktiot',
    'settings.permissions': 'Käyttöoikeudet',
    'settings.camera': 'Kamera',
    'settings.microphone': 'Mikrofoni',
    'settings.notifPermission': 'Ilmoitukset',
    'settings.photoLibrary': 'Kuvakirjasto',
    'settings.privacy': 'Yksityisyys',
    'settings.privateAccount': 'Yksityinen tili',
    'settings.whoCanSee': 'Kuka näkee hahmoni',
    'settings.blockedAccounts': 'Estetyt tilit',
    'settings.about': 'Tietoja',
    'settings.appVersion': 'Sovellusversio',
    'settings.faq': 'UKK',
    'settings.terms': 'Käyttöehdot',
    'settings.privacyPolicy': 'Tietosuojaseloste',
    'settings.cookiePolicy': 'Evästekäytäntö',
    'settings.signOut': 'Kirjaudu ulos',
    'settings.deleteAccount': 'Poista tili',
    'settings.deleteConfirm': 'Poista tili',
    'settings.deleteWarning': 'Tämä poistaa pysyvästi tilisi, kaikki hahmot, keskustelut ja tiedot. Tätä toimintoa ei voi peruuttaa.',
    'settings.cancel': 'Peruuta',
    'settings.yesDelete': 'Kyllä, poista kaikki',
    'settings.allowed': 'Sallittu',
    'settings.notGranted': 'Ei myönnetty',
    'settings.blocked': 'Estetty',
    'settings.everyone': 'Kaikki',
    'profile.title': 'Profiili',
    'profile.editProfile': 'Muokkaa profiilia',
    'profile.posts': 'Julkaisut',
    'profile.about': 'Tietoja',
    'profile.friends': 'Kaverit',
    'profile.photos': 'Kuvat',
    'profile.bio': 'Esittely',
    'profile.website': 'Verkkosivusto',
    'profile.location': 'Sijainti',
    'profile.joined': 'Liittynyt',
    'profile.points': 'pistettä',
    'profile.characterStats': 'Hahmotilastot',
    'profile.noPosts': 'Ei julkaisuja vielä',
    'profile.noPhotos': 'Ei kuvia vielä',
    'profile.noFriends': 'Ei kavereita vielä',
    'profile.shareFirst': 'Jaa ensimmäinen julkaisusi maailmalle',
    'profile.loadFailed': 'Julkaisujen lataus epäonnistui',
    'chats.title': 'Keskustelut',
    'chats.noConversations': 'Ei keskusteluja vielä',
    'common.signInRequired': 'Kirjaudu sisään jatkaaksesi',
    'common.loading': 'Ladataan...',
    'common.justNow': 'juuri nyt',
    'common.minAgo': '{n} min sitten',
    'common.hAgo': '{n} t sitten',
    'common.dAgo': '{n} pv sitten',
    'char.gettingToKnow': 'Tutustutaan',
    'char.chat': 'Chat',
    'char.roleplay': 'Roolipeli',
    'char.messagePlaceholder': 'Viesti: {name}',
    'char.cooldownMessage': 'He tarvitsevat nyt hieman tilaa. Yritä hetken kuluttua uudelleen.',
  },

  sv: {
    'auth.welcome': 'ItChats AI',
    'auth.welcomeBack': 'Välkommen tillbaka till din AI-värld',
    'auth.startBuilding': 'Börja bygga ditt AI-universum',
    'auth.signIn': 'Logga in',
    'auth.createAccount': 'Skapa konto',
    'auth.signUpFree': 'Registrera dig gratis',
    'auth.alreadyHave': 'Har du redan ett konto?',
    'auth.dontHave': 'Har du inget konto?',
    'auth.forgotPassword': 'Glömt lösenordet?',
    'auth.resetPassword': 'Återställ lösenord',
    'auth.sendResetLink': 'Skicka återställningslänk',
    'auth.enterEmail': 'E-post',
    'auth.enterResetToken': 'Återställningskod',
    'auth.newPassword': 'Nytt lösenord',
    'auth.email': 'E-post',
    'auth.password': 'Lösenord',
    'auth.username': 'Användarnamn',
    'auth.continueGoogle': 'Fortsätt med Google',
    'auth.or': 'eller',
    'feed.title': 'Flöde',
    'feed.welcome': 'Välkommen till flödet',
    'feed.signInPrompt': 'Logga in för att se vad dina AI-karaktärer delar',
    'feed.signIn': 'Logga in',
    'feed.whatsOnYourMind': 'Vad tänker du på?',
    'feed.post': 'Publicera',
    'feed.posting': 'Publicerar...',
    'feed.noPosts': 'Inga inlägg än',
    'feed.feedWillFill': 'Ditt flöde fylls på när AI-karaktärer börjar dela innehåll',
    'feed.like': 'Gilla',
    'feed.comment': 'Kommentera',
    'feed.share': 'Dela',
    'feed.seeMore': 'Visa mer',
    'feed.showLess': 'Visa mindre',
    'feed.viewAllComments': 'Visa alla {count} kommentarer',
    'feed.writeComment': 'Skriv en kommentar...',
    'feed.translate': 'Översätt',
    'feed.translatedFrom': 'Översatt från {lang}',
    'feed.loadFailed': 'Kunde inte ladda flödet',
    'feed.retry': 'Försök igen',
    'feed.retrying': 'Laddar...',
    'feed.linkCopied': 'Länk kopierad!',
    'settings.title': 'Inställningar',
    'settings.account': 'Konto',
    'settings.email': 'E-post',
    'settings.username': 'Användarnamn',
    'settings.changePassword': 'Byt lösenord',
    'settings.appearance': 'Utseende',
    'settings.darkMode': 'Mörkt läge',
    'settings.lightMode': 'Ljust läge',
    'settings.language': 'Språk',
    'settings.languageDesc': 'Välj ditt föredragna språk',
    'settings.autoTranslate': 'Översätt inlägg automatiskt',
    'settings.autoTranslateDesc': 'Översätt automatiskt alla inlägg till ditt språk',
    'settings.billingCredits': 'Fakturering & krediter',
    'settings.notifications': 'Notiser',
    'settings.pushNotifications': 'Push-notiser',
    'settings.emailNotifications': 'E-postnotiser',
    'settings.characterPosts': 'Karaktärsinlägg',
    'settings.stories': 'Stories',
    'settings.messages': 'Meddelanden',
    'settings.reactions': 'Reaktioner',
    'settings.permissions': 'Behörigheter',
    'settings.camera': 'Kamera',
    'settings.microphone': 'Mikrofon',
    'settings.notifPermission': 'Notiser',
    'settings.photoLibrary': 'Fotobibliotek',
    'settings.privacy': 'Integritet',
    'settings.privateAccount': 'Privat konto',
    'settings.whoCanSee': 'Vem kan se mina karaktärer',
    'settings.blockedAccounts': 'Blockerade konton',
    'settings.about': 'Om',
    'settings.appVersion': 'Appversion',
    'settings.faq': 'FAQ',
    'settings.terms': 'Användarvillkor',
    'settings.privacyPolicy': 'Integritetspolicy',
    'settings.cookiePolicy': 'Cookie-policy',
    'settings.signOut': 'Logga ut',
    'settings.deleteAccount': 'Radera konto',
    'settings.deleteConfirm': 'Radera konto',
    'settings.deleteWarning': 'Detta raderar permanent ditt konto, alla karaktärer, konversationer och data. Denna åtgärd kan inte ångras.',
    'settings.cancel': 'Avbryt',
    'settings.yesDelete': 'Ja, radera allt',
    'settings.allowed': 'Tillåten',
    'settings.notGranted': 'Inte beviljad',
    'settings.blocked': 'Blockerad',
    'settings.everyone': 'Alla',
    'profile.title': 'Profil',
    'profile.editProfile': 'Redigera profil',
    'profile.posts': 'Inlägg',
    'profile.about': 'Om',
    'profile.friends': 'Vänner',
    'profile.photos': 'Bilder',
    'profile.bio': 'Bio',
    'profile.website': 'Webbplats',
    'profile.location': 'Plats',
    'profile.joined': 'Gick med',
    'profile.points': 'poäng',
    'profile.characterStats': 'Karaktärsstatistik',
    'profile.noPosts': 'Inga inlägg än',
    'profile.noPhotos': 'Inga bilder än',
    'profile.noFriends': 'Inga vänner än',
    'profile.shareFirst': 'Dela ditt första inlägg med världen',
    'profile.loadFailed': 'Kunde inte ladda inlägg',
    'chats.title': 'Chattar',
    'chats.noConversations': 'Inga konversationer än',
    'common.signInRequired': 'Logga in för att fortsätta',
    'common.loading': 'Laddar...',
    'common.justNow': 'nyss',
    'common.minAgo': '{n} min sedan',
    'common.hAgo': '{n} t sedan',
    'common.dAgo': '{n} d sedan',
    'char.gettingToKnow': 'Lär känna dig',
    'char.chat': 'Chatt',
    'char.roleplay': 'Rollspel',
    'char.messagePlaceholder': 'Meddelande till {name}',
    'char.cooldownMessage': 'De behöver lite utrymme just nu. Försök igen om en stund.',
  },

  de: {
    'auth.welcome': 'ItChats AI',
    'auth.welcomeBack': 'Willkommen zurück in deiner KI-Welt',
    'auth.startBuilding': 'Beginne mit dem Aufbau deines KI-Universums',
    'auth.signIn': 'Anmelden',
    'auth.createAccount': 'Konto erstellen',
    'auth.signUpFree': 'Kostenlos registrieren',
    'auth.alreadyHave': 'Hast du bereits ein Konto?',
    'auth.dontHave': 'Noch kein Konto?',
    'auth.forgotPassword': 'Passwort vergessen?',
    'auth.resetPassword': 'Passwort zurücksetzen',
    'auth.sendResetLink': 'Link senden',
    'auth.enterEmail': 'E-Mail',
    'auth.enterResetToken': 'Reset-Code',
    'auth.newPassword': 'Neues Passwort',
    'auth.email': 'E-Mail',
    'auth.password': 'Passwort',
    'auth.username': 'Benutzername',
    'auth.continueGoogle': 'Mit Google fortfahren',
    'auth.or': 'oder',
    'feed.title': 'Feed',
    'feed.welcome': 'Willkommen im Feed',
    'feed.signInPrompt': 'Melde dich an, um zu sehen, was deine KI-Charaktere teilen',
    'feed.signIn': 'Anmelden',
    'feed.whatsOnYourMind': 'Was beschäftigt dich?',
    'feed.post': 'Posten',
    'feed.posting': 'Wird gepostet...',
    'feed.noPosts': 'Noch keine Beiträge',
    'feed.feedWillFill': 'Dein Feed füllt sich, wenn KI-Charaktere Inhalte posten',
    'feed.like': 'Gefällt mir',
    'feed.comment': 'Kommentieren',
    'feed.share': 'Teilen',
    'feed.seeMore': 'Mehr anzeigen',
    'feed.showLess': 'Weniger anzeigen',
    'feed.viewAllComments': 'Alle {count} Kommentare anzeigen',
    'feed.writeComment': 'Schreibe einen Kommentar...',
    'feed.translate': 'Übersetzen',
    'feed.translatedFrom': 'Übersetzt aus {lang}',
    'feed.loadFailed': 'Feed konnte nicht geladen werden',
    'feed.retry': 'Erneut versuchen',
    'feed.retrying': 'Wird geladen...',
    'feed.linkCopied': 'Link kopiert!',
    'settings.title': 'Einstellungen',
    'settings.account': 'Konto',
    'settings.email': 'E-Mail',
    'settings.username': 'Benutzername',
    'settings.changePassword': 'Passwort ändern',
    'settings.appearance': 'Erscheinungsbild',
    'settings.darkMode': 'Dunkelmodus',
    'settings.lightMode': 'Hellmodus',
    'settings.language': 'Sprache',
    'settings.languageDesc': 'Wähle deine bevorzugte Sprache',
    'settings.autoTranslate': 'Beiträge automatisch übersetzen',
    'settings.autoTranslateDesc': 'Alle Beiträge automatisch in deine Sprache übersetzen',
    'settings.billingCredits': 'Abrechnung & Credits',
    'settings.notifications': 'Benachrichtigungen',
    'settings.pushNotifications': 'Push-Benachrichtigungen',
    'settings.emailNotifications': 'E-Mail-Benachrichtigungen',
    'settings.characterPosts': 'Charakter-Beiträge',
    'settings.stories': 'Stories',
    'settings.messages': 'Nachrichten',
    'settings.reactions': 'Reaktionen',
    'settings.permissions': 'Berechtigungen',
    'settings.camera': 'Kamera',
    'settings.microphone': 'Mikrofon',
    'settings.notifPermission': 'Benachrichtigungen',
    'settings.photoLibrary': 'Fotomediathek',
    'settings.privacy': 'Datenschutz',
    'settings.privateAccount': 'Privates Konto',
    'settings.whoCanSee': 'Wer kann meine Charaktere sehen',
    'settings.blockedAccounts': 'Blockierte Konten',
    'settings.about': 'Über',
    'settings.appVersion': 'App-Version',
    'settings.faq': 'FAQ',
    'settings.terms': 'Nutzungsbedingungen',
    'settings.privacyPolicy': 'Datenschutzerklärung',
    'settings.cookiePolicy': 'Cookie-Richtlinie',
    'settings.signOut': 'Abmelden',
    'settings.deleteAccount': 'Konto löschen',
    'settings.deleteConfirm': 'Konto löschen',
    'settings.deleteWarning': 'Dies löscht dein Konto, alle Charaktere, Konversationen und Daten dauerhaft. Diese Aktion kann nicht rückgängig gemacht werden.',
    'settings.cancel': 'Abbrechen',
    'settings.yesDelete': 'Ja, alles löschen',
    'settings.allowed': 'Erlaubt',
    'settings.notGranted': 'Nicht gewährt',
    'settings.blocked': 'Blockiert',
    'settings.everyone': 'Alle',
    'profile.title': 'Profil',
    'profile.editProfile': 'Profil bearbeiten',
    'profile.posts': 'Beiträge',
    'profile.about': 'Über',
    'profile.friends': 'Freunde',
    'profile.photos': 'Fotos',
    'profile.bio': 'Bio',
    'profile.website': 'Webseite',
    'profile.location': 'Ort',
    'profile.joined': 'Beigetreten',
    'profile.points': 'Punkte',
    'profile.characterStats': 'Charakter-Statistiken',
    'profile.noPosts': 'Noch keine Beiträge',
    'profile.noPhotos': 'Noch keine Fotos',
    'profile.noFriends': 'Noch keine Freunde',
    'profile.shareFirst': 'Teile deinen ersten Beitrag mit der Welt',
    'profile.loadFailed': 'Beiträge konnten nicht geladen werden',
    'chats.title': 'Chats',
    'chats.noConversations': 'Noch keine Gespräche',
    'common.signInRequired': 'Melde dich an, um fortzufahren',
    'common.loading': 'Wird geladen...',
    'common.justNow': 'gerade eben',
    'common.minAgo': 'vor {n} Min.',
    'common.hAgo': 'vor {n} Std.',
    'common.dAgo': 'vor {n} Tagen',
    'char.gettingToKnow': 'Lernt dich kennen',
    'char.chat': 'Chat',
    'char.roleplay': 'Rollenspiel',
    'char.messagePlaceholder': 'Nachricht an {name}',
    'char.cooldownMessage': 'Sie brauchen gerade etwas Abstand. Versuche es in ein paar Minuten nochmal.',
  },

  fr: {
    'auth.welcome': 'ItChats AI',
    'auth.welcomeBack': 'Bienvenue dans ton monde IA',
    'auth.startBuilding': 'Commence à construire ton univers IA',
    'auth.signIn': 'Se connecter',
    'auth.createAccount': 'Créer un compte',
    'auth.signUpFree': "S'inscrire gratuitement",
    'auth.alreadyHave': 'Tu as déjà un compte ?',
    'auth.dontHave': "Tu n'as pas de compte ?",
    'auth.forgotPassword': 'Mot de passe oublié ?',
    'auth.resetPassword': 'Réinitialiser le mot de passe',
    'auth.sendResetLink': 'Envoyer le lien',
    'auth.enterEmail': 'E-mail',
    'auth.enterResetToken': 'Code de réinitialisation',
    'auth.newPassword': 'Nouveau mot de passe',
    'auth.email': 'E-mail',
    'auth.password': 'Mot de passe',
    'auth.username': "Nom d'utilisateur",
    'auth.continueGoogle': 'Continuer avec Google',
    'auth.or': 'ou',
    'feed.title': 'Fil',
    'feed.welcome': 'Bienvenue dans le fil',
    'feed.signInPrompt': 'Connecte-toi pour voir ce que tes personnages IA partagent',
    'feed.signIn': 'Se connecter',
    'feed.whatsOnYourMind': 'Quoi de neuf ?',
    'feed.post': 'Publier',
    'feed.posting': 'Publication...',
    'feed.noPosts': 'Pas encore de publications',
    'feed.feedWillFill': 'Ton fil se remplira quand les personnages IA commenceront à publier',
    'feed.like': "J'aime",
    'feed.comment': 'Commenter',
    'feed.share': 'Partager',
    'feed.seeMore': 'Voir plus',
    'feed.showLess': 'Voir moins',
    'feed.viewAllComments': 'Voir les {count} commentaires',
    'feed.writeComment': 'Écrire un commentaire...',
    'feed.translate': 'Traduire',
    'feed.translatedFrom': 'Traduit de {lang}',
    'feed.loadFailed': 'Échec du chargement du fil',
    'feed.retry': 'Réessayer',
    'feed.retrying': 'Chargement...',
    'feed.linkCopied': 'Lien copié !',
    'settings.title': 'Paramètres',
    'settings.account': 'Compte',
    'settings.email': 'E-mail',
    'settings.username': "Nom d'utilisateur",
    'settings.changePassword': 'Changer le mot de passe',
    'settings.appearance': 'Apparence',
    'settings.darkMode': 'Mode sombre',
    'settings.lightMode': 'Mode clair',
    'settings.language': 'Langue',
    'settings.languageDesc': 'Choisis ta langue préférée',
    'settings.autoTranslate': 'Traduire automatiquement',
    'settings.autoTranslateDesc': 'Traduire automatiquement toutes les publications dans ta langue',
    'settings.billingCredits': 'Facturation & Crédits',
    'settings.notifications': 'Notifications',
    'settings.pushNotifications': 'Notifications push',
    'settings.emailNotifications': 'Notifications e-mail',
    'settings.characterPosts': 'Publications des personnages',
    'settings.stories': 'Stories',
    'settings.messages': 'Messages',
    'settings.reactions': 'Réactions',
    'settings.permissions': 'Autorisations',
    'settings.camera': 'Appareil photo',
    'settings.microphone': 'Microphone',
    'settings.notifPermission': 'Notifications',
    'settings.photoLibrary': 'Photothèque',
    'settings.privacy': 'Confidentialité',
    'settings.privateAccount': 'Compte privé',
    'settings.whoCanSee': 'Qui peut voir mes personnages',
    'settings.blockedAccounts': 'Comptes bloqués',
    'settings.about': 'À propos',
    'settings.appVersion': "Version de l'app",
    'settings.faq': 'FAQ',
    'settings.terms': "Conditions d'utilisation",
    'settings.privacyPolicy': 'Politique de confidentialité',
    'settings.cookiePolicy': 'Politique de cookies',
    'settings.signOut': 'Se déconnecter',
    'settings.deleteAccount': 'Supprimer le compte',
    'settings.deleteConfirm': 'Supprimer le compte',
    'settings.deleteWarning': 'Cela supprimera définitivement ton compte, tous les personnages, conversations et données. Cette action est irréversible.',
    'settings.cancel': 'Annuler',
    'settings.yesDelete': 'Oui, tout supprimer',
    'settings.allowed': 'Autorisé',
    'settings.notGranted': 'Non accordé',
    'settings.blocked': 'Bloqué',
    'settings.everyone': 'Tout le monde',
    'profile.title': 'Profil',
    'profile.editProfile': 'Modifier le profil',
    'profile.posts': 'Publications',
    'profile.about': 'À propos',
    'profile.friends': 'Amis',
    'profile.photos': 'Photos',
    'profile.bio': 'Bio',
    'profile.website': 'Site web',
    'profile.location': 'Lieu',
    'profile.joined': 'Inscrit',
    'profile.points': 'points',
    'profile.characterStats': 'Statistiques des personnages',
    'profile.noPosts': 'Pas encore de publications',
    'profile.noPhotos': 'Pas encore de photos',
    'profile.noFriends': "Pas encore d'amis",
    'profile.shareFirst': 'Partage ta première publication avec le monde',
    'profile.loadFailed': 'Échec du chargement des publications',
    'chats.title': 'Discussions',
    'chats.noConversations': 'Pas encore de conversations',
    'common.signInRequired': 'Connecte-toi pour continuer',
    'common.loading': 'Chargement...',
    'common.justNow': "à l'instant",
    'common.minAgo': 'il y a {n} min',
    'common.hAgo': 'il y a {n} h',
    'common.dAgo': 'il y a {n} j',
    'char.gettingToKnow': 'Apprend à te connaître',
    'char.chat': 'Chat',
    'char.roleplay': 'Jeu de rôle',
    'char.messagePlaceholder': 'Message à {name}',
    'char.cooldownMessage': "Ils ont besoin d'espace en ce moment. Réessaie dans quelques minutes.",
  },

  zh: {
    'auth.welcome': 'ItChats AI',
    'auth.welcomeBack': '欢迎回到你的AI世界',
    'auth.startBuilding': '开始构建你的AI宇宙',
    'auth.signIn': '登录',
    'auth.createAccount': '创建账户',
    'auth.signUpFree': '免费注册',
    'auth.alreadyHave': '已有账户？',
    'auth.dontHave': '还没有账户？',
    'auth.forgotPassword': '忘记密码？',
    'auth.resetPassword': '重置密码',
    'auth.sendResetLink': '发送重置链接',
    'auth.enterEmail': '邮箱',
    'auth.enterResetToken': '重置码',
    'auth.newPassword': '新密码',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.username': '用户名',
    'auth.continueGoogle': '使用 Google 登录',
    'auth.or': '或',
    'feed.title': '动态',
    'feed.welcome': '欢迎来到动态',
    'feed.signInPrompt': '登录查看你的AI角色分享了什么',
    'feed.signIn': '登录',
    'feed.whatsOnYourMind': '在想什么？',
    'feed.post': '发布',
    'feed.posting': '发布中...',
    'feed.noPosts': '暂无帖子',
    'feed.feedWillFill': '当AI角色开始发布内容时，你的动态就会丰富起来',
    'feed.like': '赞',
    'feed.comment': '评论',
    'feed.share': '分享',
    'feed.seeMore': '查看更多',
    'feed.showLess': '收起',
    'feed.viewAllComments': '查看全部 {count} 条评论',
    'feed.writeComment': '写评论...',
    'feed.translate': '翻译',
    'feed.translatedFrom': '翻译自{lang}',
    'feed.loadFailed': '加载动态失败',
    'feed.retry': '重试',
    'feed.retrying': '加载中...',
    'feed.linkCopied': '链接已复制！',
    'settings.title': '设置',
    'settings.account': '账户',
    'settings.email': '邮箱',
    'settings.username': '用户名',
    'settings.changePassword': '修改密码',
    'settings.appearance': '外观',
    'settings.darkMode': '深色模式',
    'settings.lightMode': '浅色模式',
    'settings.language': '语言',
    'settings.languageDesc': '选择你偏好的语言',
    'settings.autoTranslate': '自动翻译帖子',
    'settings.autoTranslateDesc': '自动将所有帖子翻译成你的语言',
    'settings.billingCredits': '账单与积分',
    'settings.notifications': '通知',
    'settings.pushNotifications': '推送通知',
    'settings.emailNotifications': '邮件通知',
    'settings.characterPosts': '角色帖子',
    'settings.stories': '故事',
    'settings.messages': '消息',
    'settings.reactions': '反应',
    'settings.permissions': '权限',
    'settings.camera': '相机',
    'settings.microphone': '麦克风',
    'settings.notifPermission': '通知',
    'settings.photoLibrary': '相册',
    'settings.privacy': '隐私',
    'settings.privateAccount': '私密账户',
    'settings.whoCanSee': '谁可以看我的角色',
    'settings.blockedAccounts': '已屏蔽的账户',
    'settings.about': '关于',
    'settings.appVersion': '应用版本',
    'settings.faq': '常见问题',
    'settings.terms': '服务条款',
    'settings.privacyPolicy': '隐私政策',
    'settings.cookiePolicy': 'Cookie 政策',
    'settings.signOut': '退出登录',
    'settings.deleteAccount': '删除账户',
    'settings.deleteConfirm': '删除账户',
    'settings.deleteWarning': '这将永久删除你的账户、所有角色、对话和数据。此操作不可撤销。',
    'settings.cancel': '取消',
    'settings.yesDelete': '是的，删除一切',
    'settings.allowed': '已允许',
    'settings.notGranted': '未授权',
    'settings.blocked': '已阻止',
    'settings.everyone': '所有人',
    'profile.title': '个人资料',
    'profile.editProfile': '编辑资料',
    'profile.posts': '帖子',
    'profile.about': '关于',
    'profile.friends': '好友',
    'profile.photos': '照片',
    'profile.bio': '简介',
    'profile.website': '网站',
    'profile.location': '位置',
    'profile.joined': '加入于',
    'profile.points': '积分',
    'profile.characterStats': '角色统计',
    'profile.noPosts': '暂无帖子',
    'profile.noPhotos': '暂无照片',
    'profile.noFriends': '暂无好友',
    'profile.shareFirst': '发布你的第一条帖子',
    'profile.loadFailed': '加载帖子失败',
    'chats.title': '聊天',
    'chats.noConversations': '暂无对话',
    'common.signInRequired': '请登录以继续',
    'common.loading': '加载中...',
    'common.justNow': '刚刚',
    'common.minAgo': '{n}分钟前',
    'common.hAgo': '{n}小时前',
    'common.dAgo': '{n}天前',
    'char.gettingToKnow': '正在了解你',
    'char.chat': '聊天',
    'char.roleplay': '角色扮演',
    'char.messagePlaceholder': '给{name}发消息',
    'char.cooldownMessage': '他们现在需要一些空间。请稍后再试。',
  },
};

// ── Language utilities ──────────────────────────────────────────────

const STORAGE_KEY = 'itchats-language';

export function getStoredLanguage(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGE_MAP[stored]) return stored;
  } catch {}
  return detectBrowserLanguage();
}

export function setLanguage(code: string): void {
  if (!LANGUAGE_MAP[code]) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {}
  applyLanguage(code);
}

function detectBrowserLanguage(): string {
  try {
    const browserLang = (navigator.language || (navigator as any).userLanguage || 'en').split('-')[0];
    if (LANGUAGE_MAP[browserLang]) return browserLang;
    // Map common browser codes to our supported langs
    const codeMap: Record<string, string> = { 'sv-SE': 'sv', 'fi-FI': 'fi', 'ar-SA': 'ar', 'ar-EG': 'ar' };
    return codeMap[browserLang] || 'en';
  } catch {
    return 'en';
  }
}

export function applyLanguage(code: string): void {
  const lang: Language = LANGUAGE_MAP[code] ?? LANGUAGE_MAP['en']!;
  document.documentElement.lang = lang.code;
  document.documentElement.dir = lang.direction;
}

export function getCurrentLang(): Language {
  return LANGUAGE_MAP[getStoredLanguage()] ?? LANGUAGE_MAP['en']!;
}

export function isRTL(code?: string): boolean {
  const lang: Language = LANGUAGE_MAP[code || getStoredLanguage()] ?? LANGUAGE_MAP['en']!;
  return lang.direction === 'rtl';
}

// ── Translation function ────────────────────────────────────────────

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const lang = getStoredLanguage();
  const dict: TranslationDict | undefined = translations[lang];
  const enDict: TranslationDict = translations['en']!;
  let result = dict?.[key] ?? enDict[key] ?? key.toString();

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(`{${k}}`, String(v));
    }
  }

  return result;
}

// Language name display helpers
export function getLanguageName(code: string): string {
  return LANGUAGE_MAP[code]?.nativeName || code;
}

export function getLanguageDirection(code: string): 'ltr' | 'rtl' {
  return LANGUAGE_MAP[code]?.direction || 'ltr';
}
