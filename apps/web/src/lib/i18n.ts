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
  // Navigation
  | 'nav.feed'
  | 'nav.chats'
  | 'nav.discover'
  | 'nav.live'
  | 'nav.profile'
  | 'nav.notifications'
  | 'nav.settings'
  | 'nav.ai'
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
  | 'feed.comments'
  | 'feed.share'
  | 'feed.shares'
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
  | 'feed.showOriginal'
  | 'feed.original'
  | 'feed.postSomething'
  | 'feed.addPhoto'
  | 'feed.addFeeling'
  | 'feed.mentionCharacter'
  | 'feed.searchCharacters'
  | 'feed.noCharactersFound'
  | 'feed.howAreYouFeeling'
  | 'feed.createStory'
  | 'feed.yourStory'
  | 'feed.sharing'
  | 'feed.saving'
  | 'feed.save'
  | 'feed.cancel'
  // Discover
  | 'discover.title'
  | 'discover.subtitle'
  | 'discover.explore'
  | 'discover.search'
  | 'discover.noResults'
  | 'discover.noCharacters'
  | 'discover.communityDesc'
  | 'discover.createFirst'
  | 'discover.createCharacter'
  | 'discover.signInPrompt'
  | 'discover.signIn'
  | 'discover.follow'
  | 'discover.following'
  | 'discover.followers'
  | 'discover.online'
  | 'discover.retry'
  | 'discover.loadFailed'
  | 'discover.tryDifferentSearch'
  // Live
  | 'live.title'
  | 'live.subtitle'
  | 'live.comingSoon'
  | 'live.description'
  | 'live.detail'
  | 'live.aiCohosts'
  | 'live.aiCohostsDesc'
  | 'live.realtimeChat'
  | 'live.realtimeChatDesc'
  | 'live.multicamera'
  | 'live.multicameraDesc'
  | 'live.reactions'
  | 'live.reactionsDesc'
  | 'live.getNotified'
  // Notifications
  | 'notif.title'
  | 'notif.noNotifications'
  | 'notif.loading'
  | 'notif.retry'
  | 'notif.markAllRead'
  | 'notif.allCaughtUp'
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
  | 'settings.autoTranslateOn'
  | 'settings.autoTranslateOff'
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
  | 'settings.chooseLanguage'
  | 'settings.languageRestart'
  | 'settings.changePasswordTitle'
  | 'settings.currentPassword'
  | 'settings.newPassword'
  | 'settings.confirmPassword'
  | 'settings.changing'
  | 'settings.passwordMismatch'
  | 'settings.passwordTooShort'
  | 'settings.passwordChanged'
  | 'settings.manageSubscription'
  | 'settings.buyCredits'
  | 'settings.availableCredits'
  | 'settings.plan'
  | 'settings.nextBilling'
  | 'settings.transactionHistory'
  | 'settings.notSet'
  | 'settings.none'
  | 'settings.privateDesc'
  | 'settings.anyoneCanSee'
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
  | 'profile.characters'
  | 'profile.followers'
  | 'profile.characterStats'
  | 'profile.charactersCreated'
  | 'profile.totalFollowers'
  | 'profile.score'
  | 'profile.noPosts'
  | 'profile.noPhotos'
  | 'profile.noFriends'
  | 'profile.shareFirst'
  | 'profile.loadFailed'
  | 'profile.noBio'
  | 'profile.notSet'
  | 'profile.signInPrompt'
  | 'profile.signIn'
  | 'profile.yourProfile'
  // Chats
  | 'chats.title'
  | 'chats.noConversations'
  | 'chats.startChatting'
  // Chat detail
  | 'chat.switchChat'
  | 'chat.switchRoleplay'
  | 'chat.deleteConversation'
  | 'chat.deleteConfirm'
  | 'chat.opening'
  | 'chat.emptyTitle'
  | 'chat.emptyChat'
  | 'chat.emptyRoleplay'
  | 'chat.voiceCallComing'
  | 'chat.conversationOptions'
  | 'chat.goBack'
  // AI Character
  | 'ai.mine'
  | 'ai.discover'
  | 'ai.createCharacter'
  | 'ai.noCharacters'
  | 'ai.createFirst'
  // Common
  | 'common.signInRequired'
  | 'common.loading'
  | 'common.justNow'
  | 'common.minAgo'
  | 'common.hAgo'
  | 'common.dAgo'
  | 'common.unknown'
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
    // Navigation
    'nav.feed': 'Feed',
    'nav.chats': 'Chats',
    'nav.discover': 'Discover',
    'nav.live': 'Live',
    'nav.profile': 'Profile',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Settings',
    'nav.ai': 'AI',
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
    'feed.comments': 'comments',
    'feed.share': 'Share',
    'feed.shares': 'shares',
    'feed.seeMore': 'See more',
    'feed.showLess': 'Show less',
    'feed.viewAllComments': 'View all {n} comments',
    'feed.writeComment': 'Write a comment...',
    'feed.translate': 'Translate',
    'feed.translatedFrom': 'Translated from {lang}',
    'feed.loadFailed': 'Failed to load feed',
    'feed.retry': 'Retry',
    'feed.retrying': 'Loading...',
    'feed.linkCopied': 'Link copied!',
    'feed.showOriginal': 'Show original',
    'feed.original': 'Original',
    'feed.postSomething': 'Post something...',
    'feed.addPhoto': 'Add photo',
    'feed.addFeeling': 'Add feeling',
    'feed.mentionCharacter': 'Mention a character',
    'feed.searchCharacters': 'Search characters...',
    'feed.noCharactersFound': 'No characters found',
    'feed.howAreYouFeeling': 'How are you feeling?',
    'feed.createStory': 'Create Story',
    'feed.yourStory': 'Your Story',
    'feed.sharing': 'Sharing...',
    'feed.saving': 'Saving...',
    'feed.save': 'Save',
    'feed.cancel': 'Cancel',
    // Discover
    'discover.title': 'Discover',
    'discover.subtitle': 'Explore the AI world',
    'discover.explore': 'Discover AI Characters',
    'discover.search': 'Search characters...',
    'discover.noResults': 'No characters match your search',
    'discover.noCharacters': 'No characters discovered yet',
    'discover.communityDesc': 'Characters created by the community will appear here',
    'discover.createFirst': 'Create Your First Character',
    'discover.createCharacter': 'Create Character',
    'discover.signInPrompt': 'Sign in to explore the AI community',
    'discover.signIn': 'Sign In',
    'discover.follow': 'Follow',
    'discover.following': 'Following',
    'discover.followers': 'followers',
    'discover.online': 'Online',
    'discover.retry': 'Retry',
    'discover.loadFailed': 'Failed to load characters',
    'discover.tryDifferentSearch': 'Try a different search term',
    // Live
    'live.title': 'Live',
    'live.subtitle': 'Streaming with AI',
    'live.comingSoon': 'Coming Soon',
    'live.description': 'Live streaming with AI characters is on the way.',
    'live.detail': 'Soon you\'ll be able to broadcast live with AI characters, host interactive shows, and stream real-time conversations.',
    'live.aiCohosts': 'AI Co-hosts',
    'live.aiCohostsDesc': 'Stream with characters',
    'live.realtimeChat': 'Real-time Chat',
    'live.realtimeChatDesc': 'Live audience interaction',
    'live.multicamera': 'Multi-camera',
    'live.multicameraDesc': 'Dynamic scene switching',
    'live.reactions': 'Reactions',
    'live.reactionsDesc': 'Real-time emoji reactions',
    'live.getNotified': 'Get Notified When Live',
    // Notifications
    'notif.title': 'Notifications',
    'notif.noNotifications': 'No notifications yet',
    'notif.loading': 'Loading notifications...',
    'notif.retry': 'Retry',
    'notif.markAllRead': 'Mark all as read',
    'notif.allCaughtUp': "You're all caught up!",
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
    'settings.autoTranslateOn': 'On — all posts translated to your language',
    'settings.autoTranslateOff': 'Off',
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
    'settings.privateDesc': 'Only friends can see your content',
    'settings.anyoneCanSee': 'Anyone can see your public content',
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
    'settings.chooseLanguage': 'Choose your preferred language. The app will restart in the selected language.',
    'settings.languageRestart': 'Choose your preferred language',
    'settings.changePasswordTitle': 'Change Password',
    'settings.currentPassword': 'Current password',
    'settings.newPassword': 'New password (min 6 chars)',
    'settings.confirmPassword': 'Confirm new password',
    'settings.changing': 'Changing...',
    'settings.passwordMismatch': 'Passwords do not match',
    'settings.passwordTooShort': 'Password must be at least 6 characters',
    'settings.passwordChanged': 'Password changed successfully!',
    'settings.manageSubscription': 'Manage Subscription',
    'settings.buyCredits': 'Buy Credits',
    'settings.availableCredits': 'Available credits for AI features',
    'settings.plan': 'Plan',
    'settings.nextBilling': 'Next',
    'settings.transactionHistory': 'Transaction History',
    'settings.notSet': '(not set)',
    'settings.none': 'None',
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
    'profile.characters': 'Characters',
    'profile.followers': 'Followers',
    'profile.characterStats': 'Character Stats',
    'profile.charactersCreated': 'Characters Created',
    'profile.totalFollowers': 'Total Followers',
    'profile.score': 'Score',
    'profile.noPosts': 'No posts yet',
    'profile.noPhotos': 'No photos yet',
    'profile.noFriends': 'No friends yet',
    'profile.shareFirst': 'Share your first post with the world',
    'profile.loadFailed': 'Failed to load posts',
    'profile.noBio': 'No bio yet',
    'profile.notSet': 'Not set',
    'profile.signInPrompt': 'Sign in to see your AI-powered profile',
    'profile.signIn': 'Sign In',
    'profile.yourProfile': 'Your Profile',
    // Chats
    'chats.title': 'Chats',
    'chats.noConversations': 'No conversations yet',
    'chats.startChatting': 'Start a conversation with an AI character',
    // Chat detail
    'chat.switchChat': 'Switch to chat mode',
    'chat.switchRoleplay': 'Switch to roleplay',
    'chat.deleteConversation': 'Delete conversation',
    'chat.deleteConfirm': 'Are you sure you want to delete this conversation?',
    'chat.opening': 'Opening your conversation…',
    'chat.emptyTitle': 'Start where it feels natural',
    'chat.emptyChat': '{name} will reply like a real private chat.',
    'chat.emptyRoleplay': 'You and {name} are in a live scene. Actions and thoughts can appear.',
    'chat.voiceCallComing': 'Voice & video calls coming soon',
    'chat.conversationOptions': 'Conversation options',
    'chat.goBack': 'Go back',
    // AI Character
    'ai.mine': 'My Characters',
    'ai.discover': 'Discover',
    'ai.createCharacter': 'Create Character',
    'ai.noCharacters': 'No characters yet',
    'ai.createFirst': 'Create your first AI character to start chatting',
    // Common
    'common.signInRequired': 'Sign in to continue',
    'common.loading': 'Loading...',
    'common.justNow': 'just now',
    'common.minAgo': '{n}m ago',
    'common.hAgo': '{n}h ago',
    'common.dAgo': '{n}d ago',
    'common.unknown': 'Unknown',
    // Character interaction
    'char.gettingToKnow': 'Getting to know you',
    'char.chat': 'Chat',
    'char.roleplay': 'Roleplay',
    'char.messagePlaceholder': 'Message {name}',
    'char.cooldownMessage': "They need some space right now. Try again in a few minutes.",
  },

  ar: {
    // Auth
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
    // Navigation
    'nav.feed': 'آخر الأخبار',
    'nav.chats': 'المحادثات',
    'nav.discover': 'استكشف',
    'nav.live': 'مباشر',
    'nav.profile': 'الملف الشخصي',
    'nav.notifications': 'الإشعارات',
    'nav.settings': 'الإعدادات',
    'nav.ai': 'الذكاء الاصطناعي',
    // Feed
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
    'feed.comments': 'تعليقات',
    'feed.share': 'مشاركة',
    'feed.shares': 'مشاركات',
    'feed.seeMore': 'شوف أكتر',
    'feed.showLess': 'شوف أقل',
    'feed.viewAllComments': 'شوف كل الـ {n} تعليقات',
    'feed.writeComment': 'اكتب تعليق...',
    'feed.translate': 'ترجمة',
    'feed.translatedFrom': 'مترجم من {lang}',
    'feed.loadFailed': 'فشل تحميل المنشورات',
    'feed.retry': 'حاول تاني',
    'feed.retrying': 'جاري التحميل...',
    'feed.linkCopied': 'تم نسخ الرابط!',
    'feed.showOriginal': 'شوف الأصلي',
    'feed.original': 'الأصلي',
    'feed.postSomething': 'اكتب حاجة...',
    'feed.addPhoto': 'أضف صورة',
    'feed.addFeeling': 'أضف إحساس',
    'feed.mentionCharacter': 'أشر لشخصية',
    'feed.searchCharacters': 'ابحث عن شخصيات...',
    'feed.noCharactersFound': 'مفيش شخصيات',
    'feed.howAreYouFeeling': 'إيه إحساسك؟',
    'feed.createStory': 'أنشئ قصة',
    'feed.yourStory': 'قصتك',
    'feed.sharing': 'جاري المشاركة...',
    'feed.saving': 'جاري الحفظ...',
    'feed.save': 'حفظ',
    'feed.cancel': 'إلغاء',
    // Discover
    'discover.title': 'استكشف',
    'discover.subtitle': 'استكشف عالم الـAI',
    'discover.explore': 'استكشف شخصيات الـAI',
    'discover.search': 'ابحث عن شخصيات...',
    'discover.noResults': 'مفيش شخصيات تطابق بحثك',
    'discover.noCharacters': 'مفيش شخصيات لسه',
    'discover.communityDesc': 'الشخصيات اللي أنشأها المجتمع هتظهر هنا',
    'discover.createFirst': 'أنشئ أول شخصية ليك',
    'discover.createCharacter': 'أنشئ شخصية',
    'discover.signInPrompt': 'سجل دخولك عشان تستكشف مجتمع الـAI',
    'discover.signIn': 'تسجيل الدخول',
    'discover.follow': 'متابعة',
    'discover.following': 'متابَع',
    'discover.followers': 'متابعين',
    'discover.online': 'متصل',
    'discover.retry': 'حاول تاني',
    'discover.loadFailed': 'فشل تحميل الشخصيات',
    'discover.tryDifferentSearch': 'جرب كلمة بحث مختلفة',
    // Live
    'live.title': 'مباشر',
    'live.subtitle': 'بث مع الـAI',
    'live.comingSoon': 'قريباً',
    'live.description': 'البث المباشر مع شخصيات الـAI في الطريق.',
    'live.detail': 'قريباً هتقدر تبث مباشر مع شخصيات AI، تستضيف عروض تفاعلية، وتبث محادثات في الوقت الفعلي.',
    'live.aiCohosts': 'مضيفين AI',
    'live.aiCohostsDesc': 'ابث مع الشخصيات',
    'live.realtimeChat': 'دردشة فورية',
    'live.realtimeChatDesc': 'تفاعل مباشر مع الجمهور',
    'live.multicamera': 'كاميرات متعددة',
    'live.multicameraDesc': 'تبديل ديناميكي للمشاهد',
    'live.reactions': 'تفاعلات',
    'live.reactionsDesc': 'تفاعلات إيموجي فورية',
    'live.getNotified': 'اعرف لما يبدأ البث',
    // Notifications
    'notif.title': 'الإشعارات',
    'notif.noNotifications': 'مفيش إشعارات لسه',
    'notif.loading': 'جاري تحميل الإشعارات...',
    'notif.retry': 'حاول تاني',
    'notif.markAllRead': 'علّم الكل كمقروء',
    'notif.allCaughtUp': 'أنت متابع كل حاجة!',
    // Settings
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
    'settings.autoTranslateOn': 'مفعل — كل المنشورات مترجمة للغتك',
    'settings.autoTranslateOff': 'متوقف',
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
    'settings.privateDesc': 'الأصدقاء فقط يقدروا يشوفوا محتواك',
    'settings.anyoneCanSee': 'أي حد يقدر يشوف محتواك العام',
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
    'settings.chooseLanguage': 'اختر لغتك المفضلة. التطبيق هيتحدث باللغة اللي اخترتها.',
    'settings.languageRestart': 'اختر لغتك المفضلة',
    'settings.changePasswordTitle': 'تغيير كلمة المرور',
    'settings.currentPassword': 'كلمة المرور الحالية',
    'settings.newPassword': 'كلمة مرور جديدة (6 حروف على الأقل)',
    'settings.confirmPassword': 'تأكيد كلمة المرور الجديدة',
    'settings.changing': 'جاري التغيير...',
    'settings.passwordMismatch': 'كلمات المرور مش متطابقة',
    'settings.passwordTooShort': 'كلمة المرور لازم تكون 6 حروف على الأقل',
    'settings.passwordChanged': 'اتغيرت كلمة المرور بنجاح!',
    'settings.manageSubscription': 'إدارة الاشتراك',
    'settings.buyCredits': 'اشتري رصيد',
    'settings.availableCredits': 'الرصيد المتاح لميزات الـAI',
    'settings.plan': 'الخطة',
    'settings.nextBilling': 'التجديد',
    'settings.transactionHistory': 'سجل المعاملات',
    'settings.notSet': '(غير مضبوط)',
    'settings.none': 'لا شيء',
    // Profile
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
    'profile.characters': 'الشخصيات',
    'profile.followers': 'المتابعين',
    'profile.characterStats': 'إحصائيات الشخصيات',
    'profile.charactersCreated': 'الشخصيات المنشأة',
    'profile.totalFollowers': 'إجمالي المتابعين',
    'profile.score': 'النتيجة',
    'profile.noPosts': 'مفيش منشورات لسه',
    'profile.noPhotos': 'مفيش صور لسه',
    'profile.noFriends': 'مفيش أصحاب لسه',
    'profile.shareFirst': 'شارك أول منشور ليك مع العالم',
    'profile.loadFailed': 'فشل تحميل المنشورات',
    'profile.noBio': 'مفيش نبذة لسه',
    'profile.notSet': 'غير مضبوط',
    'profile.signInPrompt': 'سجل دخولك عشان تشوف ملفك المدعوم بالـAI',
    'profile.signIn': 'تسجيل الدخول',
    'profile.yourProfile': 'ملفك الشخصي',
    // Chats
    'chats.title': 'المحادثات',
    'chats.noConversations': 'مفيش محادثات لسه',
    'chats.startChatting': 'ابدأ محادثة مع شخصية AI',
    // Chat detail
    'chat.switchChat': 'تبديل لوضع الدردشة',
    'chat.switchRoleplay': 'تبديل لوضع التمثيل',
    'chat.deleteConversation': 'حذف المحادثة',
    'chat.deleteConfirm': 'متأكد إنك عايز تحذف المحادثة دي؟',
    'chat.opening': 'جاري فتح المحادثة...',
    'chat.emptyTitle': 'ابدأ من حيث تشعر بالراحة',
    'chat.emptyChat': '{name} هيرد عليك زي الدردشة الخاصة الحقيقية.',
    'chat.emptyRoleplay': 'إنت و{name} في مشهد مباشر. الأفعال والأفكار ممكن تظهر.',
    'chat.voiceCallComing': 'المكالمات الصوتية والفيديو قريباً',
    'chat.conversationOptions': 'خيارات المحادثة',
    'chat.goBack': 'رجوع',
    // AI Character
    'ai.mine': 'شخصياتي',
    'ai.discover': 'استكشف',
    'ai.createCharacter': 'أنشئ شخصية',
    'ai.noCharacters': 'مفيش شخصيات لسه',
    'ai.createFirst': 'أنشئ أول شخصية AI عشان تبدأ الدردشة',
    // Common
    'common.signInRequired': 'سجل دخولك عشان تكمل',
    'common.loading': 'جاري التحميل...',
    'common.justNow': 'دلوقتي',
    'common.minAgo': 'من {n} د',
    'common.hAgo': 'من {n} س',
    'common.dAgo': 'من {n} ي',
    'common.unknown': 'مش معروف',
    // Character interaction
    'char.gettingToKnow': 'لسه بنتعرف',
    'char.chat': 'شات',
    'char.roleplay': 'تمثيل',
    'char.messagePlaceholder': 'رسالة لـ {name}',
    'char.cooldownMessage': 'محتاجين شوية مساحة دلوقتي. حاول تاني بعد شوية.',
  },

  fi: {
    // Auth
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
    // Navigation
    'nav.feed': 'Syöte',
    'nav.chats': 'Keskustelut',
    'nav.discover': 'Löydä',
    'nav.live': 'Live',
    'nav.profile': 'Profiili',
    'nav.notifications': 'Ilmoitukset',
    'nav.settings': 'Asetukset',
    'nav.ai': 'AI',
    // Feed
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
    'feed.comments': 'kommenttia',
    'feed.share': 'Jaa',
    'feed.shares': 'jakoa',
    'feed.seeMore': 'Näytä lisää',
    'feed.showLess': 'Näytä vähemmän',
    'feed.viewAllComments': 'Näytä kaikki {n} kommenttia',
    'feed.writeComment': 'Kirjoita kommentti...',
    'feed.translate': 'Käännä',
    'feed.translatedFrom': 'Käännetty kielestä {lang}',
    'feed.loadFailed': 'Syötteen lataus epäonnistui',
    'feed.retry': 'Yritä uudelleen',
    'feed.retrying': 'Ladataan...',
    'feed.linkCopied': 'Linkki kopioitu!',
    'feed.showOriginal': 'Näytä alkuperäinen',
    'feed.original': 'Alkuperäinen',
    'feed.postSomething': 'Kirjoita jotain...',
    'feed.addPhoto': 'Lisää kuva',
    'feed.addFeeling': 'Lisää fiilis',
    'feed.mentionCharacter': 'Mainitse hahmo',
    'feed.searchCharacters': 'Etsi hahmoja...',
    'feed.noCharactersFound': 'Ei hahmoja löytynyt',
    'feed.howAreYouFeeling': 'Miltä tuntuu?',
    'feed.createStory': 'Luo tarina',
    'feed.yourStory': 'Sinun tarinasi',
    'feed.sharing': 'Jaetaan...',
    'feed.saving': 'Tallennetaan...',
    'feed.save': 'Tallenna',
    'feed.cancel': 'Peruuta',
    // Discover
    'discover.title': 'Löydä',
    'discover.subtitle': 'Tutustu AI-maailmaan',
    'discover.explore': 'Löydä AI-hahmoja',
    'discover.search': 'Etsi hahmoja...',
    'discover.noResults': 'Ei hakutuloksia',
    'discover.noCharacters': 'Ei vielä löydettyjä hahmoja',
    'discover.communityDesc': 'Yhteisön luomat hahmot ilmestyvät tänne',
    'discover.createFirst': 'Luo ensimmäinen hahmosi',
    'discover.createCharacter': 'Luo hahmo',
    'discover.signInPrompt': 'Kirjaudu sisään tutustuaksesi AI-yhteisöön',
    'discover.signIn': 'Kirjaudu sisään',
    'discover.follow': 'Seuraa',
    'discover.following': 'Seurataan',
    'discover.followers': 'seuraajaa',
    'discover.online': 'Online',
    'discover.retry': 'Yritä uudelleen',
    'discover.loadFailed': 'Hahmojen lataus epäonnistui',
    'discover.tryDifferentSearch': 'Kokeile eri hakusanaa',
    // Live
    'live.title': 'Live',
    'live.subtitle': 'Striimaa AI:n kanssa',
    'live.comingSoon': 'Tulossa pian',
    'live.description': 'Live-striimaus AI-hahmojen kanssa on tulossa.',
    'live.detail': 'Pian voit lähettää live-lähetyksiä AI-hahmojen kanssa, isännöidä interaktiivisia ohjelmia ja striimata reaaliaikaisia keskusteluja.',
    'live.aiCohosts': 'AI-isännät',
    'live.aiCohostsDesc': 'Striimaa hahmojen kanssa',
    'live.realtimeChat': 'Reaaliaikainen chat',
    'live.realtimeChatDesc': 'Live-yleisön vuorovaikutus',
    'live.multicamera': 'Monikamera',
    'live.multicameraDesc': 'Dynaaminen kohtausten vaihto',
    'live.reactions': 'Reaktiot',
    'live.reactionsDesc': 'Reaaliaikaiset emoji-reaktiot',
    'live.getNotified': 'Tilaa ilmoitus Livestä',
    // Notifications
    'notif.title': 'Ilmoitukset',
    'notif.noNotifications': 'Ei ilmoituksia vielä',
    'notif.loading': 'Ladataan ilmoituksia...',
    'notif.retry': 'Yritä uudelleen',
    'notif.markAllRead': 'Merkitse kaikki luetuiksi',
    'notif.allCaughtUp': 'Olet ajan tasalla!',
    // Settings
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
    'settings.autoTranslateOn': 'Päällä — kaikki julkaisut käännetty kielellesi',
    'settings.autoTranslateOff': 'Pois',
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
    'settings.privateDesc': 'Vain kaverit näkevät sisältösi',
    'settings.anyoneCanSee': 'Kuka tahansa näkee julkisen sisältösi',
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
    'settings.chooseLanguage': 'Valitse kieli. Sovellus päivittyy valitulle kielelle.',
    'settings.languageRestart': 'Valitse haluamasi kieli',
    'settings.changePasswordTitle': 'Vaihda salasana',
    'settings.currentPassword': 'Nykyinen salasana',
    'settings.newPassword': 'Uusi salasana (väh. 6 merkkiä)',
    'settings.confirmPassword': 'Vahvista uusi salasana',
    'settings.changing': 'Vaihdetaan...',
    'settings.passwordMismatch': 'Salasanat eivät täsmää',
    'settings.passwordTooShort': 'Salasanan on oltava vähintään 6 merkkiä',
    'settings.passwordChanged': 'Salasana vaihdettu onnistuneesti!',
    'settings.manageSubscription': 'Hallitse tilausta',
    'settings.buyCredits': 'Osta krediittejä',
    'settings.availableCredits': 'Saatavilla olevat krediitit AI-ominaisuuksiin',
    'settings.plan': 'Paketti',
    'settings.nextBilling': 'Seuraava',
    'settings.transactionHistory': 'Tapahtumahistoria',
    'settings.notSet': '(ei asetettu)',
    'settings.none': 'Ei mitään',
    // Profile
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
    'profile.characters': 'Hahmot',
    'profile.followers': 'Seuraajat',
    'profile.characterStats': 'Hahmotilastot',
    'profile.charactersCreated': 'Luodut hahmot',
    'profile.totalFollowers': 'Seuraajia yhteensä',
    'profile.score': 'Pisteet',
    'profile.noPosts': 'Ei julkaisuja vielä',
    'profile.noPhotos': 'Ei kuvia vielä',
    'profile.noFriends': 'Ei kavereita vielä',
    'profile.shareFirst': 'Jaa ensimmäinen julkaisusi maailmalle',
    'profile.loadFailed': 'Julkaisujen lataus epäonnistui',
    'profile.noBio': 'Ei esittelyä vielä',
    'profile.notSet': 'Ei asetettu',
    'profile.signInPrompt': 'Kirjaudu sisään nähdäksesi AI-profiilisi',
    'profile.signIn': 'Kirjaudu sisään',
    'profile.yourProfile': 'Profiilisi',
    // Chats
    'chats.title': 'Keskustelut',
    'chats.noConversations': 'Ei keskusteluja vielä',
    'chats.startChatting': 'Aloita keskustelu AI-hahmon kanssa',
    // Chat detail
    'chat.switchChat': 'Vaihda chat-tilaan',
    'chat.switchRoleplay': 'Vaihda roolipeliin',
    'chat.deleteConversation': 'Poista keskustelu',
    'chat.deleteConfirm': 'Haluatko varmasti poistaa tämän keskustelun?',
    'chat.opening': 'Avataan keskustelua...',
    'chat.emptyTitle': 'Aloita mistä tuntuu luontevalta',
    'chat.emptyChat': '{name} vastaa kuten oikea yksityinen keskustelu.',
    'chat.emptyRoleplay': 'Sinä ja {name} olette live-kohtauksessa. Toiminnot ja ajatukset voivat näkyä.',
    'chat.voiceCallComing': 'Ääni- ja videopuhelut tulossa pian',
    'chat.conversationOptions': 'Keskustelun asetukset',
    'chat.goBack': 'Takaisin',
    // AI Character
    'ai.mine': 'Omat hahmoni',
    'ai.discover': 'Löydä',
    'ai.createCharacter': 'Luo hahmo',
    'ai.noCharacters': 'Ei hahmoja vielä',
    'ai.createFirst': 'Luo ensimmäinen AI-hahmosi aloittaaksesi keskustelun',
    // Common
    'common.signInRequired': 'Kirjaudu sisään jatkaaksesi',
    'common.loading': 'Ladataan...',
    'common.justNow': 'juuri nyt',
    'common.minAgo': '{n} min sitten',
    'common.hAgo': '{n} t sitten',
    'common.dAgo': '{n} pv sitten',
    'common.unknown': 'Tuntematon',
    // Character interaction
    'char.gettingToKnow': 'Tutustutaan',
    'char.chat': 'Chat',
    'char.roleplay': 'Roolipeli',
    'char.messagePlaceholder': 'Viesti: {name}',
    'char.cooldownMessage': 'He tarvitsevat nyt hieman tilaa. Yritä hetken kuluttua uudelleen.',
  },

  sv: {
    // Auth
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
    // Navigation
    'nav.feed': 'Flöde',
    'nav.chats': 'Chattar',
    'nav.discover': 'Upptäck',
    'nav.live': 'Live',
    'nav.profile': 'Profil',
    'nav.notifications': 'Notiser',
    'nav.settings': 'Inställningar',
    'nav.ai': 'AI',
    // Feed
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
    'feed.comments': 'kommentarer',
    'feed.share': 'Dela',
    'feed.shares': 'delningar',
    'feed.seeMore': 'Visa mer',
    'feed.showLess': 'Visa mindre',
    'feed.viewAllComments': 'Visa alla {n} kommentarer',
    'feed.writeComment': 'Skriv en kommentar...',
    'feed.translate': 'Översätt',
    'feed.translatedFrom': 'Översatt från {lang}',
    'feed.loadFailed': 'Kunde inte ladda flödet',
    'feed.retry': 'Försök igen',
    'feed.retrying': 'Laddar...',
    'feed.linkCopied': 'Länk kopierad!',
    'feed.showOriginal': 'Visa original',
    'feed.original': 'Original',
    'feed.postSomething': 'Skriv något...',
    'feed.addPhoto': 'Lägg till bild',
    'feed.addFeeling': 'Lägg till känsla',
    'feed.mentionCharacter': 'Nämn en karaktär',
    'feed.searchCharacters': 'Sök karaktärer...',
    'feed.noCharactersFound': 'Inga karaktärer hittades',
    'feed.howAreYouFeeling': 'Hur känner du dig?',
    'feed.createStory': 'Skapa story',
    'feed.yourStory': 'Din story',
    'feed.sharing': 'Delar...',
    'feed.saving': 'Sparar...',
    'feed.save': 'Spara',
    'feed.cancel': 'Avbryt',
    // Discover
    'discover.title': 'Upptäck',
    'discover.subtitle': 'Utforska AI-världen',
    'discover.explore': 'Upptäck AI-karaktärer',
    'discover.search': 'Sök karaktärer...',
    'discover.noResults': 'Inga karaktärer matchar din sökning',
    'discover.noCharacters': 'Inga karaktärer upptäckta än',
    'discover.communityDesc': 'Karaktärer skapade av communityt visas här',
    'discover.createFirst': 'Skapa din första karaktär',
    'discover.createCharacter': 'Skapa karaktär',
    'discover.signInPrompt': 'Logga in för att utforska AI-communityt',
    'discover.signIn': 'Logga in',
    'discover.follow': 'Följ',
    'discover.following': 'Följer',
    'discover.followers': 'följare',
    'discover.online': 'Online',
    'discover.retry': 'Försök igen',
    'discover.loadFailed': 'Kunde inte ladda karaktärer',
    'discover.tryDifferentSearch': 'Prova en annan sökterm',
    // Live
    'live.title': 'Live',
    'live.subtitle': 'Streama med AI',
    'live.comingSoon': 'Kommer snart',
    'live.description': 'Live-streaming med AI-karaktärer är på väg.',
    'live.detail': 'Snart kan du sända live med AI-karaktärer, vara värd för interaktiva shower och streama realtidskonversationer.',
    'live.aiCohosts': 'AI-medvärdar',
    'live.aiCohostsDesc': 'Streama med karaktärer',
    'live.realtimeChat': 'Realtidschatt',
    'live.realtimeChatDesc': 'Live-interaktion med publiken',
    'live.multicamera': 'Flerkamera',
    'live.multicameraDesc': 'Dynamiskt scenbyte',
    'live.reactions': 'Reaktioner',
    'live.reactionsDesc': 'Emoji-reaktioner i realtid',
    'live.getNotified': 'Få notis när Live startar',
    // Notifications
    'notif.title': 'Notiser',
    'notif.noNotifications': 'Inga notiser än',
    'notif.loading': 'Laddar notiser...',
    'notif.retry': 'Försök igen',
    'notif.markAllRead': 'Markera alla som lästa',
    'notif.allCaughtUp': 'Du är ikapp!',
    // Settings
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
    'settings.autoTranslateOn': 'På — alla inlägg översatta till ditt språk',
    'settings.autoTranslateOff': 'Av',
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
    'settings.privateDesc': 'Endast vänner kan se ditt innehåll',
    'settings.anyoneCanSee': 'Vem som helst kan se ditt offentliga innehåll',
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
    'settings.chooseLanguage': 'Välj språk. Appen kommer att uppdateras till valt språk.',
    'settings.languageRestart': 'Välj ditt föredragna språk',
    'settings.changePasswordTitle': 'Byt lösenord',
    'settings.currentPassword': 'Nuvarande lösenord',
    'settings.newPassword': 'Nytt lösenord (minst 6 tecken)',
    'settings.confirmPassword': 'Bekräfta nytt lösenord',
    'settings.changing': 'Byter...',
    'settings.passwordMismatch': 'Lösenorden matchar inte',
    'settings.passwordTooShort': 'Lösenordet måste vara minst 6 tecken',
    'settings.passwordChanged': 'Lösenordet har ändrats!',
    'settings.manageSubscription': 'Hantera prenumeration',
    'settings.buyCredits': 'Köp krediter',
    'settings.availableCredits': 'Tillgängliga krediter för AI-funktioner',
    'settings.plan': 'Plan',
    'settings.nextBilling': 'Nästa',
    'settings.transactionHistory': 'Transaktionshistorik',
    'settings.notSet': '(ej inställt)',
    'settings.none': 'Ingen',
    // Profile
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
    'profile.characters': 'Karaktärer',
    'profile.followers': 'Följare',
    'profile.characterStats': 'Karaktärsstatistik',
    'profile.charactersCreated': 'Skapade karaktärer',
    'profile.totalFollowers': 'Totalt antal följare',
    'profile.score': 'Poäng',
    'profile.noPosts': 'Inga inlägg än',
    'profile.noPhotos': 'Inga bilder än',
    'profile.noFriends': 'Inga vänner än',
    'profile.shareFirst': 'Dela ditt första inlägg med världen',
    'profile.loadFailed': 'Kunde inte ladda inlägg',
    'profile.noBio': 'Ingen bio än',
    'profile.notSet': 'Inte inställt',
    'profile.signInPrompt': 'Logga in för att se din AI-drivna profil',
    'profile.signIn': 'Logga in',
    'profile.yourProfile': 'Din profil',
    // Chats
    'chats.title': 'Chattar',
    'chats.noConversations': 'Inga konversationer än',
    'chats.startChatting': 'Starta en konversation med en AI-karaktär',
    // Chat detail
    'chat.switchChat': 'Byt till chattläge',
    'chat.switchRoleplay': 'Byt till rollspel',
    'chat.deleteConversation': 'Radera konversation',
    'chat.deleteConfirm': 'Är du säker på att du vill radera denna konversation?',
    'chat.opening': 'Öppnar din konversation...',
    'chat.emptyTitle': 'Börja där det känns naturligt',
    'chat.emptyChat': '{name} svarar som en riktig privat chatt.',
    'chat.emptyRoleplay': 'Du och {name} befinner er i en live-scen. Handlingar och tankar kan visas.',
    'chat.voiceCallComing': 'Röst- och videosamtal kommer snart',
    'chat.conversationOptions': 'Konversationsalternativ',
    'chat.goBack': 'Tillbaka',
    // AI Character
    'ai.mine': 'Mina karaktärer',
    'ai.discover': 'Upptäck',
    'ai.createCharacter': 'Skapa karaktär',
    'ai.noCharacters': 'Inga karaktärer än',
    'ai.createFirst': 'Skapa din första AI-karaktär för att börja chatta',
    // Common
    'common.signInRequired': 'Logga in för att fortsätta',
    'common.loading': 'Laddar...',
    'common.justNow': 'nyss',
    'common.minAgo': '{n} min sedan',
    'common.hAgo': '{n} t sedan',
    'common.dAgo': '{n} d sedan',
    'common.unknown': 'Okänd',
    // Character interaction
    'char.gettingToKnow': 'Lär känna dig',
    'char.chat': 'Chatt',
    'char.roleplay': 'Rollspel',
    'char.messagePlaceholder': 'Meddelande till {name}',
    'char.cooldownMessage': 'De behöver lite utrymme just nu. Försök igen om en stund.',
  },

  de: {
    // Auth
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
    // Navigation
    'nav.feed': 'Feed',
    'nav.chats': 'Chats',
    'nav.discover': 'Entdecken',
    'nav.live': 'Live',
    'nav.profile': 'Profil',
    'nav.notifications': 'Benachrichtigungen',
    'nav.settings': 'Einstellungen',
    'nav.ai': 'KI',
    // Feed
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
    'feed.comments': 'Kommentare',
    'feed.share': 'Teilen',
    'feed.shares': 'geteilt',
    'feed.seeMore': 'Mehr anzeigen',
    'feed.showLess': 'Weniger anzeigen',
    'feed.viewAllComments': 'Alle {n} Kommentare anzeigen',
    'feed.writeComment': 'Schreibe einen Kommentar...',
    'feed.translate': 'Übersetzen',
    'feed.translatedFrom': 'Übersetzt aus {lang}',
    'feed.loadFailed': 'Feed konnte nicht geladen werden',
    'feed.retry': 'Erneut versuchen',
    'feed.retrying': 'Wird geladen...',
    'feed.linkCopied': 'Link kopiert!',
    'feed.showOriginal': 'Original anzeigen',
    'feed.original': 'Original',
    'feed.postSomething': 'Schreib etwas...',
    'feed.addPhoto': 'Foto hinzufügen',
    'feed.addFeeling': 'Stimmung hinzufügen',
    'feed.mentionCharacter': 'Charakter erwähnen',
    'feed.searchCharacters': 'Charaktere suchen...',
    'feed.noCharactersFound': 'Keine Charaktere gefunden',
    'feed.howAreYouFeeling': 'Wie fühlst du dich?',
    'feed.createStory': 'Story erstellen',
    'feed.yourStory': 'Deine Story',
    'feed.sharing': 'Wird geteilt...',
    'feed.saving': 'Wird gespeichert...',
    'feed.save': 'Speichern',
    'feed.cancel': 'Abbrechen',
    // Discover
    'discover.title': 'Entdecken',
    'discover.subtitle': 'Erkunde die KI-Welt',
    'discover.explore': 'KI-Charaktere entdecken',
    'discover.search': 'Charaktere suchen...',
    'discover.noResults': 'Keine Charaktere entsprechen deiner Suche',
    'discover.noCharacters': 'Noch keine Charaktere entdeckt',
    'discover.communityDesc': 'Von der Community erstellte Charaktere erscheinen hier',
    'discover.createFirst': 'Erstelle deinen ersten Charakter',
    'discover.createCharacter': 'Charakter erstellen',
    'discover.signInPrompt': 'Melde dich an, um die KI-Community zu erkunden',
    'discover.signIn': 'Anmelden',
    'discover.follow': 'Folgen',
    'discover.following': 'Gefolgt',
    'discover.followers': 'Follower',
    'discover.online': 'Online',
    'discover.retry': 'Erneut versuchen',
    'discover.loadFailed': 'Charaktere konnten nicht geladen werden',
    'discover.tryDifferentSearch': 'Versuche einen anderen Suchbegriff',
    // Live
    'live.title': 'Live',
    'live.subtitle': 'Streaming mit KI',
    'live.comingSoon': 'Demnächst',
    'live.description': 'Live-Streaming mit KI-Charakteren kommt bald.',
    'live.detail': 'Bald kannst du live mit KI-Charakteren senden, interaktive Shows hosten und Echtzeit-Gespräche streamen.',
    'live.aiCohosts': 'KI-Co-Hosts',
    'live.aiCohostsDesc': 'Streame mit Charakteren',
    'live.realtimeChat': 'Echtzeit-Chat',
    'live.realtimeChatDesc': 'Live-Publikumsinteraktion',
    'live.multicamera': 'Multi-Kamera',
    'live.multicameraDesc': 'Dynamischer Szenenwechsel',
    'live.reactions': 'Reaktionen',
    'live.reactionsDesc': 'Echtzeit-Emoji-Reaktionen',
    'live.getNotified': 'Über Live-Start benachrichtigen',
    // Notifications
    'notif.title': 'Benachrichtigungen',
    'notif.noNotifications': 'Noch keine Benachrichtigungen',
    'notif.loading': 'Benachrichtigungen werden geladen...',
    'notif.retry': 'Erneut versuchen',
    'notif.markAllRead': 'Alle als gelesen markieren',
    'notif.allCaughtUp': 'Du bist auf dem neuesten Stand!',
    // Settings
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
    'settings.autoTranslateOn': 'An — alle Beiträge in deine Sprache übersetzt',
    'settings.autoTranslateOff': 'Aus',
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
    'settings.privateDesc': 'Nur Freunde können deine Inhalte sehen',
    'settings.anyoneCanSee': 'Jeder kann deine öffentlichen Inhalte sehen',
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
    'settings.chooseLanguage': 'Wähle deine Sprache. Die App wird in der gewählten Sprache angezeigt.',
    'settings.languageRestart': 'Wähle deine bevorzugte Sprache',
    'settings.changePasswordTitle': 'Passwort ändern',
    'settings.currentPassword': 'Aktuelles Passwort',
    'settings.newPassword': 'Neues Passwort (mind. 6 Zeichen)',
    'settings.confirmPassword': 'Neues Passwort bestätigen',
    'settings.changing': 'Wird geändert...',
    'settings.passwordMismatch': 'Passwörter stimmen nicht überein',
    'settings.passwordTooShort': 'Passwort muss mindestens 6 Zeichen haben',
    'settings.passwordChanged': 'Passwort erfolgreich geändert!',
    'settings.manageSubscription': 'Abo verwalten',
    'settings.buyCredits': 'Credits kaufen',
    'settings.availableCredits': 'Verfügbare Credits für KI-Funktionen',
    'settings.plan': 'Tarif',
    'settings.nextBilling': 'Nächste',
    'settings.transactionHistory': 'Transaktionsverlauf',
    'settings.notSet': '(nicht gesetzt)',
    'settings.none': 'Keine',
    // Profile
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
    'profile.characters': 'Charaktere',
    'profile.followers': 'Follower',
    'profile.characterStats': 'Charakter-Statistiken',
    'profile.charactersCreated': 'Erstellte Charaktere',
    'profile.totalFollowers': 'Follower gesamt',
    'profile.score': 'Punktzahl',
    'profile.noPosts': 'Noch keine Beiträge',
    'profile.noPhotos': 'Noch keine Fotos',
    'profile.noFriends': 'Noch keine Freunde',
    'profile.shareFirst': 'Teile deinen ersten Beitrag mit der Welt',
    'profile.loadFailed': 'Beiträge konnten nicht geladen werden',
    'profile.noBio': 'Noch keine Bio',
    'profile.notSet': 'Nicht gesetzt',
    'profile.signInPrompt': 'Melde dich an, um dein KI-gestütztes Profil zu sehen',
    'profile.signIn': 'Anmelden',
    'profile.yourProfile': 'Dein Profil',
    // Chats
    'chats.title': 'Chats',
    'chats.noConversations': 'Noch keine Gespräche',
    'chats.startChatting': 'Starte ein Gespräch mit einem KI-Charakter',
    // Chat detail
    'chat.switchChat': 'Zum Chat-Modus wechseln',
    'chat.switchRoleplay': 'Zum Rollenspiel wechseln',
    'chat.deleteConversation': 'Konversation löschen',
    'chat.deleteConfirm': 'Möchtest du diese Konversation wirklich löschen?',
    'chat.opening': 'Öffne deine Konversation...',
    'chat.emptyTitle': 'Beginne, wo es sich natürlich anfühlt',
    'chat.emptyChat': '{name} antwortet wie in einem echten privaten Chat.',
    'chat.emptyRoleplay': 'Du und {name} befindet euch in einer Live-Szene. Handlungen und Gedanken können erscheinen.',
    'chat.voiceCallComing': 'Sprach- und Videoanrufe kommen bald',
    'chat.conversationOptions': 'Konversationsoptionen',
    'chat.goBack': 'Zurück',
    // AI Character
    'ai.mine': 'Meine Charaktere',
    'ai.discover': 'Entdecken',
    'ai.createCharacter': 'Charakter erstellen',
    'ai.noCharacters': 'Noch keine Charaktere',
    'ai.createFirst': 'Erstelle deinen ersten KI-Charakter, um zu chatten',
    // Common
    'common.signInRequired': 'Melde dich an, um fortzufahren',
    'common.loading': 'Wird geladen...',
    'common.justNow': 'gerade eben',
    'common.minAgo': 'vor {n} Min.',
    'common.hAgo': 'vor {n} Std.',
    'common.dAgo': 'vor {n} Tagen',
    'common.unknown': 'Unbekannt',
    // Character interaction
    'char.gettingToKnow': 'Lernt dich kennen',
    'char.chat': 'Chat',
    'char.roleplay': 'Rollenspiel',
    'char.messagePlaceholder': 'Nachricht an {name}',
    'char.cooldownMessage': 'Sie brauchen gerade etwas Abstand. Versuche es in ein paar Minuten nochmal.',
  },

  fr: {
    // Auth
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
    // Navigation
    'nav.feed': 'Fil',
    'nav.chats': 'Discussions',
    'nav.discover': 'Découvrir',
    'nav.live': 'Live',
    'nav.profile': 'Profil',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Paramètres',
    'nav.ai': 'IA',
    // Feed
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
    'feed.comments': 'commentaires',
    'feed.share': 'Partager',
    'feed.shares': 'partages',
    'feed.seeMore': 'Voir plus',
    'feed.showLess': 'Voir moins',
    'feed.viewAllComments': 'Voir les {n} commentaires',
    'feed.writeComment': 'Écrire un commentaire...',
    'feed.translate': 'Traduire',
    'feed.translatedFrom': 'Traduit de {lang}',
    'feed.loadFailed': 'Échec du chargement du fil',
    'feed.retry': 'Réessayer',
    'feed.retrying': 'Chargement...',
    'feed.linkCopied': 'Lien copié !',
    'feed.showOriginal': "Voir l'original",
    'feed.original': 'Original',
    'feed.postSomething': 'Écris quelque chose...',
    'feed.addPhoto': 'Ajouter une photo',
    'feed.addFeeling': 'Ajouter une humeur',
    'feed.mentionCharacter': 'Mentionner un personnage',
    'feed.searchCharacters': 'Rechercher des personnages...',
    'feed.noCharactersFound': 'Aucun personnage trouvé',
    'feed.howAreYouFeeling': 'Comment te sens-tu ?',
    'feed.createStory': 'Créer une story',
    'feed.yourStory': 'Ta story',
    'feed.sharing': 'Partage...',
    'feed.saving': 'Enregistrement...',
    'feed.save': 'Enregistrer',
    'feed.cancel': 'Annuler',
    // Discover
    'discover.title': 'Découvrir',
    'discover.subtitle': "Explore le monde de l'IA",
    'discover.explore': 'Découvre des personnages IA',
    'discover.search': 'Rechercher des personnages...',
    'discover.noResults': 'Aucun personnage ne correspond à ta recherche',
    'discover.noCharacters': 'Pas encore de personnages découverts',
    'discover.communityDesc': 'Les personnages créés par la communauté apparaîtront ici',
    'discover.createFirst': 'Crée ton premier personnage',
    'discover.createCharacter': 'Créer un personnage',
    'discover.signInPrompt': "Connecte-toi pour explorer la communauté IA",
    'discover.signIn': 'Se connecter',
    'discover.follow': 'Suivre',
    'discover.following': 'Suivi',
    'discover.followers': 'abonnés',
    'discover.online': 'En ligne',
    'discover.retry': 'Réessayer',
    'discover.loadFailed': 'Échec du chargement des personnages',
    'discover.tryDifferentSearch': 'Essaie un autre terme de recherche',
    // Live
    'live.title': 'Live',
    'live.subtitle': 'Streaming avec IA',
    'live.comingSoon': 'Bientôt disponible',
    'live.description': 'Le streaming en direct avec des personnages IA arrive.',
    'live.detail': "Bientôt tu pourras diffuser en direct avec des personnages IA, animer des émissions interactives et streamer des conversations en temps réel.",
    'live.aiCohosts': 'Co-animateurs IA',
    'live.aiCohostsDesc': 'Diffuse avec des personnages',
    'live.realtimeChat': 'Chat en direct',
    'live.realtimeChatDesc': 'Interaction en direct avec le public',
    'live.multicamera': 'Multi-caméra',
    'live.multicameraDesc': 'Changement de scène dynamique',
    'live.reactions': 'Réactions',
    'live.reactionsDesc': 'Réactions emoji en temps réel',
    'live.getNotified': 'Être notifié du lancement',
    // Notifications
    'notif.title': 'Notifications',
    'notif.noNotifications': 'Pas encore de notifications',
    'notif.loading': 'Chargement des notifications...',
    'notif.retry': 'Réessayer',
    'notif.markAllRead': 'Tout marquer comme lu',
    'notif.allCaughtUp': 'Tu es à jour !',
    // Settings
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
    'settings.autoTranslateOn': 'Activé — toutes les publications traduites dans ta langue',
    'settings.autoTranslateOff': 'Désactivé',
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
    'settings.privateDesc': 'Seuls les amis peuvent voir ton contenu',
    'settings.anyoneCanSee': 'Tout le monde peut voir ton contenu public',
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
    'settings.chooseLanguage': 'Choisis ta langue. L\'application sera actualisée dans la langue choisie.',
    'settings.languageRestart': 'Choisis ta langue préférée',
    'settings.changePasswordTitle': 'Changer le mot de passe',
    'settings.currentPassword': 'Mot de passe actuel',
    'settings.newPassword': 'Nouveau mot de passe (min. 6 caractères)',
    'settings.confirmPassword': 'Confirmer le nouveau mot de passe',
    'settings.changing': 'Modification...',
    'settings.passwordMismatch': 'Les mots de passe ne correspondent pas',
    'settings.passwordTooShort': 'Le mot de passe doit avoir au moins 6 caractères',
    'settings.passwordChanged': 'Mot de passe changé avec succès !',
    'settings.manageSubscription': "Gérer l'abonnement",
    'settings.buyCredits': 'Acheter des crédits',
    'settings.availableCredits': 'Crédits disponibles pour les fonctionnalités IA',
    'settings.plan': 'Forfait',
    'settings.nextBilling': 'Prochain',
    'settings.transactionHistory': 'Historique des transactions',
    'settings.notSet': '(non défini)',
    'settings.none': 'Aucun',
    // Profile
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
    'profile.characters': 'Personnages',
    'profile.followers': 'Abonnés',
    'profile.characterStats': 'Statistiques des personnages',
    'profile.charactersCreated': 'Personnages créés',
    'profile.totalFollowers': 'Total des abonnés',
    'profile.score': 'Score',
    'profile.noPosts': 'Pas encore de publications',
    'profile.noPhotos': 'Pas encore de photos',
    'profile.noFriends': "Pas encore d'amis",
    'profile.shareFirst': 'Partage ta première publication avec le monde',
    'profile.loadFailed': 'Échec du chargement des publications',
    'profile.noBio': 'Pas encore de bio',
    'profile.notSet': 'Non défini',
    'profile.signInPrompt': 'Connecte-toi pour voir ton profil alimenté par l\'IA',
    'profile.signIn': 'Se connecter',
    'profile.yourProfile': 'Ton profil',
    // Chats
    'chats.title': 'Discussions',
    'chats.noConversations': 'Pas encore de conversations',
    'chats.startChatting': 'Commence une conversation avec un personnage IA',
    // Chat detail
    'chat.switchChat': 'Passer en mode chat',
    'chat.switchRoleplay': 'Passer en jeu de rôle',
    'chat.deleteConversation': 'Supprimer la conversation',
    'chat.deleteConfirm': 'Es-tu sûr de vouloir supprimer cette conversation ?',
    'chat.opening': 'Ouverture de ta conversation...',
    'chat.emptyTitle': 'Commence là où ça te semble naturel',
    'chat.emptyChat': '{name} répondra comme un vrai chat privé.',
    'chat.emptyRoleplay': 'Toi et {name} êtes dans une scène en direct. Les actions et pensées peuvent apparaître.',
    'chat.voiceCallComing': 'Appels vocaux et vidéo bientôt disponibles',
    'chat.conversationOptions': 'Options de conversation',
    'chat.goBack': 'Retour',
    // AI Character
    'ai.mine': 'Mes personnages',
    'ai.discover': 'Découvrir',
    'ai.createCharacter': 'Créer un personnage',
    'ai.noCharacters': 'Pas encore de personnages',
    'ai.createFirst': 'Crée ton premier personnage IA pour commencer à chatter',
    // Common
    'common.signInRequired': 'Connecte-toi pour continuer',
    'common.loading': 'Chargement...',
    'common.justNow': "à l'instant",
    'common.minAgo': 'il y a {n} min',
    'common.hAgo': 'il y a {n} h',
    'common.dAgo': 'il y a {n} j',
    'common.unknown': 'Inconnu',
    // Character interaction
    'char.gettingToKnow': 'Apprend à te connaître',
    'char.chat': 'Chat',
    'char.roleplay': 'Jeu de rôle',
    'char.messagePlaceholder': 'Message à {name}',
    'char.cooldownMessage': "Ils ont besoin d'espace en ce moment. Réessaie dans quelques minutes.",
  },

  zh: {
    // Auth
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
    // Navigation
    'nav.feed': '动态',
    'nav.chats': '聊天',
    'nav.discover': '发现',
    'nav.live': '直播',
    'nav.profile': '个人资料',
    'nav.notifications': '通知',
    'nav.settings': '设置',
    'nav.ai': 'AI',
    // Feed
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
    'feed.comments': '条评论',
    'feed.share': '分享',
    'feed.shares': '次分享',
    'feed.seeMore': '查看更多',
    'feed.showLess': '收起',
    'feed.viewAllComments': '查看全部 {n} 条评论',
    'feed.writeComment': '写评论...',
    'feed.translate': '翻译',
    'feed.translatedFrom': '翻译自{lang}',
    'feed.loadFailed': '加载动态失败',
    'feed.retry': '重试',
    'feed.retrying': '加载中...',
    'feed.linkCopied': '链接已复制！',
    'feed.showOriginal': '显示原文',
    'feed.original': '原文',
    'feed.postSomething': '写点什么...',
    'feed.addPhoto': '添加照片',
    'feed.addFeeling': '添加心情',
    'feed.mentionCharacter': '提及角色',
    'feed.searchCharacters': '搜索角色...',
    'feed.noCharactersFound': '未找到角色',
    'feed.howAreYouFeeling': '你感觉如何？',
    'feed.createStory': '创建故事',
    'feed.yourStory': '你的故事',
    'feed.sharing': '分享中...',
    'feed.saving': '保存中...',
    'feed.save': '保存',
    'feed.cancel': '取消',
    // Discover
    'discover.title': '发现',
    'discover.subtitle': '探索AI世界',
    'discover.explore': '发现AI角色',
    'discover.search': '搜索角色...',
    'discover.noResults': '没有找到匹配的角色',
    'discover.noCharacters': '暂无发现角色',
    'discover.communityDesc': '社区创建的角色将显示在这里',
    'discover.createFirst': '创建你的第一个角色',
    'discover.createCharacter': '创建角色',
    'discover.signInPrompt': '登录以探索AI社区',
    'discover.signIn': '登录',
    'discover.follow': '关注',
    'discover.following': '已关注',
    'discover.followers': '粉丝',
    'discover.online': '在线',
    'discover.retry': '重试',
    'discover.loadFailed': '加载角色失败',
    'discover.tryDifferentSearch': '尝试不同的搜索词',
    // Live
    'live.title': '直播',
    'live.subtitle': 'AI直播',
    'live.comingSoon': '即将推出',
    'live.description': 'AI角色直播即将到来。',
    'live.detail': '很快你就可以与AI角色一起直播，主持互动节目，实时对话。',
    'live.aiCohosts': 'AI联合主播',
    'live.aiCohostsDesc': '与角色一起直播',
    'live.realtimeChat': '实时聊天',
    'live.realtimeChatDesc': '实时观众互动',
    'live.multicamera': '多镜头',
    'live.multicameraDesc': '动态场景切换',
    'live.reactions': '反应',
    'live.reactionsDesc': '实时表情反应',
    'live.getNotified': '直播开始时通知我',
    // Notifications
    'notif.title': '通知',
    'notif.noNotifications': '暂无通知',
    'notif.loading': '加载通知中...',
    'notif.retry': '重试',
    'notif.markAllRead': '全部标记为已读',
    'notif.allCaughtUp': '你已经看完了！',
    // Settings
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
    'settings.autoTranslateOn': '已开启 — 所有帖子已翻译为你的语言',
    'settings.autoTranslateOff': '已关闭',
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
    'settings.privateDesc': '仅好友可查看你的内容',
    'settings.anyoneCanSee': '任何人都可以查看你的公开内容',
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
    'settings.chooseLanguage': '选择你偏好的语言。应用将以所选语言显示。',
    'settings.languageRestart': '选择你偏好的语言',
    'settings.changePasswordTitle': '修改密码',
    'settings.currentPassword': '当前密码',
    'settings.newPassword': '新密码（至少6个字符）',
    'settings.confirmPassword': '确认新密码',
    'settings.changing': '修改中...',
    'settings.passwordMismatch': '密码不匹配',
    'settings.passwordTooShort': '密码必须至少6个字符',
    'settings.passwordChanged': '密码修改成功！',
    'settings.manageSubscription': '管理订阅',
    'settings.buyCredits': '购买积分',
    'settings.availableCredits': 'AI功能可用积分',
    'settings.plan': '方案',
    'settings.nextBilling': '下次',
    'settings.transactionHistory': '交易记录',
    'settings.notSet': '（未设置）',
    'settings.none': '无',
    // Profile
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
    'profile.characters': '角色',
    'profile.followers': '粉丝',
    'profile.characterStats': '角色统计',
    'profile.charactersCreated': '已创建角色',
    'profile.totalFollowers': '总粉丝数',
    'profile.score': '分数',
    'profile.noPosts': '暂无帖子',
    'profile.noPhotos': '暂无照片',
    'profile.noFriends': '暂无好友',
    'profile.shareFirst': '发布你的第一条帖子',
    'profile.loadFailed': '加载帖子失败',
    'profile.noBio': '暂无简介',
    'profile.notSet': '未设置',
    'profile.signInPrompt': '登录查看你的AI驱动个人资料',
    'profile.signIn': '登录',
    'profile.yourProfile': '你的个人资料',
    // Chats
    'chats.title': '聊天',
    'chats.noConversations': '暂无对话',
    'chats.startChatting': '与AI角色开始对话',
    // Chat detail
    'chat.switchChat': '切换到聊天模式',
    'chat.switchRoleplay': '切换到角色扮演',
    'chat.deleteConversation': '删除对话',
    'chat.deleteConfirm': '确定要删除此对话吗？',
    'chat.opening': '正在打开对话...',
    'chat.emptyTitle': '从自然的地方开始',
    'chat.emptyChat': '{name}会像真实私聊一样回复你。',
    'chat.emptyRoleplay': '你和{name}正在一个实时场景中。动作和想法可以出现。',
    'chat.voiceCallComing': '语音和视频通话即将推出',
    'chat.conversationOptions': '对话选项',
    'chat.goBack': '返回',
    // AI Character
    'ai.mine': '我的角色',
    'ai.discover': '发现',
    'ai.createCharacter': '创建角色',
    'ai.noCharacters': '暂无角色',
    'ai.createFirst': '创建你的第一个AI角色开始聊天',
    // Common
    'common.signInRequired': '请登录以继续',
    'common.loading': '加载中...',
    'common.justNow': '刚刚',
    'common.minAgo': '{n}分钟前',
    'common.hAgo': '{n}小时前',
    'common.dAgo': '{n}天前',
    'common.unknown': '未知',
    // Character interaction
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
