import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Preferences {
  timezone: string;
  currency: string;
  date_format: string;
  time_format: string;
  language: string;
  theme: string;
}

interface PreferencesContextType {
  preferences: Preferences;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
  formatTime: (date: string | Date) => string;
  formatDateTime: (date: string | Date) => string;
  getCurrencySymbol: () => string;
  refreshPreferences: () => Promise<void>;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const defaultPreferences: Preferences = {
  timezone: 'UTC',
  currency: 'USD',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  language: 'en',
  theme: 'light',
};

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadPreferences = async () => {
    if (!profile?.id) {
      setPreferences(defaultPreferences);
      setIsLoaded(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('timezone, currency, date_format, time_format, language, theme')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const newPrefs = {
          timezone: data.timezone || 'UTC',
          currency: data.currency || 'USD',
          date_format: data.date_format || 'MM/DD/YYYY',
          time_format: data.time_format || '12h',
          language: data.language || 'en',
          theme: data.theme || 'light',
        };
        setPreferences(newPrefs);
      } else {
        setPreferences(defaultPreferences);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setPreferences(defaultPreferences);
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      loadPreferences();
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!isLoaded) return;

    if (preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [preferences.theme, isLoaded]);

  const getCurrencySymbol = (): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      PKR: '₨',
      AED: 'د.إ',
      SAR: '﷼',
      INR: '₹',
      JPY: '¥',
      CNY: '¥',
      CAD: 'C$',
      AUD: 'A$',
    };
    return symbols[preferences.currency] || preferences.currency;
  };

  const formatCurrency = (amount: number): string => {
    const symbol = getCurrencySymbol();

    try {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: preferences.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);

      return formatted;
    } catch (error) {
      return `${symbol}${amount.toLocaleString()}`;
    }
  };

  const convertToTimezone = (date: string | Date): Date => {
    const d = typeof date === 'string' ? new Date(date) : date;

    try {
      const utcDate = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate = new Date(d.toLocaleString('en-US', { timeZone: preferences.timezone }));
      const offset = tzDate.getTime() - utcDate.getTime();
      return new Date(d.getTime() + offset);
    } catch (error) {
      return d;
    }
  };

  const formatDate = (date: string | Date): string => {
    const d = convertToTimezone(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    switch (preferences.date_format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'MM/DD/YYYY':
      default:
        return `${month}/${day}/${year}`;
    }
  };

  const formatTime = (date: string | Date): string => {
    const d = convertToTimezone(date);

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');

    if (preferences.time_format === '12h') {
      const period = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${period}`;
    } else {
      return `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  };

  const formatDateTime = (date: string | Date): string => {
    return `${formatDate(date)} ${formatTime(date)}`;
  };

  const refreshPreferences = async () => {
    await loadPreferences();
  };

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        formatCurrency,
        formatDate,
        formatTime,
        formatDateTime,
        getCurrencySymbol,
        refreshPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
