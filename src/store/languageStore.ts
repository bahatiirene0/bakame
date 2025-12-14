/**
 * Language Store - Manages UI language preference
 *
 * Features:
 * - Persists to localStorage
 * - Comprehensive translations for all UI text
 * - Syncs with AI response language
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'rw' | 'en';

interface LanguageState {
  language: Language;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'rw',
      toggleLanguage: () => set((state) => ({
        language: state.language === 'rw' ? 'en' : 'rw'
      })),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'bakame-language',
    }
  )
);

// Comprehensive translations for full language consistency
export const translations = {
  rw: {
    // ===== WELCOME & BRANDING =====
    welcome: 'Murakaza neza kuri',
    tagline: "AI y'Abanyarwanda - Umufasha wawe w'ubwenge",
    bakame: 'Bakame',

    // ===== AUTH - BUTTONS =====
    signIn: 'Injira',
    signUp: 'Iyandikishe',
    signOut: 'Sohoka',
    signInWithGoogle: 'Injira ukoresheje Google',
    signUpWithGoogle: 'Iyandikishe ukoresheje Google',
    or: 'cyangwa',

    // ===== AUTH - FORM FIELDS =====
    email: 'Email (ntibisabwa)',
    emailPlaceholder: 'email@urugero.com',
    phone: 'Telefoni',
    phonePlaceholder: '78X XXX XXX',
    password: "Ijambo ry'ibanga",
    confirmPassword: "Emeza ijambo ry'ibanga",
    fullName: 'Izina ryawe',
    fullNamePlaceholder: 'Izina Ryombi',
    passwordPlaceholder: 'Nibura inyuguti 6',
    confirmPasswordPlaceholder: 'Ongera wandike',

    // ===== AUTH - MESSAGES =====
    loading: 'Tegereza...',
    accountCreated: 'Konti yawe yaremewe!',
    checkEmail: 'Reba email yawe kugirango wemeze.',
    checkPhone: 'Reba SMS kuri telefoni yawe.',
    invalidCredentials: "Email/Telefoni cyangwa ijambo ry'ibanga sibyo.",
    passwordMismatch: "Amagambo y'ibanga ntahura.",
    passwordTooShort: "Ijambo ry'ibanga rigomba kuba nibura inyuguti 6.",
    emailExists: 'Iyi email isanzwe iyanditse.',
    phoneExists: 'Iyi telefoni isanzwe iyanditse.',
    phoneRequired: 'Telefoni irasabwa.',

    // ===== AUTH - PASSWORD REQUIREMENTS =====
    passwordRequirements: "Ijambo ry'ibanga rigomba:",
    minChars: 'Nibura inyuguti 6',
    uppercase: 'Inyuguti nkuru (A-Z)',
    number: 'Umubare (0-9)',

    // ===== AUTH - OTP/VERIFICATION =====
    enterCode: 'Injiza Kode',
    enterCodeDigits: "Injiza kode y'imibare 6",
    codeSentTo: 'Twoherereje kode kuri',
    verifyCode: 'Emeza Kode',
    invalidCode: 'Kode ntiyemewe. Ongera ugerageze.',
    phoneVerified: 'Telefoni yemejwe!',
    newCodeSent: 'Kode nshya yoherejwe!',
    didntReceiveCode: 'Ntabwo wabonye kode? Ongera wohereze',
    goBack: 'Subira inyuma',

    // ===== AUTH - FORGOT PASSWORD =====
    forgotPassword: "Wibagiwe ijambo ry'ibanga?",
    enterYourEmail: 'Injiza email yawe',
    sendResetLink: 'Ohereza link',
    sending: 'Tegereza...',
    emailSent: 'Email yoherejwe!',
    resetLinkSent: "Twoherereje link yo guhindura ijambo ry'ibanga kuri",
    gotIt: 'Sawa',

    // ===== AUTH - EMAIL VERIFICATION =====
    emailVerified: 'Email yemejwe!',
    accountReady: 'Konti yawe iteguye. Injira!',

    // ===== NAVIGATION =====
    backToChat: 'Subira ku kiganiro',
    back: 'Subira',
    termsNotice: 'Ukora konti, wemera amabwiriza yacu',

    // ===== CHAT - INPUT =====
    placeholder: 'Baza Bakame ikibazo cyawe...',
    send: 'Ohereza',
    stop: 'Hagarika',
    pleaseWait: 'Tegereza...',

    // ===== CHAT - MESSAGES =====
    clearChat: 'Siba ibiganiro',
    confirmClearChat: 'Siba ubutumwa bwose?',
    yes: 'Yego',
    no: 'Oya',

    // ===== CHAT - TYPING INDICATOR =====
    bakameThinking: 'Bakame aratekereza',
    bakameTyping: 'Bakame arimo kwandika',

    // ===== SIDEBAR =====
    newChat: 'Ikiganiro Gishya',
    chats: 'Ibiganiro',
    noChats: 'Nta biganiro',
    startNewChat: 'Tangira ikiganiro gishya!',
    rename: 'Hindura',
    delete: 'Siba',

    // ===== SIDEBAR - FEATURES =====
    generateImages: 'Kora Amafoto',
    generateVideos: 'Kora Video',
    voiceAssistant: 'Umufasha w\'Ijwi',

    // ===== PROFILE & SETTINGS =====
    profile: 'Umwirondoro',
    settings: 'Igenamiterere',
    preferences: 'Ibyifuzo',
    data: 'Amakuru',
    profileUpdated: 'Byahinduwe neza!',
    allChatsCleared: 'Ibiganiro byose byasibwe!',

    // ===== COMMON ACTIONS =====
    cancel: 'Bireke',
    confirm: 'Emeza',
    save: 'Bika',
    edit: 'Hindura',
    close: 'Funga',
    retry: 'Ongera ugerageze',

    // ===== ERRORS =====
    error: 'Ikosa',
    somethingWentWrong: 'Hari ikintu kitagenze neza',
    tryAgain: 'Ongera ugerageze',
    networkError: 'Ikibazo cy\'urusobe. Ongera ugerageze.',

    // ===== VOICE ASSISTANT =====
    voiceApiKeyMissing: 'API Key y\'Ijwi Irabuze',
    addVoiceApiKey: 'Ongeraho NEXT_PUBLIC_HUME_API_KEY',
    startVoiceChat: 'Tangira Ikiganiro cy\'Ijwi',
    stopVoiceChat: 'Hagarika Ikiganiro cy\'Ijwi',
    listening: 'Ndategera...',
    speaking: 'Ndavuga...',

    // ===== LOCATION =====
    shareLocation: 'Sangira aho uri',
    locationRequired: 'Aho uri birakenewe kuri serivisi',
    allowLocation: 'Emera aho uri',
    denyLocation: 'Anga',
    locationShared: 'Aho uri harasangijwe',

    // ===== FILE UPLOAD =====
    uploadFile: 'Ohereza dosiye',
    uploadImage: 'Ohereza ifoto',
    maxFileSize: 'Dosiye ntirengwa 10MB',
    invalidFileType: 'Ubwoko bwa dosiye ntibyemewe',

    // ===== TOOLS =====
    searchingWeb: 'Gushakisha ku rubuga...',
    generatingImage: 'Gukora ifoto...',
    generatingVideo: 'Gukora video...',
    checkingWeather: 'Kureba ikirere...',
    calculating: 'Kubara...',
    translating: 'Guhindura ururimi...',
    searchingPlaces: 'Gushakisha ahantu...',
    gettingDirections: 'Kubona inzira...',
    convertingCurrency: 'Guhindura amafaranga...',
    gettingNews: 'Kubona amakuru...',
    runningCode: 'Gukoresha kode...',

    // ===== SUGGESTION CHIPS =====
    suggestion1: 'Njye ndi nde?',
    suggestion2: 'Mfashe kwandika code',
    suggestion3: "Sobanura iby'ubuzima",
    suggestion4: "Ibitekerezo by'ubucuruzi",
    suggestion5: 'Mfashe kwiga',
    suggestion6: 'Andika inkuru',

    // ===== LANGUAGE =====
    switchToEnglish: 'Switch to English',
    switchToKinyarwanda: 'Hindura ube Ikinyarwanda',
    languageChanged: 'Ururimi rwahinduwe',

    // ===== EDIT MESSAGE =====
    editMessage: 'Hindura',
    saveEdit: 'Bika',
    cancelEdit: 'Bireke',
    editingMessage: 'Guhindura ubutumwa...',
  },

  en: {
    // ===== WELCOME & BRANDING =====
    welcome: 'Welcome to',
    tagline: 'Your AI Assistant for Rwanda',
    bakame: 'Bakame',

    // ===== AUTH - BUTTONS =====
    signIn: 'Sign In',
    signUp: 'Sign Up',
    signOut: 'Sign Out',
    signInWithGoogle: 'Sign in with Google',
    signUpWithGoogle: 'Sign up with Google',
    or: 'or',

    // ===== AUTH - FORM FIELDS =====
    email: 'Email (optional)',
    emailPlaceholder: 'email@example.com',
    phone: 'Phone',
    phonePlaceholder: '78X XXX XXX',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    fullName: 'Your Name',
    fullNamePlaceholder: 'Full Name',
    passwordPlaceholder: 'At least 6 characters',
    confirmPasswordPlaceholder: 'Re-enter password',

    // ===== AUTH - MESSAGES =====
    loading: 'Please wait...',
    accountCreated: 'Account created!',
    checkEmail: 'Check your email to verify.',
    checkPhone: 'Check SMS on your phone.',
    invalidCredentials: 'Invalid email/phone or password.',
    passwordMismatch: 'Passwords do not match.',
    passwordTooShort: 'Password must be at least 6 characters.',
    emailExists: 'This email is already registered.',
    phoneExists: 'This phone is already registered.',
    phoneRequired: 'Phone number is required.',

    // ===== AUTH - PASSWORD REQUIREMENTS =====
    passwordRequirements: 'Password must have:',
    minChars: 'At least 6 characters',
    uppercase: 'Uppercase letter (A-Z)',
    number: 'Number (0-9)',

    // ===== AUTH - OTP/VERIFICATION =====
    enterCode: 'Enter Code',
    enterCodeDigits: 'Enter 6-digit code',
    codeSentTo: 'We sent a code to',
    verifyCode: 'Verify Code',
    invalidCode: 'Invalid code. Please try again.',
    phoneVerified: 'Phone verified!',
    newCodeSent: 'New code sent!',
    didntReceiveCode: "Didn't receive code? Resend",
    goBack: 'Go back',

    // ===== AUTH - FORGOT PASSWORD =====
    forgotPassword: 'Forgot password?',
    enterYourEmail: 'Enter your email',
    sendResetLink: 'Send reset link',
    sending: 'Sending...',
    emailSent: 'Email sent!',
    resetLinkSent: 'We sent a password reset link to',
    gotIt: 'Got it',

    // ===== AUTH - EMAIL VERIFICATION =====
    emailVerified: 'Email verified!',
    accountReady: 'Your account is ready. Sign in!',

    // ===== NAVIGATION =====
    backToChat: 'Back to chat',
    back: 'Back',
    termsNotice: 'By creating an account, you agree to our terms',

    // ===== CHAT - INPUT =====
    placeholder: 'Ask Bakame anything...',
    send: 'Send',
    stop: 'Stop',
    pleaseWait: 'Please wait...',

    // ===== CHAT - MESSAGES =====
    clearChat: 'Clear chat',
    confirmClearChat: 'Clear all messages?',
    yes: 'Yes',
    no: 'No',

    // ===== CHAT - TYPING INDICATOR =====
    bakameThinking: 'Bakame is thinking',
    bakameTyping: 'Bakame is typing',

    // ===== SIDEBAR =====
    newChat: 'New Chat',
    chats: 'Chats',
    noChats: 'No chats',
    startNewChat: 'Start a new chat!',
    rename: 'Rename',
    delete: 'Delete',

    // ===== SIDEBAR - FEATURES =====
    generateImages: 'Generate Images',
    generateVideos: 'Generate Videos',
    voiceAssistant: 'Voice Assistant',

    // ===== PROFILE & SETTINGS =====
    profile: 'Profile',
    settings: 'Settings',
    preferences: 'Preferences',
    data: 'Data',
    profileUpdated: 'Profile updated!',
    allChatsCleared: 'All chats cleared!',

    // ===== COMMON ACTIONS =====
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    edit: 'Edit',
    close: 'Close',
    retry: 'Retry',

    // ===== ERRORS =====
    error: 'Error',
    somethingWentWrong: 'Something went wrong',
    tryAgain: 'Please try again',
    networkError: 'Network error. Please try again.',

    // ===== VOICE ASSISTANT =====
    voiceApiKeyMissing: 'Voice API Key Missing',
    addVoiceApiKey: 'Add NEXT_PUBLIC_HUME_API_KEY',
    startVoiceChat: 'Start Voice Chat',
    stopVoiceChat: 'Stop Voice Chat',
    listening: 'Listening...',
    speaking: 'Speaking...',

    // ===== LOCATION =====
    shareLocation: 'Share location',
    locationRequired: 'Location is required for this service',
    allowLocation: 'Allow location',
    denyLocation: 'Deny',
    locationShared: 'Location shared',

    // ===== FILE UPLOAD =====
    uploadFile: 'Upload file',
    uploadImage: 'Upload image',
    maxFileSize: 'Max file size 10MB',
    invalidFileType: 'Invalid file type',

    // ===== TOOLS =====
    searchingWeb: 'Searching the web...',
    generatingImage: 'Generating image...',
    generatingVideo: 'Generating video...',
    checkingWeather: 'Checking weather...',
    calculating: 'Calculating...',
    translating: 'Translating...',
    searchingPlaces: 'Searching places...',
    gettingDirections: 'Getting directions...',
    convertingCurrency: 'Converting currency...',
    gettingNews: 'Getting news...',
    runningCode: 'Running code...',

    // ===== SUGGESTION CHIPS =====
    suggestion1: 'Who are you?',
    suggestion2: 'Help me write code',
    suggestion3: 'Explain health topics',
    suggestion4: 'Business ideas',
    suggestion5: 'Help me study',
    suggestion6: 'Write a story',

    // ===== LANGUAGE =====
    switchToEnglish: 'Switch to English',
    switchToKinyarwanda: 'Hindura ube Ikinyarwanda',
    languageChanged: 'Language changed',

    // ===== EDIT MESSAGE =====
    editMessage: 'Edit',
    saveEdit: 'Save',
    cancelEdit: 'Cancel',
    editingMessage: 'Editing message...',
  },
};

// Type for translation keys
export type TranslationKey = keyof typeof translations.en;

// Hook to get translations for current language
export const useTranslation = () => {
  const { language } = useLanguageStore();
  return translations[language];
};

// Helper to get a specific translation
export const getTranslation = (key: TranslationKey, lang: Language): string => {
  return translations[lang][key] || key;
};
