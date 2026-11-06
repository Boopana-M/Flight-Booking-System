// STEP 1: i18next setup (multi-language support)
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// STEP 2: simple translations (keep it small for learning)
const resources = {
  en: {
    translation: {
      appName: "Flight Booking",
      login: "Login",
      register: "Register",
      logout: "Logout",
      dashboard: "Dashboard",
      profile: "Profile",
      chat: "Support Chat",
      searchFlights: "Search Flights",
      bookNow: "Book Now",
      payNow: "Pay Now",
      notifications: "Notifications",
      dark: "Dark",
      light: "Light"
    }
  },
  hi: {
    translation: {
      appName: "फ्लाइट बुकिंग",
      login: "लॉगिन",
      register: "रजिस्टर",
      logout: "लॉगआउट",
      dashboard: "डैशबोर्ड",
      profile: "प्रोफाइल",
      chat: "सपोर्ट चैट",
      searchFlights: "फ्लाइट खोजें",
      bookNow: "बुक करें",
      payNow: "भुगतान करें",
      notifications: "नोटिफिकेशन",
      dark: "डार्क",
      light: "लाइट"
    }
  }
};

// STEP 3: init
i18n.use(initReactI18next).init({
  resources,
  lng: "en", // default language
  fallbackLng: "en",
  interpolation: { escapeValue: false }
});

export default i18n;

