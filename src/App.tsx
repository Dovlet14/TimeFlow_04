/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Clock, Trash2, Edit2, CheckCircle, Circle, 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Search, Filter, Sun, Moon, PieChart, Sparkles, X, RotateCcw,
  Zap, Play, Pause, Square, ExternalLink, GripVertical,
  ClipboardCheck, CalendarDays, BarChart3, Settings as SettingsIcon,
  Bell, Info, Shield, HelpCircle, Volume2, VolumeX, Upload, Download, Music, Volume1, FileAudio, Palette, Tag,
  BookOpen, Dumbbell, Coffee, Briefcase, Heart, Code, ShoppingBag, Award
} from 'lucide-react';
import { ScheduleTask, Category, GlobalSettings, TaskNotificationSettings, EventNotificationConfig, SoundMode } from './types';
import { playSoundConfig, stopActiveSound, setPlaybackStateListener } from './lib/audioManager';
import { getCustomSound, saveCustomSound, deleteCustomSound, listAllCustomSounds, getSoundAudioUrl, CustomSoundMetadata } from './lib/audioDb';
import { STORAGE_KEY, QUICK_TEMPLATES } from './constants';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, BarChart as ReBarChart, Bar as ReBar, XAxis as ReXAxis, YAxis as ReYAxis } from 'recharts';
import { GoogleGenAI } from "@google/genai";
import confetti from 'canvas-confetti';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { requestNotificationPermission, scheduleTaskNotifications, testNotification, showSystemNotification, getDuration } from './lib/notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

const getGenAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key === 'undefined' || key === '') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (e) {
    console.error("GoogleGenAI init failed:", e);
    return null;
  }
};

const genAI = getGenAI();

export const CATEGORY_ICONS_CATALOG = [
  { name: 'book', label: 'Учёба', icon: BookOpen },
  { name: 'dumbbell', label: 'Спорт', icon: Dumbbell },
  { name: 'coffee', label: 'Отдых', icon: Coffee },
  { name: 'briefcase', label: 'Работа', icon: Briefcase },
  { name: 'heart', label: 'Здоровье', icon: Heart },
  { name: 'code', label: 'Разработка', icon: Code },
  { name: 'shopping', label: 'Покупки', icon: ShoppingBag },
  { name: 'award', label: 'Достижения', icon: Award },
  { name: 'sparkles', label: 'Идея', icon: Sparkles },
  { name: 'plus', label: 'Другое', icon: Plus },
];

export const getCategoryIcon = (iconName: string) => {
  const found = CATEGORY_ICONS_CATALOG.find(x => x.name === iconName);
  return found ? found.icon : Plus;
};

export const THEME_STYLES = {
  indigo: {
    primary: 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700',
    primaryRaw: 'indigo-600',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-600 dark:border-indigo-400 focus:border-indigo-500',
    accent: 'accent-indigo-600',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-600 dark:ring-indigo-400',
    shadow: 'shadow-indigo-500/20',
    lightBg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300',
    tabActive: 'text-indigo-600 dark:text-indigo-400',
    barFill: '#6366f1'
  },
  emerald: {
    primary: 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700',
    primaryRaw: 'emerald-600',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-600 dark:border-emerald-400 focus:border-emerald-500',
    accent: 'accent-emerald-600',
    accentText: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-600 dark:ring-emerald-400',
    shadow: 'shadow-emerald-500/20',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
    tabActive: 'text-emerald-600 dark:text-emerald-400',
    barFill: '#10b981'
  },
  amber: {
    primary: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700',
    primaryRaw: 'amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500 dark:border-amber-400 focus:border-amber-500',
    accent: 'accent-amber-500',
    accentText: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500 dark:ring-amber-400',
    shadow: 'shadow-amber-500/20',
    lightBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    tabActive: 'text-amber-500 dark:text-amber-400',
    barFill: '#f59e0b'
  },
  rose: {
    primary: 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-700',
    primaryRaw: 'rose-600',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500 dark:border-rose-400 focus:border-rose-500',
    accent: 'accent-rose-600',
    accentText: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-600 dark:ring-rose-400',
    shadow: 'shadow-rose-500/20',
    lightBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
    tabActive: 'text-rose-600 dark:text-rose-400',
    barFill: '#f43f5e'
  },
  slate: {
    primary: 'bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600',
    primaryRaw: 'zinc-800',
    text: 'text-zinc-800 dark:text-zinc-300',
    border: 'border-zinc-800 dark:border-zinc-500 focus:border-zinc-700',
    accent: 'accent-zinc-800',
    accentText: 'text-zinc-800 dark:text-zinc-300',
    ring: 'ring-zinc-800 dark:ring-zinc-500',
    shadow: 'shadow-zinc-500/20',
    lightBg: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200',
    tabActive: 'text-zinc-900 dark:text-zinc-300',
    barFill: '#3f3f46'
  },
  cyberpunk: {
    primary: 'bg-fuchsia-600 hover:bg-fuchsia-700 dark:bg-fuchsia-600 dark:hover:bg-fuchsia-700',
    primaryRaw: 'fuchsia-600',
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    border: 'border-fuchsia-600 dark:border-fuchsia-400 focus:border-fuchsia-500',
    accent: 'accent-fuchsia-600',
    accentText: 'text-fuchsia-600 dark:text-fuchsia-400',
    ring: 'ring-fuchsia-600 dark:ring-fuchsia-400',
    shadow: 'shadow-fuchsia-500/20',
    lightBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300',
    tabActive: 'text-fuchsia-600 dark:text-fuchsia-400',
    barFill: '#d946ef'
  }
};

const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseISOToDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

interface UINotification {
  id: string;
  title: string;
  body: string;
  type: 'start' | 'end' | 'reminder';
  timestamp: number;
}

export default function App() {
  const [tasks, setTasks] = useState<ScheduleTask[]>(() => {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    if (savedTasks) {
      try {
        const parsed: ScheduleTask[] = JSON.parse(savedTasks);
        // Migration: Add current date to tasks that don't have it
        const today = getLocalDateString();
        return parsed.map(t => ({
          ...t,
          date: t.date || today,
          createdAt: t.createdAt || Date.now(),
          notifications: t.notifications || {
            enabled: true,
            onStart: true,
            onEnd: true,
            reminderMinutes: 5,
            soundEnabled: true,
            soundName: 'default',
            vibrate: true,
            volume: 1
          }
        }));
      } catch (e) {
        console.error("Failed to parse tasks", e);
      }
    }
    return [];
  });
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
    const DEFAULT_EVENT_CONFIG = (customSoundId: string): EventNotificationConfig => ({
      soundMode: 'default',
      volume: 0.8,
      loop: false,
      fadeIn: false,
      durationLimit: 10,
      customSoundId
    });
    const defaultSettings: GlobalSettings = {
      allNotificationsEnabled: true,
      globalVolume: 0.7,
      defaultSound: 'default',
      theme: 'indigo',
      configs: {
        start: DEFAULT_EVENT_CONFIG('start'),
        end: DEFAULT_EVENT_CONFIG('end'),
        reminder: DEFAULT_EVENT_CONFIG('reminder'),
        pomodoro: DEFAULT_EVENT_CONFIG('pomodoro')
      }
    };

    const savedSettings = localStorage.getItem(STORAGE_KEY + '_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return {
          allNotificationsEnabled: parsed.allNotificationsEnabled !== undefined ? parsed.allNotificationsEnabled : true,
          globalVolume: parsed.globalVolume !== undefined ? parsed.globalVolume : 0.7,
          defaultSound: parsed.defaultSound || 'default',
          theme: parsed.theme || 'indigo',
          customCategories: parsed.customCategories || undefined,
          configs: {
            start: { ...DEFAULT_EVENT_CONFIG('start'), ...(parsed?.configs?.start || {}) },
            end: { ...DEFAULT_EVENT_CONFIG('end'), ...(parsed?.configs?.end || {}) },
            reminder: { ...DEFAULT_EVENT_CONFIG('reminder'), ...(parsed?.configs?.reminder || {}) },
            pomodoro: { ...DEFAULT_EVENT_CONFIG('pomodoro'), ...(parsed?.configs?.pomodoro || {}) }
          }
        };
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    return defaultSettings;
  });

  const categoriesList = useMemo(() => {
    const defaults = [
      { value: 'study', label: 'Учёба', color: 'bg-blue-500', iconName: 'book' },
      { value: 'sport', label: 'Спорт', color: 'bg-emerald-500', iconName: 'dumbbell' },
      { value: 'rest', label: 'Отдых', color: 'bg-amber-500', iconName: 'coffee' },
      { value: 'work', label: 'Работа', color: 'bg-indigo-500', iconName: 'briefcase' },
      { value: 'other', label: 'Другое', color: 'bg-gray-500', iconName: 'plus' },
    ];
    const custom = globalSettings.customCategories || [];
    return [...defaults, ...custom];
  }, [globalSettings.customCategories]);

  const activeTheme = globalSettings.theme || 'indigo';
  const st = THEME_STYLES[activeTheme] || THEME_STYLES.indigo;
  const [activeNotification, setActiveNotification] = useState<UINotification | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'scheduled' | 'failed' | 'success'>('idle');
  const [testCountdown, setTestCountdown] = useState(0);

  useEffect(() => {
    (window as any)._onTestNotificationReceived = () => {
      setTestStatus('success');
    };
    return () => {
      delete (window as any)._onTestNotificationReceived;
    };
  }, []);

  const handleTestNotification = async () => {
    setTestStatus('scheduled');
    setTestCountdown(5);
    
    const intervalObj = setInterval(() => {
      setTestCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalObj);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const result = await testNotification();
    if (result && result.success) {
      console.log('Test notification processed successfully on platform:', result.platform);
      
      if (result.platform === 'web') {
        setTimeout(() => {
          setTestStatus(prev => prev === 'scheduled' ? 'success' : prev);
        }, 5500);
      }
    } else {
      setTestStatus('failed');
      clearInterval(intervalObj);
      setTestCountdown(0);
    }
  };

  const [completedRecurringTasks, setCompletedRecurringTasks] = useState<Record<string, string[]>>(() => {
    const savedRecurringCompletions = localStorage.getItem(STORAGE_KEY + '_recurring');
    if (savedRecurringCompletions) {
      try {
        return JSON.parse(savedRecurringCompletions);
      } catch (e) {
        console.error("Failed to parse recurring completions", e);
      }
    }
    return {};
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTask | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState(() => getLocalDateString());
  
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  const [customSoundsList, setCustomSoundsList] = useState<CustomSoundMetadata[]>([]);
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);

  const refreshCustomSounds = async () => {
    try {
      const list = await listAllCustomSounds();
      setCustomSoundsList(list);
    } catch (e) {
      console.error("Failed to load custom sounds from database:", e);
    }
  };

  useEffect(() => {
    refreshCustomSounds();
    setPlaybackStateListener((playing) => {
      setIsSoundPlaying(playing);
    });
  }, []);
  
  const [activeSoundTab, setActiveSoundTab] = useState<'start' | 'end' | 'reminder' | 'pomodoro'>('start');

  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState("bg-purple-500 hover:bg-purple-600");
  const [newCatIcon, setNewCatIcon] = useState("plus");

  const exportBackupData = () => {
    try {
      const backupObj = {
        tasks,
        completedRecurringTasks,
        globalSettings,
        backupVersion: "1.2.0",
        timestamp: new Date().toISOString()
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `TimeFlow_Backup_${getLocalDateString()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Backup export failed", e);
      alert("Не удалось загрузить резервную копию");
    }
  };

  const importBackupData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.tasks)) {
          setTasks(parsed.tasks);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.tasks));

          if (parsed.completedRecurringTasks) {
            setCompletedRecurringTasks(parsed.completedRecurringTasks);
            localStorage.setItem(STORAGE_KEY + '_recurring', JSON.stringify(parsed.completedRecurringTasks));
          }

          if (parsed.globalSettings) {
            setGlobalSettings(parsed.globalSettings);
            localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(parsed.globalSettings));
          }

          alert("Резервная копия успешно восстановлена! 🎉");
          window.location.reload();
        } else {
          alert("Неверный формат резервной копии");
        }
      } catch (err) {
        console.error("Backup restore failed", err);
        alert("Ошибка при парсинге резервной копии. Проверьте правильность файла JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>, eventType: 'start' | 'end' | 'reminder' | 'pomodoro') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 15MB to prevent memory issues)
    if (file.size > 15 * 1024 * 1024) {
      alert("Размер аудиофайла не должен превышать 15 МБ.");
      return;
    }

    // Validate extension
    const allowedExtensions = ['mp3', 'wav', 'ogg', 'm4a'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(ext) && !file.type.startsWith('audio/')) {
      alert("Неподдерживаемый формат аудио. Пожалуйста, используйте MP3, WAV, OGG или M4A.");
      return;
    }

    try {
      const customId = `custom_${eventType}`;
      // Save in offline IndexedDB
      await saveCustomSound(customId, file.name, file.type, file);
      
      // Update global config setting
      setGlobalSettings(prev => {
        const updated = {
          ...prev,
          configs: {
            ...prev.configs,
            [eventType]: {
              ...prev.configs[eventType],
              soundMode: 'custom' as any,
              customSoundId: customId
            }
          }
        };
        localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(updated));
        return updated;
      });

      await refreshCustomSounds();
    } catch (err) {
      console.error("Failed to store custom audio track:", err);
      alert("Не удалось сохранить аудиофайл. Проверьте объем свободной памяти.");
    }
  };

  const handleDeleteCustomSound = async (eventType: 'start' | 'end' | 'reminder' | 'pomodoro') => {
    try {
      const customId = `custom_${eventType}`;
      await deleteCustomSound(customId);
      
      setGlobalSettings(prev => {
        const updated = {
          ...prev,
          configs: {
            ...prev.configs,
            [eventType]: {
              ...prev.configs[eventType],
              soundMode: 'default' as any,
              customSoundId: ''
            }
          }
        };
        localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(updated));
        return updated;
      });

      await refreshCustomSounds();
    } catch (err) {
      console.error("Failed to drop uploaded melody:", err);
    }
  };
  
  // Track notified tasks to avoid duplicates
  const notifiedIds = React.useRef<Set<string>>(new Set());
  const [pomodoroTime, setPomodoroTime] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'break'>('work');
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  
  // AI State
  const [aiQuote, setAiQuote] = useState<string>('');
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState<'today' | 'calendar' | 'stats' | 'settings'>('today');

  // Online Status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [viewMonth, setViewMonth] = useState(new Date());

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // Adjust for Monday start (0=Sunday -> 0=Monday)
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const days = [];
    
    // Padding for previous month
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({ day: null, fullDate: null });
    }
    
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const fullDate = getLocalDateString(date);
      days.push({ day: i, fullDate });
    }
    
    return days;
  }, [viewMonth]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(viewMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setViewMonth(newDate);
  };

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'study' as Category,
    description: '',
    isRecurring: false,
    recurringDays: [0, 1, 2, 3, 4, 5, 6], // Default all days
    date: getLocalDateString(),
    notifications: {
      enabled: true,
      onStart: true,
      onEnd: true,
      reminderMinutes: 5,
      soundEnabled: true,
      soundName: 'default',
      vibrate: true,
      volume: 1
    } as TaskNotificationSettings
  });

  // Request Notification permission (Browser + Capacitor)
  useEffect(() => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(e => console.warn('Browser permission request failed:', e));
      }
    } catch (e) {
      console.warn('Notification API not accessible:', e);
    }
    requestNotificationPermission().then(granted => {
      if (granted) {
        LocalNotifications.addListener('localNotificationReceived', (notification) => {
          console.log('Notification received in foreground:', notification);
          
          const title = notification.title || '';
          const body = notification.body || '';
          
          let type: 'start' | 'end' | 'reminder' = 'reminder';
          if (title.toLowerCase().includes('начало')) {
            type = 'start';
          } else if (title.toLowerCase().includes('завершение') || title.toLowerCase().includes('конец')) {
            type = 'end';
          }
          
          setActiveNotification({
            id: String(notification.id || Date.now()),
            title,
            body,
            type,
            timestamp: Date.now()
          });

          if (notification.id === 12345 || title.includes('Проверка')) {
            try {
              if ((window as any)._onTestNotificationReceived) {
                (window as any)._onTestNotificationReceived();
              }
            } catch (err) {
              console.warn(err);
            }
          }

          // Perform physical device feedback if available
          try {
            if (navigator.vibrate) {
              navigator.vibrate([150, 80, 150]);
            }
          } catch (e) {
            console.warn('Haptic vibration failed on this platform:', e);
          }
        });
        
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          console.log('Notification action performed:', action);
        });
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    // Schedule Capacitor notifications whenever tasks change (debounced)
    const timer = setTimeout(() => {
      scheduleTaskNotifications(tasks);
    }, 2000);
    return () => clearTimeout(timer);
  }, [tasks]);

  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_recurring', JSON.stringify(completedRecurringTasks));
  }, [completedRecurringTasks]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(globalSettings));
  }, [globalSettings]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Pomodoro Logic
  const playNotificationSound = (soundName: string = 'default', volume: number = 1) => {
    if (!globalSettings.allNotificationsEnabled) return;
    
    // Construct temporary EventNotificationConfig on the fly
    const tempConfig: EventNotificationConfig = {
      soundMode: soundName.startsWith('custom_') ? 'custom' : (soundName as any),
      volume: volume,
      loop: false,
      fadeIn: false,
      durationLimit: 10,
      customSoundId: soundName
    };
    
    playSoundConfig(tempConfig, globalSettings.globalVolume);

    // Vibrate if supported
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Notification Engine
  useEffect(() => {
    const checkNotifications = () => {
      if (!globalSettings.allNotificationsEnabled) return;

      const now = new Date();
      const currentFullDate = getLocalDateString(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      tasks.forEach(task => {
        if (!isTaskVisibleOnDate(task, currentFullDate) || !task.notifications?.enabled) return;

        const { startTime, endTime, id, notifications } = task;
        
        // Helper to check if it's time for a reminder
        const checkReminder = (time: string, offsetMin: number, label: string) => {
          const [h, m] = time.split(':').map(Number);
          
          // Calculate target minutes from midnight (handle wrap around elegantly)
          const targetMinutes = (h * 60 + m - offsetMin + 1440) % 1440;
          
          const uniqueId = `${id}-${label}-${currentFullDate}-${targetMinutes}`;
          
          if (currentMinutes === targetMinutes && !notifiedIds.current.has(uniqueId)) {
            notifiedIds.current.add(uniqueId);
            
            if (notifications.soundEnabled) {
              // Priority 1: Check if the task has a specific customized sound assigned
              if (notifications.soundName && notifications.soundName.startsWith('custom_')) {
                const soundId = notifications.soundName;
                playSoundConfig({
                  soundMode: 'custom',
                  volume: notifications.volume,
                  loop: false,
                  fadeIn: false,
                  durationLimit: 15,
                  customSoundId: soundId
                }, globalSettings.globalVolume);
              } else {
                // Priority 2: Route to specialized event configuration profiles (Start, End, Reminder)
                let eventConfig: EventNotificationConfig | undefined = undefined;
                if (label.includes('начинается') || label.includes('началось') || label.includes('Старт')) {
                  eventConfig = globalSettings.configs.start;
                } else if (label.includes('окончено') || label.includes('Конец')) {
                  eventConfig = globalSettings.configs.end;
                } else {
                  eventConfig = globalSettings.configs.reminder;
                }

                if (eventConfig) {
                  playSoundConfig(eventConfig, globalSettings.globalVolume);
                } else {
                  playNotificationSound(notifications.soundName, notifications.volume);
                }
              }
            }

            // Show UI notification
            setActiveNotification({
              id: uniqueId,
              title: task.title,
              body: label,
              type: label.includes('начинается') ? 'start' : label.includes('окончено') ? 'end' : 'reminder',
              timestamp: Date.now()
            });

            // Universal high-compatibility notification call
            showSystemNotification(task.title, label);
          }
        };

        const durationStr = getDuration(startTime, endTime);

        if (notifications.onStart) checkReminder(startTime, 0, `Занятие начинается! Длительность: ${durationStr}`);
        if (notifications.onEnd) checkReminder(endTime, 0, `Занятие окончено! Длительность выполнения: ${durationStr}`);
        if (notifications.reminderMinutes > 0) {
          checkReminder(startTime, notifications.reminderMinutes, `Начнется через ${notifications.reminderMinutes} мин. Длительность: ${durationStr}`);
        }
      });

      // Periodic cleanup of notifiedIds to prevent memory leak (keep last 1000)
      if (notifiedIds.current.size > 1000) {
        const arr = Array.from(notifiedIds.current);
        notifiedIds.current = new Set(arr.slice(-500));
      }
    };

    const timer = setInterval(checkNotifications, 10000); // Check every 10 seconds
    return () => clearInterval(timer);
  }, [tasks, globalSettings]);

  const playAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      // Создаем двухтональный сигнал для привлечения внимания
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 1.0);
    } catch (e) {
      console.error("Audio API not supported or blocked", e);
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isPomodoroRunning && pomodoroTime > 0) {
      interval = setInterval(() => setPomodoroTime(t => t - 1), 1000);
    } else if (pomodoroTime === 0) {
      setIsPomodoroRunning(false);
      
      if (globalSettings.configs?.pomodoro) {
        playSoundConfig(globalSettings.configs.pomodoro, globalSettings.globalVolume);
      } else {
        playAlarm();
      }
      
      showSystemNotification(
        pomodoroMode === 'work' ? "Пора отдохнуть! ☕" : "Время работать! 🎯",
        pomodoroMode === 'work' ? "Ваш рабочий сеанс завершен." : "Пора приступать к задачам."
      );
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
    return () => clearInterval(interval);
  }, [isPomodoroRunning, pomodoroTime, pomodoroMode]);

  const togglePomodoro = () => setIsPomodoroRunning(!isPomodoroRunning);
  const resetPomodoro = (mode: 'work' | 'break' = 'work') => {
    setIsPomodoroRunning(false);
    setPomodoroMode(mode);
    setPomodoroTime(mode === 'work' ? 25 * 60 : 5 * 60);
  };

  const formatPomodoroTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isTaskCompletedOnDate = (task: ScheduleTask, date: string) => {
    if (task.isRecurring) {
      return (completedRecurringTasks[date] || []).includes(task.id);
    }
    return task.isCompleted;
  };

  const isTaskVisibleOnDate = (task: ScheduleTask, dateStr: string) => {
    if (!task.isRecurring) return task.date === dateStr;
    
    // Don't show recurring tasks before their starting date
    if (dateStr < task.date) return false;

    if (!task.recurringDays || task.recurringDays.length === 0) return true; // Legacy daily
    
    const date = parseISOToDate(dateStr);
    const dayOfWeek = date.getDay(); // 0 is Sunday
    return task.recurringDays.includes(dayOfWeek);
  };

  const productivityScore = useMemo(() => {
    const dayTasks = tasks.filter(t => isTaskVisibleOnDate(t, selectedDate));
    if (dayTasks.length === 0) return 0;
    const completed = dayTasks.filter(t => isTaskCompletedOnDate(t, selectedDate)).length;
    return Math.round((completed / dayTasks.length) * 100);
  }, [tasks, selectedDate, completedRecurringTasks]);

  // AI Quote Generation
  const generateAiQuote = async () => {
    if (!genAI || isGeneratingQuote) return;

    const offlineQuotes = [
      "Дисциплина — это мост между целями и достижениями.",
      "Твой единственный предел — это ты сам.",
      "Маленькие шаги каждый день ведут к большим результатам.",
      "Начинай там, где ты есть. Используй то, что у тебя есть.",
      "Успех — это сумма малых усилий, повторяемых изо дня в день.",
      "Не останавливайся, пока не будешь гордиться собой.",
      "Твое будущее создается тем, что ты делаешь сегодня.",
      "Будь сильнее своих оправданий.",
      "Твоя энергия — твой самый ценный ресурс."
    ];

    if (!navigator.onLine) {
      setAiQuote(offlineQuotes[Math.floor(Math.random() * offlineQuotes.length)]);
      return;
    }

    setIsGeneratingQuote(true);
    const dayTasks = tasks.filter(t => isTaskVisibleOnDate(t, selectedDate));
    try {
      const response = await (genAI as any).models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: `Дай очень короткую (max 10 слов) мотивирующую цитату на русском языке для человека, у которого запланировано ${dayTasks.length} задач на сегодня. Темы: ${dayTasks.map(t => t.category).join(', ')}. Без кавычек, только текст.` }] }]
      });
      setAiQuote(response.text || offlineQuotes[0]);
    } catch (e) {
      setAiQuote(offlineQuotes[Math.floor(Math.random() * offlineQuotes.length)]);
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  useEffect(() => {
    if (tasks.length > 0) {
      generateAiQuote();
    }
  }, [tasks.length, selectedDate]);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => isTaskVisibleOnDate(t, selectedDate))
      .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .filter(t => filterCategory === 'all' ? true : t.category === filterCategory);
  }, [tasks, searchQuery, filterCategory, selectedDate]);

  const handleAddTask = (initialDate: string = getLocalDateString()) => {
    setEditingTask(null);
    setFormData({
      title: '',
      startTime: '09:00',
      endTime: '10:00',
      category: 'study',
      description: '',
      isRecurring: false,
      recurringDays: [0, 1, 2, 3, 4, 5, 6],
      date: initialDate,
      notifications: {
        enabled: true,
        onStart: true,
        onEnd: true,
        reminderMinutes: 5,
        soundEnabled: true,
        soundName: 'default',
        vibrate: true,
        volume: 1
      }
    });
    setIsModalOpen(true);
  };

  const handleEditTask = (task: ScheduleTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask(task);
    setFormData({
      title: task.title,
      startTime: task.startTime,
      endTime: task.endTime,
      category: task.category,
      description: task.description || '',
      isRecurring: task.isRecurring || false,
      recurringDays: task.recurringDays || [0, 1, 2, 3, 4, 5, 6],
      date: task.date,
      notifications: task.notifications || {
        enabled: true,
        onStart: true,
        onEnd: false,
        reminderMinutes: 5,
        soundEnabled: true,
        soundName: 'default',
        vibrate: true,
        volume: 1
      }
    });
    setIsModalOpen(true);
  };

  const handleDeleteTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleComplete = (id: string, e: React.MouseEvent, targetDate: string = selectedDate) => {
    e.stopPropagation();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.isRecurring) {
      setCompletedRecurringTasks(prev => {
        const dateCompletions = prev[targetDate] || [];
        const isCurrentlyCompleted = dateCompletions.includes(id);
        
        if (!isCurrentlyCompleted) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#6366f1', '#10b981', '#f59e0b']
          });
          return { ...prev, [targetDate]: [...dateCompletions, id] };
        } else {
          return { ...prev, [targetDate]: dateCompletions.filter(tid => tid !== id) };
        }
      });
    } else {
      setTasks(prev => prev.map(t => {
        if (t.id === id && !t.isCompleted) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.8 },
            colors: ['#6366f1', '#10b981', '#f59e0b']
          });
        }
        return t.id === id ? { ...t, isCompleted: !t.isCompleted } : t;
      }));
    }
  };

  const handleApplyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    const now = new Date();
    const start = formatTimeStr(now);
    const end = formatTimeStr(new Date(now.getTime() + template.durationMin * 60000));
    
    const newTask: ScheduleTask = {
      id: Math.random().toString(36).substring(2, 11),
      title: template.title,
      date: getLocalDateString(),
      startTime: start,
      endTime: end,
      category: template.category,
      isCompleted: false,
      isRecurring: false,
      createdAt: Date.now(),
    };
    setTasks(prev => [...prev, newTask]);
  };

  const handleApplyUserRoutine = () => {
    const routine: Partial<ScheduleTask>[] = [
      { title: 'Подъём', startTime: '07:30', endTime: '07:30', category: 'rest', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Умыться', startTime: '07:30', endTime: '07:45', category: 'other', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Тренировка', startTime: '07:45', endTime: '08:30', category: 'sport', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Душ + завтрак', startTime: '08:30', endTime: '09:00', category: 'rest', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Программирование (Фокус)', startTime: '09:00', endTime: '11:00', category: 'study', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Помощь по дому / Уборка', startTime: '11:00', endTime: '12:00', category: 'work', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Еда + сборы', startTime: '12:00', endTime: '13:00', category: 'rest', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Школа', startTime: '13:30', endTime: '17:40', category: 'work', recurringDays: [1, 2, 3, 4, 5, 6] }, // Mon-Sat
      { title: 'Домой + еда + животные', startTime: '18:00', endTime: '19:15', category: 'other', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Программирование (Практика)', startTime: '19:15', endTime: '21:00', category: 'study', recurringDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Отдых', startTime: '21:00', endTime: '22:00', category: 'rest', recurringDays: [0, 1, 2, 3, 4, 5, 6] },
      { title: 'Сон', startTime: '22:30', endTime: '23:59', category: 'rest', recurringDays: [0, 1, 2, 3, 4, 5, 6] },
    ];

    const newTasks: ScheduleTask[] = routine.map(item => ({
      id: Math.random().toString(36).substring(2, 11),
      title: item.title!,
      date: getLocalDateString(),
      startTime: item.startTime!,
      endTime: item.endTime!,
      category: item.category as Category,
      isCompleted: false,
      isRecurring: true,
      recurringDays: item.recurringDays,
      createdAt: Date.now(),
    }));

    setTasks(prev => {
      // Filter out existing similar recurring tasks to avoid duplicates if applied twice
      const existingTitles = prev.filter(t => t.isRecurring).map(t => t.title);
      const uniqueNew = newTasks.filter(t => !existingTitles.includes(t.title));
      return [...prev, ...uniqueNew];
    });
    
    alert("Ваш распорядок добавлен как ежедневный!");
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;

    const sourceTask = filteredTasks[source.index] as any;
    const destTask = filteredTasks[destination.index] as any;
    if (!sourceTask || !destTask) return;

    const items = Array.from(tasks) as any[];
    const sourceIdx = items.findIndex((t: any) => t.id === sourceTask.id);
    if (sourceIdx === -1) return;
    
    const [reorderedItem] = items.splice(sourceIdx, 1);
    
    let destIdx = items.findIndex((t: any) => t.id === destTask.id);
    if (destIdx === -1) return;
    
    if (source.index < destination.index) {
      destIdx += 1;
    }
    
    items.splice(destIdx, 0, reorderedItem);
    setTasks(items);
  };

  const handleClearCompleted = () => {
    if (confirm('Очистить все выполненные задачи?')) {
      setTasks(prev => prev.filter(t => !t.isCompleted));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const newTask: ScheduleTask = {
      id: editingTask ? editingTask.id : Math.random().toString(36).substring(2, 11),
      title: formData.title,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      category: formData.category,
      description: formData.description,
      isCompleted: editingTask ? editingTask.isCompleted : false,
      isRecurring: formData.isRecurring,
      recurringDays: formData.recurringDays,
      notifications: formData.notifications,
      createdAt: editingTask ? editingTask.createdAt : Date.now()
    };

    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask.id ? newTask : t));
    } else {
      setTasks([...tasks, newTask]);
    }
    setIsModalOpen(false);
  };

  const formatTimeStr = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const isTaskActive = (task: ScheduleTask) => {
    const nowStr = formatTimeStr(currentTime);
    return nowStr >= task.startTime && nowStr <= task.endTime;
  };

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    const targetDate = activeTab === 'calendar' ? calendarSelectedDate : selectedDate;
    const dayTasks = tasks.filter(t => isTaskVisibleOnDate(t, targetDate));
    dayTasks.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return categoriesList.filter(c => counts[c.value]).map(c => ({
      name: c.label,
      value: counts[c.value],
      color: c.color.replace('bg-', '') // approximation
    }));
  }, [tasks, selectedDate, calendarSelectedDate, activeTab, categoriesList]);

  const streakStats = useMemo(() => {
    const completedDates = new Set<string>();
    
    // Regular completed tasks
    tasks.forEach(t => {
      if (t.isCompleted && t.date) {
        completedDates.add(t.date);
      }
    });

    // Completed recurring dates (keys are YYYY-MM-DD dates, values are arrays of task IDs)
    Object.entries(completedRecurringTasks).forEach(([date, taskIds]) => {
      if (Array.isArray(taskIds) && taskIds.length > 0) {
        completedDates.add(date);
      }
    });

    const datesArray = Array.from(completedDates).sort();
    if (datesArray.length === 0) {
      return { currentStreak: 0, maxStreak: 0, totalCompleted: 0 };
    }

    let currentStreak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    const todayStr = getLocalDateString();
    const dateCheck = parseISOToDate(todayStr);
    let checkStr = getLocalDateString(dateCheck);
    
    if (completedDates.has(checkStr)) {
      currentStreak = 1;
      while (true) {
        dateCheck.setDate(dateCheck.getDate() - 1);
        const prevStr = getLocalDateString(dateCheck);
        if (completedDates.has(prevStr)) {
          currentStreak++;
        } else {
          break;
        }
      }
    } else {
      dateCheck.setDate(dateCheck.getDate() - 1);
      const yesterdayStr = getLocalDateString(dateCheck);
      if (completedDates.has(yesterdayStr)) {
        currentStreak = 1;
        while (true) {
          dateCheck.setDate(dateCheck.getDate() - 1);
          const prevStr = getLocalDateString(dateCheck);
          if (completedDates.has(prevStr)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    let prevDateObj: Date | null = null;
    for (const dStr of datesArray) {
      const currentDateObj = parseISOToDate(dStr);
      if (!prevDateObj) {
        tempStreak = 1;
      } else {
        const diffTime = Math.abs(currentDateObj.getTime() - prevDateObj.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) {
          tempStreak++;
        } else {
          if (tempStreak > maxStreak) maxStreak = tempStreak;
          tempStreak = 1;
        }
      }
      prevDateObj = currentDateObj;
    }
    if (tempStreak > maxStreak) maxStreak = tempStreak;

    const totalCompleted = tasks.filter(t => t.isCompleted).length + 
      Object.values(completedRecurringTasks).reduce((sum, list) => sum + ((list as any)?.length || 0), 0);

    return {
      currentStreak,
      maxStreak: Math.max(maxStreak, currentStreak),
      totalCompleted
    };
  }, [tasks, completedRecurringTasks]);

  const last7DaysChartData = useMemo(() => {
    const data = [];
    const daysName = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = getLocalDateString(d);
      
      const regCount = tasks.filter(t => t.isCompleted && t.date === dStr).length;
      let recCount = 0;
      Object.values(completedRecurringTasks).forEach(dates => {
        if (Array.isArray(dates) && dates.includes(dStr)) {
           recCount++;
        }
      });
      
      data.push({
        name: daysName[d.getDay()],
        date: dStr,
        tasks: regCount + recCount
      });
    }
    return data;
  }, [tasks, completedRecurringTasks]);

  const activeTask = tasks.find(t => isTaskVisibleOnDate(t, selectedDate) && isTaskActive(t));

  const weekDays = useMemo(() => {
    const days = [];
    const baseDate = new Date(selectedDate);
    for (let i = -7; i < 14; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      const full = getLocalDateString(date);
      const isToday = full === getLocalDateString();
      days.push({
        full,
        day: date.toLocaleDateString('ru-RU', { day: 'numeric' }),
        weekday: date.toLocaleDateString('ru-RU', { weekday: 'short' }),
        isToday
      });
    }
    return days;
  }, [selectedDate]);

  const changeDate = (offset: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + offset);
    setSelectedDate(getLocalDateString(date));
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 sm:pb-8 transition-colors duration-300">
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-4 right-4 z-[999] sm:left-auto sm:right-6 sm:top-6 sm:bottom-auto sm:w-80"
            onClick={() => setActiveNotification(null)}
          >
            <div className={`p-4 rounded-[2rem] shadow-2xl border flex items-center gap-4 ${
              activeNotification.type === 'start' 
                ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-500/30' 
                : activeNotification.type === 'end'
                  ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-500/30'
                  : 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-500/30'
            }`}>
              <div className={`p-3 rounded-2xl shrink-0 ${
                activeNotification.type === 'start' ? 'bg-emerald-500' : 
                activeNotification.type === 'end' ? 'bg-amber-500' : 'bg-indigo-500'
              } text-white shadow-lg`}>
                {activeNotification.type === 'start' ? <Play size={20} /> : 
                 activeNotification.type === 'end' ? <Clock size={20} /> : <Sparkles size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">
                  {activeNotification.type === 'start' ? 'Начало' : 
                   activeNotification.type === 'end' ? 'Завершение' : 'Напоминание'}
                </p>
                <h4 className="font-bold text-zinc-900 dark:text-white truncate">{activeNotification.title}</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-1.5">{activeNotification.body}</p>
                {isSoundPlaying && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); stopActiveSound(); }}
                    className="p-1 px-2 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <VolumeX size={10} />
                    <span>Stop Music</span>
                  </button>
                )}
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setActiveNotification(null); }}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSoundPlaying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="fixed bottom-24 right-4 z-[1000] p-3 pl-4 bg-zinc-900/95 border border-red-500/20 backdrop-blur-md rounded-[1.5rem] shadow-2xl flex items-center gap-4 text-white"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 font-black"></span>
              </span>
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Аудиосигнал</span>
            </div>
            <button
              onClick={() => stopActiveSound()}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Stop Music ⏹
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 py-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-xl shadow-sm dark:shadow-none shrink-0"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">Schedule Pro</h1>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium truncate">
                   {parseISOToDate(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:hidden">
              {!isOnline && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Offline</span>
                </div>
              )}
              <button 
                 onClick={() => setIsPomodoroOpen(true)}
                 className="p-2 sm:p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-2"
              >
                 <Clock size={20} />
              </button>
              <button 
                 onClick={toggleDarkMode}
                 className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
              >
                 {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'today'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <ClipboardCheck size={16} />
              <span>Сегодня</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'calendar'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <CalendarDays size={16} />
              <span>Календарь</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'stats'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <BarChart3 size={16} />
              <span>Статистика</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-white dark:bg-zinc-950 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <SettingsIcon size={16} />
              <span>Настройки</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
             <button 
                onClick={() => handleAddTask()}
                className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all flex items-center gap-1.5 ${st.primary} shadow-md ${st.shadow}`}
             >
                <Plus size={16} />
                <span>Добавить задачу</span>
             </button>
             {!isOnline && (
               <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-wider">Offline</span>
               </div>
             )}
             <button 
                onClick={() => setIsPomodoroOpen(true)}
                className="p-2 sm:p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-2"
             >
                <Clock size={20} />
                <span className="hidden sm:inline font-bold text-sm">Pomodoro</span>
             </button>
             <button 
                onClick={toggleDarkMode}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
             >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-28 md:pb-16">
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Productivity Score */}
              <div className="bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden relative group">
                <div className="absolute top-0 left-0 h-1 bg-zinc-100 dark:bg-zinc-800 w-full">
                  <motion.div 
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${productivityScore}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap size={16} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Продуктивность</span>
                    </div>
                    <h3 className="text-xl font-black text-zinc-900 dark:text-white">
                      Ваш счет: {productivityScore}%
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Выполнено задач</p>
                    <p className="text-lg font-black text-emerald-600">
                      {tasks.filter(t => isTaskVisibleOnDate(t, selectedDate) && isTaskCompletedOnDate(t, selectedDate)).length} / {tasks.filter(t => isTaskVisibleOnDate(t, selectedDate)).length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Templates */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Быстрые шаблоны</span>
                  <button 
                    onClick={handleApplyUserRoutine}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 hover:opacity-80 transition-opacity"
                  >
                    Загрузить мой распорядок
                  </button>
                </div>
                <div className="flex gap-2 shrink-0 overflow-x-auto pb-2 custom-scrollbar">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover:border-indigo-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-sm font-bold shadow-sm whitespace-nowrap active:scale-95"
                    >
                      <Plus size={16} className="text-indigo-500" />
                      <span className="dark:text-white">{tmpl.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Motivation & Current Task Banner */}
              {(aiQuote || activeTask) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiQuote && (
                    <div className="bg-indigo-600 p-4 rounded-[2rem] shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden group">
                      <Sparkles className="absolute -right-4 -top-4 text-indigo-400 opacity-20 w-24 h-24 rotate-12 transition-transform group-hover:scale-110" />
                      <div className="flex items-center gap-2 mb-2 relative">
                        <Sparkles size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">AI Мотивация</span>
                      </div>
                      <p className="text-sm sm:text-base font-medium leading-tight relative italic pr-8">
                        "{aiQuote}"
                      </p>
                      <button 
                        onClick={generateAiQuote}
                        className="absolute bottom-4 right-4 p-2 hover:bg-white/10 rounded-full transition-all"
                        disabled={isGeneratingQuote}
                      >
                        <RotateCcw size={14} className={isGeneratingQuote ? "animate-spin" : ""} />
                      </button>
                    </div>
                  )}
                  {activeTask && (
                    <div className="bg-zinc-900 dark:bg-zinc-100 p-4 rounded-[2rem] shadow-xl text-white dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Сейчас в расписании</span>
                      </div>
                      <h4 className="text-lg font-bold truncate">{activeTask.title}</h4>
                      <p className="text-xs opacity-70 font-medium">{activeTask.startTime} – {activeTask.endTime}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => handleAddTask()}
                  className={`px-6 py-3 sm:py-3.5 ${st.primary} text-white rounded-2xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 shadow-md ${st.shadow}`}
                >
                  <Plus size={18} />
                  <span>Добавить задачу</span>
                </button>
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={18} />
                  <input 
                    type="text"
                    placeholder="Поиск задач..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 sm:py-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium dark:text-white"
                  />
                </div>
                <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 custom-scrollbar">
                  <button 
                    onClick={() => setFilterCategory('all')}
                    className={`px-4 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border ${
                      filterCategory === 'all' 
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-lg border-transparent' 
                        : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    Все
                  </button>
                  {categoriesList.map(cat => (
                    <button 
                      key={cat.value}
                      onClick={() => setFilterCategory(cat.value)}
                      className={`px-4 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border ${
                        filterCategory === cat.value 
                          ? `${cat.color} text-white shadow-lg border-transparent` 
                          : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-white dark:bg-zinc-900 p-3 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center sm:items-start group transition-all hover:shadow-md">
                  <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Задач</p>
                  <p className="text-xl sm:text-3xl font-bold text-zinc-900 dark:text-white">{tasks.filter(t => isTaskVisibleOnDate(t, selectedDate)).length}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-3 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center sm:items-start group transition-all hover:shadow-md">
                  <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Готово</p>
                  <p className="text-xl sm:text-3xl font-bold text-emerald-600">{tasks.filter(t => isTaskVisibleOnDate(t, selectedDate) && isTaskCompletedOnDate(t, selectedDate)).length}</p>
                </div>
                <button 
                  onClick={handleClearCompleted}
                  disabled={tasks.filter(t => isTaskVisibleOnDate(t, selectedDate) && isTaskCompletedOnDate(t, selectedDate)).length === 0}
                  className="bg-zinc-100 dark:bg-zinc-800/50 p-3 sm:p-5 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center sm:items-start group transition-all hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                >
                  <p className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1 group-hover:text-red-500">Очистить</p>
                  <p className="text-xl sm:text-3xl font-bold text-zinc-500 dark:text-zinc-600 group-hover:text-red-600 transition-colors">
                    <RotateCcw size={22} className="sm:w-8 sm:h-8" />
                  </p>
                </button>
              </div>

              {/* Schedule List */}
              <div className="space-y-4">
                {filteredTasks.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-[3rem] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                    <CalendarIcon className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium px-6">
                      {searchQuery || filterCategory !== 'all' ? 'По результатам поиска ничего не найдено' : 'Ваше расписание пусто. Начните с добавления задачи!'}
                    </p>
                    {!searchQuery && filterCategory === 'all' && (
                      <button 
                        onClick={() => handleAddTask()}
                        className="mt-6 px-8 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full font-bold hover:scale-105 transition-all shadow-lg inline-flex items-center gap-2"
                      >
                        <Plus size={20} /> Добавить
                      </button>
                    )}
                  </div>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="tasks-list">
                      {(provided) => (
                        <div 
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-4 relative"
                        >
                          <AnimatePresence mode='popLayout'>
                            {filteredTasks.map((task, index) => {
                              const fallbackCategory = { value: 'other', label: 'Другое', color: 'bg-gray-500', iconName: 'plus' };
                              const category = categoriesList.find(c => c.value === task.category) || categoriesList[categoriesList.length - 1] || fallbackCategory;
                              const Icon = getCategoryIcon(category.iconName || 'plus');
                              const isActive = isTaskActive(task);

                              let progress = 0;
                              let remainingMinutes = 0;
                              if (isActive) {
                                const [startH, startM] = task.startTime.split(':').map(Number);
                                const [endH, endM] = task.endTime.split(':').map(Number);
                                const nowH = currentTime.getHours();
                                const nowM = currentTime.getMinutes();
                                const startTotal = startH * 60 + startM;
                                const endTotal = endH * 60 + endM;
                                const nowTotal = nowH * 60 + nowM;
                                progress = ((nowTotal - startTotal) / (endTotal - startTotal)) * 100;
                                remainingMinutes = endTotal - nowTotal;
                              }

                              // Grouping logic based on startTime
                              const getGroup = (timeStr: string) => {
                                const h = parseInt(timeStr.split(':')[0]);
                                if (h < 12) return { id: 0, name: "Утро", icon: <Sun size={14} className="text-amber-500" /> };
                                if (h < 18) return { id: 1, name: "День", icon: <Sparkles size={14} className="text-blue-500" /> };
                                return { id: 2, name: "Вечер", icon: <Moon size={14} className="text-indigo-500" /> };
                              };

                              const currentGroup = getGroup(task.startTime);
                              const prevTask = filteredTasks[index - 1];
                              const prevGroup = prevTask ? getGroup(prevTask.startTime) : null;
                              const isNewGroup = !prevGroup || currentGroup.id !== prevGroup.id;

                              const DraggableAny = Draggable as any;
                              return (
                                <motion.div 
                                  key={task.id} 
                                  layout
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.98 }}
                                  className="space-y-4"
                                >
                                  {isNewGroup && (
                                    <div className="flex items-center gap-2 pt-6 pb-2 px-2">
                                      {currentGroup.icon}
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">{currentGroup.name}</span>
                                      <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800 ml-4" />
                                    </div>
                                  )}
                                  <DraggableAny draggableId={task.id.toString()} index={index}>
                                    {(provided: any, snapshot: any) => (
                                      <motion.div
                                        layout
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`group relative bg-white dark:bg-zinc-900 p-4 sm:p-6 rounded-[2rem] border transition-all duration-300 ${
                                          snapshot.isDragging ? 'shadow-2xl z-50 ring-2 ring-indigo-500 scale-105' : 
                                          isActive 
                                            ? 'border-indigo-600 dark:border-indigo-500 shadow-2xl ring-2 ring-indigo-500/10' 
                                            : 'border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md'
                                        } ${task.isCompleted ? 'opacity-80' : ''}`}
                                      >
                                        {isActive && (
                                          <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-t-[2rem] overflow-hidden">
                                            <motion.div 
                                              className="h-full bg-indigo-500"
                                              initial={{ width: 0 }}
                                              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                            />
                                          </div>
                                        )}
                                        
                                        <div className="flex items-start gap-3 sm:gap-4">
                                          <div 
                                            {...provided.dragHandleProps}
                                            className="pt-4 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing hidden sm:block"
                                          >
                                            <GripVertical size={20} />
                                          </div>
                                          <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl ${category.color} text-white shadow-lg shrink-0 mt-0.5`}>
                                            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                          </div>
                                          
                                          <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                              <h3 className={`font-bold text-lg sm:text-xl ${isTaskCompletedOnDate(task, selectedDate) ? 'text-zinc-400 dark:text-zinc-600 line-through' : 'text-zinc-900 dark:text-white'}`}>
                                                {task.title}
                                              </h3>
                                              {isActive && !isTaskCompletedOnDate(task, selectedDate) && (
                                                <span className="shrink-0 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full animate-pulse">
                                                  осталось {remainingMinutes} мин
                                                </span>
                                              )}
                                              {task.isRecurring && (
                                                <span className="shrink-0 text-[8px] font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Ежедневно</span>
                                              )}
                                            </div>

                                            {task.description && (
                                              <p className="mt-1 mb-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2 sm:line-clamp-none">
                                                {task.description}
                                              </p>
                                            )}
                                            
                                            <div className="flex flex-wrap items-center justify-between gap-2.5 mt-2">
                                              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                                <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                                                  <Clock size={14} />
                                                  <span>{task.startTime} – {task.endTime}</span>
                                                </div>
                                                <span className="bg-zinc-50 dark:bg-zinc-900/50 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-800">{category.label}</span>
                                              </div>

                                              <div className="flex items-center gap-0.5 shrink-0">
                                                <button 
                                                  onClick={(e) => handleEditTask(task, e)}
                                                  className="p-1.5 sm:p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                                                  title="Редактировать"
                                                >
                                                  <Edit2 size={16} />
                                                </button>
                                                <button 
                                                  onClick={(e) => handleDeleteTask(task.id, e)}
                                                  className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all"
                                                  title="Удалить"
                                                >
                                                  <Trash2 size={16} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                          <button 
                                            onClick={(e) => toggleComplete(task.id, e)}
                                            className={`mt-1 p-1 shrink-0 hover:scale-110 transition-all ${isTaskCompletedOnDate(task, selectedDate) ? 'text-emerald-500' : 'text-zinc-300 dark:text-zinc-700 hover:text-zinc-400'}`}
                                          >
                                            {isTaskCompletedOnDate(task, selectedDate) ? <CheckCircle size={30} sm:size={36} /> : <Circle size={30} sm:size={36} />}
                                          </button>
                                        </div>
                                      </motion.div>
                                    )}
                                  </DraggableAny>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div
              key="calendar"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all">
                 <div className="flex items-center justify-between mb-8">
                   <div className="flex flex-col">
                     <h2 className="text-2xl font-black text-zinc-900 dark:text-white capitalize">
                       {viewMonth.toLocaleDateString('ru-RU', { month: 'long' })}
                     </h2>
                     <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{viewMonth.getFullYear()}</p>
                   </div>
                   <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl">
                     <button 
                       onClick={() => changeMonth(-1)}
                       className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-zinc-600 dark:text-zinc-400 shadow-sm hover:shadow-md"
                     >
                       <ChevronLeft size={20} />
                     </button>
                     <button 
                       onClick={() => setViewMonth(new Date())}
                       className="px-3 py-1 text-xs font-black uppercase tracking-widest hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-zinc-600 dark:text-zinc-400"
                     >
                       Сегодня
                     </button>
                     <button 
                       onClick={() => changeMonth(1)}
                       className="p-2 hover:bg-white dark:hover:bg-zinc-700 rounded-xl transition-all text-zinc-600 dark:text-zinc-400 shadow-sm hover:shadow-md"
                     >
                       <ChevronRight size={20} />
                     </button>
                   </div>
                 </div>

                 <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                   {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                     <div key={day} className="text-center py-2">
                       <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{day}</span>
                     </div>
                   ))}
                 </div>

                 <div className="grid grid-cols-7 gap-1 sm:gap-2">
                   {calendarDays.map((dateObj, idx) => {
                     const isSelected = calendarSelectedDate === dateObj.fullDate;
                     const isToday = getLocalDateString() === dateObj.fullDate;
                     const hasTasks = dateObj.fullDate && tasks.some(t => isTaskVisibleOnDate(t, dateObj.fullDate));
                     
                     if (!dateObj.day) return <div key={idx} className="aspect-square" />;

                     return (
                       <button
                         key={idx}
                         onClick={() => {
                           if (dateObj.fullDate) {
                             setCalendarSelectedDate(dateObj.fullDate);
                           }
                         }}
                         className={`aspect-square relative flex flex-col items-center justify-center rounded-2xl sm:rounded-3xl transition-all border-2 group ${
                           isSelected 
                             ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900 shadow-xl scale-105 z-10' 
                             : isToday
                               ? 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:border-indigo-900/40 dark:text-indigo-400'
                               : 'bg-white dark:bg-zinc-900 border-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                         }`}
                       >
                         <span className={`text-base sm:text-lg font-black ${isSelected ? '' : 'group-hover:scale-110 transition-transform'}`}>
                           {dateObj.day}
                         </span>
                         {hasTasks && (
                           <div className={`mt-0.5 w-1.5 h-1.5 rounded-full ${isSelected ? (darkMode ? 'bg-zinc-900' : 'bg-white') : (isToday ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700')}`} />
                         )}
                       </button>
                     );
                   })}
                 </div>

                 <div className="mt-8 pt-8 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-4 px-2">
                       <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
                         <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Сегодня</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                         <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Задачи есть</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Task Quick Info for selected date */}
              <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-inner">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Расписание на</h3>
                    <p className="text-lg font-black text-zinc-900 dark:text-white">
                      {parseISOToDate(calendarSelectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleAddTask()}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
                  >
                    <Plus size={14} /> Добавить
                  </button>
                </div>

                <div className="space-y-3">
                   {tasks.filter(t => isTaskVisibleOnDate(t, calendarSelectedDate)).length > 0 ? (
                     tasks.filter(t => isTaskVisibleOnDate(t, calendarSelectedDate)).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(task => {
                       const category = categoriesList.find(c => c.value === task.category) || categoriesList[categoriesList.length - 1];
                       const isCompleted = isTaskCompletedOnDate(task, calendarSelectedDate);
                       
                       return (
                         <div 
                           key={task.id} 
                           className={`flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 transition-all ${isCompleted ? 'opacity-60' : ''}`}
                         >
                           <button 
                             onClick={(e) => toggleComplete(task.id, e, calendarSelectedDate)}
                             className={`shrink-0 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-zinc-200 hover:text-zinc-400'}`}
                           >
                             {isCompleted ? <CheckCircle size={22} /> : <Circle size={22} />}
                           </button>
                           
                           <div className="flex-1 min-w-0" onClick={(e) => handleEditTask(task, e)}>
                             <p className={`text-sm font-bold truncate ${isCompleted ? 'line-through text-zinc-400' : 'dark:text-white'}`}>
                               {task.title}
                             </p>
                             <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                               <Clock size={10} className="text-zinc-300" />
                               <span>{task.startTime} – {task.endTime}</span>
                               <span className={`w-1 h-1 rounded-full ${category.color.replace('bg-', 'bg-opacity-50 bg-')}`} />
                               <span className="truncate">{category.label}</span>
                             </div>
                           </div>

                           <div className="flex items-center gap-1">
                             <button 
                               onClick={(e) => handleEditTask(task, e)}
                               className="p-1.5 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-all"
                             >
                               <Edit2 size={14} />
                             </button>
                             <button 
                               onClick={(e) => handleDeleteTask(task.id, e)}
                               className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                         </div>
                       );
                     })
                   ) : (
                     <div className="py-10 text-center bg-white/50 dark:bg-black/20 rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800">
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Нет задач</p>
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-zinc-900 p-6 sm:p-10 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800">
                <h2 className="text-2xl font-black mb-6">Ваша статистика</h2>
                {tasks.length > 0 ? (
                  <div className="space-y-8">
                    <div className="h-64 mt-4 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={8}
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color === 'emerald-500' ? '#10b981' : entry.color === 'blue-500' ? '#3b82f6' : entry.color === 'amber-500' ? '#f59e0b' : entry.color === 'indigo-500' ? '#6366f1' : '#71717a'} />
                            ))}
                          </Pie>
                          <ReTooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-3xl font-black">{tasks.filter(t => isTaskVisibleOnDate(t, activeTab === 'calendar' ? calendarSelectedDate : selectedDate)).length}</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Задач</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                      {chartData.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl">
                          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: item.color === 'emerald-500' ? '#10b981' : item.color === 'blue-500' ? '#3b82f6' : item.color === 'amber-500' ? '#f59e0b' : item.color === 'indigo-500' ? '#6366f1' : '#71717a' }} />
                          <div className="text-left">
                            <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{item.name}</p>
                            <p className="text-xl font-bold dark:text-white">{Math.round((item.value / Math.max(1, tasks.filter(t => isTaskVisibleOnDate(t, activeTab === 'calendar' ? calendarSelectedDate : selectedDate)).length)) * 100)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Accomplishments & streaks grid */}
                    <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                      <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-400">Достижения и серии</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                          <Zap size={20} className="mx-auto text-amber-500 fill-amber-500 mb-1 animate-bounce" style={{ animationDuration: '3s' }} />
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Шоу серия</p>
                          <p className="text-xl font-extrabold text-zinc-900 dark:text-white mt-1 font-mono">{streakStats.currentStreak} дн.</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                          <Award size={20} className={`mx-auto mb-1 ${st.text}`} />
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Рекорд серии</p>
                          <p className="text-xl font-extrabold text-zinc-900 dark:text-white mt-1 font-mono">{streakStats.maxStreak} дн.</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-center">
                          <ClipboardCheck size={20} className="mx-auto text-emerald-500 mb-1" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Всего готово</p>
                          <p className="text-xl font-extrabold text-zinc-900 dark:text-white mt-1 font-mono">{streakStats.totalCompleted}</p>
                        </div>
                      </div>
                    </div>

                    {/* Weekly activity bar chart */}
                    <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black uppercase tracking-wider text-zinc-450 dark:text-zinc-500">Активность за неделю</h3>
                        <span className="text-[10px] font-bold text-zinc-400">ПОСЛЕДНИЕ 7 ДНЕЙ</span>
                      </div>
                      
                      <div className="h-44 w-full bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        <ResponsiveContainer width="100%" height="100%">
                          <ReBarChart data={last7DaysChartData}>
                            <ReXAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fontWeight: 'bold' }} />
                            <ReYAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 9 }} />
                            <ReTooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: 11, fontWeight: 'bold', backgroundColor: darkMode ? '#18181b' : '#ffffff', color: darkMode ? '#f4f4f5' : '#18181b' }} />
                            <ReBar dataKey="tasks" fill={st.barFill} radius={[4, 4, 0, 0]} />
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <BarChart3 className="mx-auto text-zinc-200 mb-4" size={64} />
                    <p className="text-zinc-500 font-medium">Добавьте задачи, чтобы увидеть аналитику!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              <div className="bg-white dark:bg-zinc-900 p-6 sm:p-10 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800">
                <h2 className="text-2xl font-black mb-8 italic text-zinc-900 dark:text-zinc-50">Настройки</h2>
                
                <div className="space-y-4">
                  {/* Appearance */}
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-[1.25rem] shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                          {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100">Тёмная тема</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Автоматический режим включен</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleDarkMode}
                        className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? st.primary : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${darkMode ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Notifications */}
                  <div className="p-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-[1.25rem] shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl font-sans ${st.lightBg}`}>
                          <Bell size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100">Уведомления и Звуки</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Персонализация оповещений</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setGlobalSettings(prev => ({ ...prev, allNotificationsEnabled: !prev.allNotificationsEnabled }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${globalSettings.allNotificationsEnabled ? st.primary : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${globalSettings.allNotificationsEnabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>

                    {globalSettings.allNotificationsEnabled && (
                      <div className="p-4 space-y-6 animate-in fade-in slide-in-from-top-2">
                        {/* Global master volume */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-500 font-sans">Общая громкость</span>
                            <p className="text-[10px] text-zinc-400 font-sans">Влияет на все типы аудиосигналов</p>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                            <Volume1 size={16} className="text-zinc-400 shrink-0" />
                            <input 
                              type="range" 
                              min="0" max="1" step="0.05" 
                              value={globalSettings.globalVolume}
                              onChange={(e) => setGlobalSettings(prev => ({ ...prev, globalVolume: parseFloat(e.target.value) }))}
                              className={`flex-1 sm:w-32 ${st.accent} h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer`}
                            />
                            <Volume2 size={16} className="text-zinc-600 dark:text-zinc-350 shrink-0" />
                            <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 w-8 text-right shrink-0">
                              {Math.round(globalSettings.globalVolume * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Trigger Tabs Selector */}
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2.5 font-sans">Тип события</span>
                          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
                            {(['start', 'end', 'reminder', 'pomodoro'] as const).map((type) => {
                              const label = type === 'start' ? 'Старт задачи' : type === 'end' ? 'Конец задачи' : type === 'reminder' ? 'Напоминание' : 'Помодоро';
                              const active = activeSoundTab === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => {
                                    stopActiveSound();
                                    setActiveSoundTab(type);
                                  }}
                                  className={`px-3 py-2 text-center rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer font-sans ${
                                    active 
                                      ? `${st.primary} text-white shadow-md ${st.shadow}` 
                                      : 'bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active sound tab configurator panel */}
                        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-2.5xl border border-zinc-200/65 dark:border-zinc-800/60 space-y-4 font-sans">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Настройки сигнала для {
                              activeSoundTab === 'start' ? 'Старта задачи' : 
                              activeSoundTab === 'end' ? 'Завершения задачи' : 
                              activeSoundTab === 'reminder' ? 'Напоминания' : 'Помодоро'
                            }</span>
                            {isSoundPlaying && (
                              <button 
                                type="button"
                                onClick={() => stopActiveSound()}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all self-start sm:self-auto"
                              >
                                Сбросить звук ⏹
                              </button>
                            )}
                          </div>

                          {/* Sound Mode Selection */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Тип аудио воспроизведения</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {([
                                { mode: 'silent', label: 'Без звука (Тишина)', icon: <VolumeX size={14} /> },
                                { mode: 'default', label: 'Стандартный писк', icon: <Volume1 size={14} /> },
                                { mode: 'calm', label: 'Спокойный Дзен (Sine)', icon: <Music size={14} /> },
                                { mode: 'tech', label: 'Техно-клик (Square)', icon: <Zap size={14} /> },
                                { mode: 'custom', label: 'Свой музыкальный файл', icon: <FileAudio size={14} /> }
                              ] as const).map(({ mode, label: modeLabel, icon }) => {
                                const currentMode = globalSettings.configs?.[activeSoundTab]?.soundMode || 'default';
                                const selected = currentMode === mode;
                                return (
                                  <button
                                    key={mode}
                                    onClick={() => {
                                      stopActiveSound();
                                      setGlobalSettings(prev => {
                                        const updated = {
                                          ...prev,
                                          configs: {
                                            ...prev.configs,
                                            [activeSoundTab]: {
                                              ...prev.configs[activeSoundTab],
                                              soundMode: mode
                                            }
                                          }
                                        };
                                        localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(updated));
                                        return updated;
                                      });
                                    }}
                                    className={`p-2.5 flex items-center gap-2 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                                      selected 
                                        ? `border ${st.border} ${st.lightBg}` 
                                        : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    }`}
                                  >
                                    <span className={selected ? `${st.accentText}` : 'text-zinc-400'}>{icon}</span>
                                    <span className="truncate">{modeLabel}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* User Custom File Upload Space (appears conditionally) */}
                          {globalSettings.configs?.[activeSoundTab]?.soundMode === 'custom' && (
                            <div className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${st.accentText} block`}>Загруженный аудиофайл</span>
                                  {customSoundsList.some(s => s.id === `custom_${activeSoundTab}`) ? (
                                    <div className="flex items-center gap-1.5">
                                      <FileAudio size={15} className="text-emerald-500 shrink-0" />
                                      <span className="text-xs font-black text-zinc-700 dark:text-zinc-200 truncate">
                                        {customSoundsList.find(s => s.id === `custom_${activeSoundTab}`)?.name}
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-zinc-400 italic leading-snug">Аудиофайл еще не выбран. Пожалуйста, загрузите свой файл.</p>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-1.5 shrink-0">
                                  <input
                                    type="file"
                                    id={`audio-uploader-${activeSoundTab}`}
                                    accept=".mp3,.wav,.ogg,.m4a,audio/*"
                                    className="hidden"
                                    onChange={(e) => handleAudioUpload(e, activeSoundTab)}
                                  />
                                  <button
                                    onClick={() => document.getElementById(`audio-uploader-${activeSoundTab}`)?.click()}
                                    className={`p-1 px-3 ${st.lightBg} text-[10px] font-black uppercase tracking-wider rounded-lg border ${st.border} transition-all cursor-pointer`}
                                  >
                                    {customSoundsList.some(s => s.id === `custom_${activeSoundTab}`) ? 'Заменить' : 'Выбрать файл'}
                                  </button>
                                  {customSoundsList.some(s => s.id === `custom_${activeSoundTab}`) && (
                                    <button
                                      onClick={() => handleDeleteCustomSound(activeSoundTab)}
                                      className="p-1 px-3 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-900/40 text-[10px] font-black uppercase tracking-wider rounded-lg border border-red-100 dark:border-red-900/50 transition-all cursor-pointer"
                                    >
                                      Удалить
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-[9px] text-zinc-400 leading-normal">
                                Поддерживаются форматы: <strong className="text-zinc-600 dark:text-zinc-400">MP3, WAV, OGG, M4A</strong>. Файл сохраняется автономно на данном устройстве в IndexedDB.
                              </p>
                            </div>
                          )}

                            {/* Sound modifiers: Single line items */}
                            <div className="space-y-3.5 pt-1.5">
                              {/* Audio Volume configuration */}
                              {globalSettings.configs?.[activeSoundTab]?.soundMode !== 'silent' && (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                    <span>Индивидуальная громкость уведомления</span>
                                    <span className="font-mono text-zinc-700 dark:text-zinc-400">
                                      {Math.round((globalSettings.configs?.[activeSoundTab]?.volume || 0.8) * 100)}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Volume1 size={13} className="text-zinc-400" />
                                    <input 
                                      type="range" min="0" max="1" step="0.05"
                                      value={globalSettings.configs?.[activeSoundTab]?.volume || 0.8}
                                      onChange={(e) => {
                                        setGlobalSettings(prev => {
                                          const updated = {
                                            ...prev,
                                            configs: {
                                              ...prev.configs,
                                              [activeSoundTab]: {
                                                ...prev.configs[activeSoundTab],
                                                volume: parseFloat(e.target.value)
                                              }
                                            }
                                          };
                                          localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(updated));
                                          return updated;
                                        });
                                      }}
                                      className={`flex-1 ${st.accent} h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer`}
                                    />
                                    <Volume2 size={13} className="text-zinc-500" />
                                  </div>
                                </div>
                              )}

                              {/* Toggle: Looping and Fade-in inside responsive column/grid layout */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
                                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-400">Зацикливание</span>
                                    <p className="text-[8px] text-zinc-400 leading-none">Повторять бесконечно</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setGlobalSettings(prev => {
                                        const updated = {
                                          ...prev,
                                          configs: {
                                            ...prev.configs,
                                            [activeSoundTab]: {
                                              ...prev.configs[activeSoundTab],
                                              loop: !prev.configs[activeSoundTab].loop
                                            }
                                          }
                                        };
                                        localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(updated));
                                        return updated;
                                      });
                                    }}
                                    className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${globalSettings.configs?.[activeSoundTab]?.loop ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                                  >
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${globalSettings.configs?.[activeSoundTab]?.loop ? 'right-0.5' : 'left-0.5'}`} />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-800 dark:text-zinc-400">Нарастание</span>
                                    <p className="text-[8px] text-zinc-400 leading-none">Плавный Fade-In 3с</p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setGlobalSettings(prev => {
                                        const updated = {
                                          ...prev,
                                          configs: {
                                            ...prev.configs,
                                            [activeSoundTab]: {
                                              ...prev.configs[activeSoundTab],
                                              fadeIn: !prev.configs[activeSoundTab].fadeIn
                                            }
                                          }
                                        };
                                        localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(updated));
                                        return updated;
                                      });
                                    }}
                                    className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${globalSettings.configs?.[activeSoundTab]?.fadeIn ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                                  >
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${globalSettings.configs?.[activeSoundTab]?.fadeIn ? 'right-0.5' : 'left-0.5'}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Duration limit setting */}
                              {globalSettings.configs?.[activeSoundTab]?.soundMode !== 'silent' && (
                                <div className="space-y-1 bg-white dark:bg-zinc-900 p-2.5 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                                    <span className="uppercase tracking-wider">Макс. длительность проигрывания</span>
                                    <span className={`font-black ${st.accentText}`}>
                                      {globalSettings.configs?.[activeSoundTab]?.durationLimit === 0 ? 'Без ограничений (До конца трека)' : `${globalSettings.configs?.[activeSoundTab]?.durationLimit} секунд`}
                                    </span>
                                  </div>
                                  <input 
                                    type="range" min="0" max="60" step="5"
                                    value={globalSettings.configs?.[activeSoundTab]?.durationLimit}
                                    onChange={(e) => {
                                      setGlobalSettings(prev => {
                                        const updated = {
                                          ...prev,
                                          configs: {
                                            ...prev.configs,
                                            [activeSoundTab]: {
                                              ...prev.configs[activeSoundTab],
                                              durationLimit: parseInt(e.target.value)
                                            }
                                          }
                                        };
                                        localStorage.setItem(STORAGE_KEY + '_settings', JSON.stringify(updated));
                                        return updated;
                                      });
                                    }}
                                    className={`w-full ${st.accent} h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer`}
                                  />
                                </div>
                              )}

                              {/* Play preview and Stop buttons */}
                              <div className="pt-1.5">
                                <button
                                  onClick={() => {
                                    if (isSoundPlaying) {
                                      stopActiveSound();
                                    } else {
                                      const config = globalSettings.configs?.[activeSoundTab];
                                      if (config) playSoundConfig(config, globalSettings.globalVolume);
                                    }
                                  }}
                                  className={`w-full py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                                    isSoundPlaying
                                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                                      : `${st.primary} text-white`
                                  }`}
                                >
                                  {isSoundPlaying ? (
                                    <>
                                      <span>Прервать аудио</span>
                                      <span className="px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-mono shrink-0 animate-pulse">STOP ●</span>
                                    </>
                                  ) : (
                                    <>
                                      <span>Прослушать как звучит</span>
                                      <Volume2 size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Registry of loaded melodies (for visibility & management) */}
                          {customSoundsList.length > 0 && (
                            <div className="space-y-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-[1.75rem]">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Глобальная база аудиофайлов ({customSoundsList.length})</span>
                              <div className="space-y-1.5 divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-36 overflow-y-auto pr-1">
                                {customSoundsList.map((sound, i) => {
                                  // Find which event this sound belongs to
                                  const mappedEventStr = 
                                    sound.id === 'custom_start' ? 'Старт' :
                                    sound.id === 'custom_end' ? 'Конец' :
                                    sound.id === 'custom_reminder' ? 'Напоминание' :
                                    sound.id === 'custom_pomodoro' ? 'Помодоро' : 'Свободный';
                                    
                                  return (
                                    <div key={sound.id} className={`flex items-center justify-between text-xs py-2 ${i > 0 ? 'border-t border-zinc-100 dark:border-zinc-800/40' : ''}`}>
                                      <div className="flex items-center gap-2 min-w-0 pr-2">
                                        <Music size={14} className="text-zinc-400 shrink-0" />
                                        <div className="min-w-0">
                                          <p className="font-bold text-zinc-800 dark:text-zinc-200 truncate">{sound.name}</p>
                                          <p className="text-[9px] text-zinc-400">Назначено: <span className={`font-semibold ${st.accentText}`}>{mappedEventStr}</span></p>
                                        </div>
                                      </div>
                                      <button
                                        onClick={async () => {
                                          const eventKey = sound.id.replace('custom_', '') as 'start' | 'end' | 'reminder' | 'pomodoro';
                                          await handleDeleteCustomSound(eventKey);
                                        }}
                                        className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                                        title="Удалить файл полностью"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                    {/* Original test container below */}
                    {testStatus === 'idle' && (
                      <button 
                        onClick={handleTestNotification}
                        className={`w-full py-3 ${st.primary} text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg ${st.shadow} dark:shadow-none cursor-pointer`}
                      >
                         Проверить уведомления (через 5 сек)
                      </button>
                    )}

                        {testStatus === 'scheduled' && (
                          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center space-y-2">
                            <p className={`text-xs font-black uppercase tracking-widest animate-pulse ${st.accentText}`}>
                              Проверка запущена — отсчет {testCountdown} сек
                            </p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-normal">
                              Заблокируйте экран планшета или сверните браузер прямо сейчас, чтобы проверить фоновый режим!
                            </p>
                          </div>
                        )}

                        {testStatus === 'success' && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 text-center space-y-2">
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                              Уведомление отправлено! 🎉
                            </p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-normal">
                              Если вы увидели баннер или услышали звук — всё настроено отлично. Если звука нет, проверьте громкость вашего планшета.
                            </p>
                            <button 
                              onClick={() => setTestStatus('idle')}
                              className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold cursor-pointer"
                            >
                              Проверить еще раз
                            </button>
                          </div>
                        )}

                        {testStatus === 'failed' && (
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/50 text-center space-y-2">
                            <p className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                              Не удалось запланировать ⚠️
                            </p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto leading-normal">
                              Возможно, в вашем браузере заблокированы уведомления на системном уровне.
                            </p>
                            <button 
                              onClick={() => setTestStatus('idle')}
                              className={`text-[10px] ${st.accentText} hover:underline font-bold cursor-pointer`}
                            >
                              Попробовать заново
                            </button>
                          </div>
                        )}

                        {/* Diagnostics & Troubleshooting Panel */}
                        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 text-left">
                          <h4 className="text-xs font-black text-zinc-700 dark:text-zinc-300 mb-2.5 uppercase tracking-wide flex items-center gap-1.5">
                            <Info size={14} className={st.accentText} />
                            Инструкция: Если нет уведомлений
                          </h4>
                          <div className="space-y-3.5 text-[11px] text-zinc-600 dark:text-zinc-400 leading-normal">
                            <div className={`space-y-0.5 p-2.5 ${st.lightBg} rounded-xl border ${st.border} mb-2`}>
                              <p className={`font-bold ${st.accentText} text-[11px] uppercase tracking-wide`}>🔥 Тестирование на сайте AI Studio (Важно!)</p>
                              <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-[10px]">
                                Вы тестируете приложение прямо на сайте AI Studio внутри фрейма (<strong className="text-zinc-800 dark:text-zinc-200">iframe</strong>). Браузеры <strong className={`font-bold ${st.accentText}`}>полностью блокируют</strong> системные всплывающие уведомления во встроенных фреймах для безопасности!
                                <br />
                                <span className="mt-1 block">
                                  Чтобы проверить <strong className="text-zinc-800 dark:text-zinc-200">настоящие уведомления на вашем планшете</strong>, нажмите иконку <strong className="text-zinc-800 dark:text-zinc-200">«Открыть в новой вкладке»</strong> (в правом верхнем углу окна предпросмотра) или воспользуйтесь прямой ссылкой, а затем установите как PWA.
                                </span>
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">1. Использование в браузере (PWA)</p>
                              <p className="text-zinc-500 dark:text-zinc-500 leading-relaxed">
                                Мобильные браузеры останавливают таймеры при выключении экрана. Чтобы уведомления работали, нажмите кнопку <strong className="text-zinc-700 dark:text-zinc-300">«Поделиться»</strong> в браузере и выберите <strong className="text-zinc-700 dark:text-zinc-300">«Добавить на экран Домой» (Установить как PWA)</strong>, после чего откройте приложение с главного экрана и разрешите уведомления.
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">2. Оптимизация батареи (Android)</p>
                              <p className="text-zinc-500 dark:text-zinc-500 leading-relaxed">
                                Системы энергосбережения усыпляют фоновые задачи. Перейдите в <strong className="text-zinc-700 dark:text-zinc-300">Настройки устройства → Приложения → SchedulePro → Оптимизация батареи → выберите «Без ограничений»</strong> (или разрешите фоновое выполнение).
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">3. Режимы сна / Не беспокоить</p>
                              <p className="text-zinc-500 dark:text-zinc-500 leading-relaxed">
                                Убедитесь, что на планшете не активен режим «Не беспокоить», «Режим сна» или профили без звука. Они полностью скрывают все всплывающие оповещения в шторке.
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">4. Точные будильники (Android 13+ / Планшеты)</p>
                              <p className="text-zinc-500 dark:text-zinc-500 leading-relaxed">
                                На новых планшетах и телефонах для мгновенного срабатывания таймеров нужно специальное разрешение. Перейдите в <strong className="text-zinc-700 dark:text-zinc-300">Настройки устройства → Приложения → Спец. доступ (или карточка Schedule Pro) → Будильники и напоминания</strong> и включите переключатель <strong className="text-zinc-700 dark:text-zinc-300">«Разрешить установку точных будильников»</strong>.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Themes Selector */}
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${st.lightBg}`}>
                        <Palette size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100 font-sans">Визуальные Темы</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Персонализируйте гамму и акценты</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                       {Object.entries(THEME_STYLES).map(([themeKey, style]) => {
                         const active = globalSettings.theme === themeKey;
                         return (
                           <button
                             key={themeKey}
                             type="button"
                             onClick={() => {
                               setGlobalSettings(prev => ({ ...prev, theme: themeKey as any }));
                             }}
                             className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                               active 
                                 ? 'bg-white dark:bg-zinc-900 shadow-md border-zinc-950 dark:border-zinc-400 scale-102 font-bold text-zinc-900 dark:text-white' 
                                 : 'bg-white/40 hover:bg-white dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700'
                             }`}
                           >
                             <div className="flex items-center gap-2 mb-1.5">
                               <div className={`w-3.5 h-3.5 rounded-full ${style.primary}`} />
                               <span className="text-xs font-black capitalize truncate">{themeKey === 'cyberpunk' ? 'Cyberpunk 🪐' : themeKey === 'emerald' ? 'Emerald 🍃' : themeKey === 'amber' ? 'Amber ☀️' : themeKey === 'rose' ? 'Rose 🌸' : themeKey === 'slate' ? 'Slate ⛰️' : 'Classic 🌌'}</span>
                             </div>
                             <div className="flex gap-1">
                               <span className={`w-12 h-1 rounded ${style.barFill}`} />
                               <span className="w-4 h-1 rounded bg-zinc-200 dark:bg-zinc-700" />
                             </div>
                             {active && (
                               <div className="absolute right-2 top-2 w-1.5 h-1.5 rounded-full bg-zinc-950 dark:bg-zinc-200" />
                             )}
                           </button>
                         );
                       })}
                    </div>
                  </div>

                  {/* Custom Category Creator & Manager */}
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${st.lightBg}`}>
                        <Tag size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100">Управление категориями</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Добавляйте свои личные метки задач</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Ваши категории ({categoriesList.length})</span>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        {categoriesList.map((cat) => {
                          const IconComp = getCategoryIcon(cat.iconName || 'plus');
                          const isCustomCat = globalSettings.customCategories?.some(cc => cc.value === cat.value);
                          return (
                            <div 
                              key={cat.value} 
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border border-transparent tracking-wide ${cat.color} text-white`}
                            >
                              <IconComp size={12} className="shrink-0" />
                              <span>{cat.label}</span>
                              {isCustomCat && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedCustom = (globalSettings.customCategories || []).filter(c => c.value !== cat.value);
                                    setGlobalSettings(prev => ({
                                      ...prev,
                                      customCategories: updatedCustom
                                    }));
                                  }}
                                  className="ml-1 p-0.5 rounded-full hover:bg-white/20 text-white transition-all cursor-pointer inline-flex items-center justify-center"
                                  title="Удалить категорию"
                                >
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white/50 dark:bg-zinc-900/45 p-4 rounded-2.5xl border border-zinc-200 dark:border-zinc-800/80 space-y-4">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Создать новую категорию</span>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="Название категории напр. СПОРТ..."
                          value={newCatLabel}
                          onChange={(e) => setNewCatLabel(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 text-xs font-bold dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-1 focus:ring-zinc-500 uppercase"
                        />

                        <div>
                          <label className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Цветовая палитра метки</label>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                            {[
                              { colorClass: "bg-red-500 hover:bg-red-600", label: "Красный" },
                              { colorClass: "bg-orange-500 hover:bg-orange-600", label: "Оранжевый" },
                              { colorClass: "bg-amber-500 hover:bg-amber-600", label: "Янтарный" },
                              { colorClass: "bg-emerald-500 hover:bg-emerald-600", label: "Изумруд" },
                              { colorClass: "bg-teal-500 hover:bg-teal-600", label: "Бирюза" },
                              { colorClass: "bg-blue-500 hover:bg-blue-600", label: "Синий" },
                              { colorClass: "bg-indigo-500 hover:bg-indigo-600", label: "Индиго" },
                              { colorClass: "bg-purple-500 hover:bg-purple-600", label: "Пурпур" },
                              { colorClass: "bg-pink-500 hover:bg-pink-600", label: "Розовый" },
                              { colorClass: "bg-rose-500 hover:bg-rose-600", label: "Роза" }
                            ].map((clr) => (
                              <button
                                key={clr.colorClass}
                                type="button"
                                onClick={() => setNewCatColor(clr.colorClass)}
                                className={`w-6 h-6 rounded-full shrink-0 border-2 transition-all ${clr.colorClass} ${newCatColor === clr.colorClass ? 'border-zinc-950 dark:border-white scale-110 shadow' : 'border-transparent'}`}
                                title={clr.label}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1.5">Выберите пиктограмму метки</label>
                          <div className="grid grid-cols-6 gap-2 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                             {Object.keys(CATEGORY_ICONS_CATALOG).map((icoName) => {
                               const CatalogIcon = getCategoryIcon(icoName);
                               return (
                                 <button
                                   key={icoName}
                                   type="button"
                                   onClick={() => setNewCatIcon(icoName)}
                                   className={`p-2 rounded-lg flex items-center justify-center transition-all border ${newCatIcon === icoName ? `${st.lightBg} ${st.border}` : 'hover:bg-zinc-100 text-zinc-400 border-transparent dark:hover:bg-zinc-800/50'}`}
                                 >
                                   <CatalogIcon size={14} />
                                 </button>
                                );
                             })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newCatLabel.trim()) return alert("Введите название для категории!");
                            const catValue = newCatLabel.trim().toLowerCase().replace(/\s+/g, '_');
                            const alreadyExists = categoriesList.some(c => c.value === catValue);
                            if (alreadyExists) return alert("Категория с таким системным идентификатором уже существует!");
                            
                            const newCategory = {
                              value: catValue,
                              label: newCatLabel.trim(),
                              color: newCatColor,
                              iconName: newCatIcon
                            };
                            setGlobalSettings(prev => ({
                              ...prev,
                              customCategories: [...(prev.customCategories || []), newCategory]
                            }));
                            setNewCatLabel("");
                            alert("Категория добавлена! 🎉");
                          }}
                          className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer ${st.primary}`}
                        >
                          Подключить категорию ➕
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sync and offline backup */}
                  <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${st.lightBg}`}>
                        <Upload size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-zinc-800 dark:text-zinc-100">Синхронизация и бэкапы</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Импортируйте или экспортируйте ваши задачи полностью</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={exportBackupData}
                        className="py-3 px-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-black text-left flex items-center justify-between group transition-all"
                      >
                        <span className="flex flex-col">
                          <span className="text-zinc-800 dark:text-zinc-200">Скачать бэкап</span>
                          <span className="text-[9px] text-zinc-400 font-normal">Экспорт в TimeFlow.json</span>
                        </span>
                        <Download size={16} className={`text-zinc-400 group-hover:${st.accentText} transition-colors shrink-0`} />
                      </button>

                      <label className="py-3 px-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-black text-left flex items-center justify-between group transition-all cursor-pointer">
                        <span className="flex flex-col">
                          <span className="text-zinc-800 dark:text-zinc-200">Восстановить бэкап</span>
                          <span className="text-[9px] text-zinc-400 font-normal">Импорт JSON файла</span>
                        </span>
                        <Upload size={16} className={`text-zinc-400 group-hover:${st.accentText} transition-colors shrink-0`} />
                        <input
                          type="file"
                          accept=".json"
                          onChange={importBackupData}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center">
                      <Info size={24} className="text-zinc-300 dark:text-zinc-500 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Версия</p>
                      <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100">1.2.0</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center">
                      <Shield size={24} className="text-emerald-500/50 mb-2" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Статус</p>
                      <p className="text-lg font-bold text-emerald-500">Безопасно</p>
                    </div>
                  </div>

                  <button className="w-full flex items-center justify-between p-5 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-950 dark:hover:bg-zinc-700/80 text-white dark:text-zinc-100 border border-transparent dark:border-zinc-800 rounded-[2rem] font-bold group transition-all mt-8">
                     <span className="flex items-center gap-3"><HelpCircle size={20} /> Поддержка</span>
                     <ExternalLink size={18} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto bg-white/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-[2rem] shadow-2xl p-2 flex items-center justify-between pointer-events-auto">
          {/* Today Tab */}
          <button 
            onClick={() => setActiveTab('today')}
            className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all ${activeTab === 'today' ? st.tabActive : 'text-zinc-400 dark:text-zinc-500'}`}
          >
            <div className="relative">
              <ClipboardCheck size={24} />
              {activeTab === 'today' && (
                <motion.div 
                  layoutId="activeTab"
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 ${st.primary} rounded-full`}
                />
              )}
            </div>
            <span className="text-[10px] font-bold">Сегодня</span>
          </button>

          {/* Calendar Tab */}
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all ${activeTab === 'calendar' ? st.tabActive : 'text-zinc-400 dark:text-zinc-500'}`}
          >
            <div className="relative">
              <CalendarDays size={24} />
              {activeTab === 'calendar' && (
                <motion.div 
                  layoutId="activeTab"
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 ${st.primary} rounded-full`}
                />
              )}
            </div>
            <span className="text-[10px] font-bold">Календарь</span>
          </button>

          {/* Add Button */}
          <div className="flex-1 flex justify-center -mt-10">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleAddTask()}
              className={`w-14 h-14 ${st.primary} text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(79,70,229,0.4)] ring-4 ring-white dark:ring-zinc-900`}
            >
              <Plus size={32} />
            </motion.button>
          </div>

          {/* Stats Tab */}
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all ${activeTab === 'stats' ? st.tabActive : 'text-zinc-400 dark:text-zinc-500'}`}
          >
            <div className="relative">
              <BarChart3 size={24} />
              {activeTab === 'stats' && (
                <motion.div 
                  layoutId="activeTab"
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 ${st.primary} rounded-full`}
                />
              )}
            </div>
            <span className="text-[10px] font-bold">Статистика</span>
          </button>

          {/* Settings Tab */}
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all ${activeTab === 'settings' ? st.tabActive : 'text-zinc-400 dark:text-zinc-500'}`}
          >
            <div className="relative">
              <SettingsIcon size={24} />
              {activeTab === 'settings' && (
                <motion.div 
                  layoutId="activeTab"
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 ${st.primary} rounded-full`}
                />
              )}
            </div>
            <span className="text-[10px] font-bold">Настройки</span>
          </button>
        </div>
      </nav>

      {/* Modal - Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            />
            <motion.div
              layoutId="modal"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[32px] sm:rounded-[32px] shadow-2xl p-6 sm:p-10 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-8 sm:hidden" />
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {editingTask ? 'Редактировать' : 'Новое занятие'}
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <h4 className="font-bold text-sm dark:text-white">Повторять ежедневно</h4>
                    <p className="text-[10px] text-zinc-500 font-medium">Задача будет появляться в списке каждый день</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isRecurring: !formData.isRecurring })}
                    className={`w-12 h-6 rounded-full transition-all relative ${formData.isRecurring ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isRecurring ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                {formData.isRecurring && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3">Дни недели</label>
                    <div className="flex justify-between gap-1">
                      {[
                        { label: 'Пн', value: 1 },
                        { label: 'Вт', value: 2 },
                        { label: 'Ср', value: 3 },
                        { label: 'Чт', value: 4 },
                        { label: 'Пт', value: 5 },
                        { label: 'Сб', value: 6 },
                        { label: 'Вс', value: 0 }
                      ].map((day) => {
                        const isSelected = formData.recurringDays?.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => {
                              const current = formData.recurringDays || [];
                              const next = isSelected 
                                ? current.filter(d => d !== day.value)
                                : [...current, day.value];
                              setFormData({ ...formData, recurringDays: next });
                            }}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${
                              isSelected 
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-indigo-300'
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3">Дата</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 dark:text-white border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 rounded-2xl transition-all font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3">Заголовок</label>
                  <input
                    required
                    autoFocus
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 dark:text-white border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 rounded-2xl transition-all font-bold text-lg"
                    placeholder="Название задачи"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3">Начало</label>
                    <input
                      required
                      type="time"
                      value={formData.startTime}
                      onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 dark:text-white border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 rounded-2xl transition-all font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3">Конец</label>
                    <input
                      required
                      type="time"
                      value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 dark:text-white border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 rounded-2xl transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3">Выберите цвет категории</label>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-zinc-800">
                    {categoriesList.map(cat => {
                      const Icon = getCategoryIcon(cat.iconName || 'plus');
                      const isSelected = formData.category === cat.value;
                      return (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value })}
                          className={`flex flex-col items-center justify-center aspect-square gap-1 rounded-2xl transition-all overflow-hidden border-2 group ${
                            isSelected 
                              ? `${cat.color} text-white border-transparent shadow-lg scale-105` 
                              : 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Icon size={20} className={isSelected ? "" : "group-hover:scale-110 transition-transform"} />
                          <span className="text-[10px] font-bold truncate w-full text-center px-1">{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3">Описание</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-800/50 dark:text-white border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-800 rounded-2xl transition-all font-medium resize-none shadow-inner"
                    placeholder="Заметки или детали..."
                  />
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                        <Bell size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Уведомления</p>
                        <p className="text-[9px] text-zinc-500">Система оповещений</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({ 
                        ...formData, 
                        notifications: { ...formData.notifications, enabled: !formData.notifications.enabled } 
                      })}
                      className={`w-10 h-5 rounded-full transition-all relative ${formData.notifications.enabled ? 'bg-indigo-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${formData.notifications.enabled ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>

                  {formData.notifications.enabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 overflow-hidden pt-2"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.notifications.onStart}
                            onChange={() => setFormData({ ...formData, notifications: { ...formData.notifications, onStart: !formData.notifications.onStart } })}
                            className="w-4 h-4 rounded accent-indigo-600"
                          />
                          <span className="text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400">Старт</span>
                        </label>
                        <label className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={formData.notifications.onEnd}
                            onChange={() => setFormData({ ...formData, notifications: { ...formData.notifications, onEnd: !formData.notifications.onEnd } })}
                            className="w-4 h-4 rounded accent-indigo-600"
                          />
                          <span className="text-[10px] font-bold uppercase text-zinc-600 dark:text-zinc-400">Конец</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl">
                        <div>
                          <label className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Напомнить</label>
                          <select 
                            value={formData.notifications.reminderMinutes}
                            onChange={(e) => setFormData({ ...formData, notifications: { ...formData.notifications, reminderMinutes: parseInt(e.target.value) }})}
                            className="w-full bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none"
                          >
                            <option value="0">Во время</option>
                            <option value="5">За 5 мин</option>
                            <option value="10">За 10 мин</option>
                            <option value="15">За 15 мин</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-zinc-400 uppercase tracking-widest mb-1">Звук</label>
                          <div className="flex items-center justify-between">
                            <select 
                              value={formData.notifications.soundName}
                              onChange={(e) => setFormData({ ...formData, notifications: { ...formData.notifications, soundName: e.target.value }})}
                              className="bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none max-w-[120px] truncate"
                            >
                              <option value="default">Default (Системный)</option>
                              <option value="calm">Calm (Дзен)</option>
                              <option value="tech">Tech (Техно)</option>
                              {customSoundsList.map((sound) => (
                                <option key={sound.id} value={`custom_${sound.id.replace('custom_', '')}`}>{sound.name}</option>
                              ))}
                            </select>
                            <button 
                              type="button"
                              onClick={() => playNotificationSound(formData.notifications.soundName, formData.notifications.volume)}
                              className="text-indigo-600"
                            >
                              <Play size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-4 pt-4 pb-2">
                  <button
                    type="submit"
                    className="flex-1 px-8 py-5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-[1.5rem] font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-zinc-900/20 dark:shadow-white/5 uppercase tracking-widest text-sm"
                  >
                    {editingTask ? 'Сохранить изменения' : 'Создать задачу'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Stats */}
      <AnimatePresence>
        {isPomodoroOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsPomodoroOpen(false)}
               className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
            />
            <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[3rem] shadow-2xl p-8 sm:p-10 overflow-hidden text-center"
            >
               <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-6">
                 {pomodoroMode === 'work' ? 'Рабочее время' : 'Время перерыва'}
               </h3>
               
               <div className="text-7xl font-black tabular-nums tracking-tighter mb-8 dark:text-white">
                 {formatPomodoroTime(pomodoroTime)}
               </div>

               <div className="flex justify-center gap-4 mb-8">
                  <button 
                    onClick={togglePomodoro}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
                      isPomodoroRunning 
                        ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/20'
                    }`}
                  >
                    {isPomodoroRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                  </button>
                  <button 
                    onClick={() => resetPomodoro(pomodoroMode)}
                    className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-white flex items-center justify-center transition-all"
                  >
                    <Square size={28} />
                  </button>
               </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => resetPomodoro('work')}
                    className={`py-3 rounded-2xl font-bold text-sm transition-all ${
                      pomodoroMode === 'work' 
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' 
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Работа
                  </button>
                  <button 
                    onClick={() => resetPomodoro('break')}
                    className={`py-3 rounded-2xl font-bold text-sm transition-all ${
                      pomodoroMode === 'break' 
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black' 
                        : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                    }`}
                  >
                    Перерыв
                  </button>
                </div>

                <button 
                  onClick={() => setIsPomodoroOpen(false)}
                  className="mt-8 text-zinc-400 text-xs font-bold uppercase tracking-widest hover:text-zinc-900 dark:hover:text-white transition-all underline underline-offset-4"
                >
                  Скрыть
                </button>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
}

