import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { ScheduleTask } from '../types';

function stringToId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  // Keep ID within safe 32-bit positive integer range (max 2^31 - 1)
  return Math.abs(hash) % 2000000000;
}

export function getDuration(start: string, end: string) {
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours > 0 && mins > 0) return `${hours} ч. ${mins} мин.`;
  if (hours > 0) return `${hours} ч.`;
  return `${mins} мин.`;
}

async function safeSchedule(notifications: any[]) {
  try {
    console.log(`Attempting to schedule ${notifications.length} local notifications...`);
    await LocalNotifications.schedule({ notifications });
    console.log('Local notifications scheduled successfully with exact settings.');
  } catch (e) {
    console.warn('Exact permission alarm scheduling failed. Retrying with maximum compatibility settings...', e);
    try {
      const fallbackNotifications = notifications.map(notif => {
        if (notif.schedule) {
          // Remove allowWhileIdle/exact schedules which demand restricted android permissions
          const { allowWhileIdle, ...restSchedule } = notif.schedule;
          return {
            ...notif,
            schedule: restSchedule
          };
        }
        return notif;
      });
      await LocalNotifications.schedule({ notifications: fallbackNotifications });
      console.log('Notifications scheduled successfully with lenient settings.');
    } catch (err) {
      console.warn('Lenient local notifications strategy also failed (normal on non-mobile web browser views):', err);
    }
  }
}

export const requestNotificationPermission = async () => {
  try {
    console.log('Checking notification permissions...');
    
    const isPluginAvailable = Capacitor.isPluginAvailable('LocalNotifications');
    if (!isPluginAvailable) {
      console.warn('LocalNotifications plugin is not available on this platform/browser.');
    } else {
      // Check Capacitor LocalNotifications permission
      const status = await LocalNotifications.checkPermissions();
      console.log('Current capacitor permission status:', status);
      
      if (status.display !== 'granted') {
        console.log('Requesting capacitor notification permissions...');
        const result = await LocalNotifications.requestPermissions();
        console.log('Capacitor notification permission request result:', result);
      }
    }

    // Also request browser Notification permission if on web
    if (Capacitor.getPlatform() === 'web' && 'Notification' in window) {
      try {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          console.log('Requesting browser notification permissions...');
          const browserResult = await Notification.requestPermission();
          console.log('Browser notification permission result:', browserResult);
        }
      } catch (err) {
        console.warn('Browser Notification API request failed:', err);
      }
    }
    
    // Create a high-priority channel for Android
    if (Capacitor.getPlatform() === 'android' && isPluginAvailable) {
      try {
        // Create the channel. If it exists, this updates it or does nothing.
        // Avoid deleting it every time as it can cause flickering or permission issues.
        await LocalNotifications.createChannel({
          id: 'task-reminders-high-v2',
          name: 'Срочные напоминания о задачах',
          description: 'Звуковые и всплывающие (Heads-up) уведомления о начале и завершении задач',
          importance: 5, // High importance (heads-up)
          visibility: 1, // Public (show on lock screen)
          sound: 'default',
          vibration: true,
          lights: true,
          lightColor: '#6366f1'
        });
        console.log('Notification channel v2 ensured with priority 5 (heads-up)');
      } catch (e) {
        console.error('Error creating notification channel', e);
      }
    }
    
    // Re-check status to return a definitive boolean
    let capacitorGranted = false;
    if (isPluginAvailable) {
      const finalStatus = await LocalNotifications.checkPermissions();
      capacitorGranted = finalStatus.display === 'granted';
    }
    
    const browserGranted = (
      Capacitor.getPlatform() === 'web' && 
      typeof Notification !== 'undefined' && 
      'permission' in Notification && 
      Notification.permission === 'granted'
    );
    
    return capacitorGranted || browserGranted;
  } catch (e) {
    const error = e as Error;
    if (error.message && (error.message.includes('not supported') || error.message.includes('not implemented'))) {
       console.warn('Notifications not fully supported on this platform/browser:', error.message);
    } else {
       console.warn('Optional error checking/requesting notification permissions (expected inside non-secure browser contexts):', e);
    }
    return false;
  }
};

export const showSystemNotification = async (title: string, body: string) => {
  const platform = Capacitor.getPlatform();
  const isPluginAvailable = Capacitor.isPluginAvailable('LocalNotifications');

  if (platform !== 'web' && isPluginAvailable) {
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 1000000),
            channelId: 'task-reminders-high-v2',
            sound: 'default'
          }
        ]
      });
      console.log('Mobile system notification scheduled successfully.');
      return;
    } catch (err) {
      console.warn('Native immediate notification failed, falling back to web: ', err);
    }
  }

  // Web Notification fallback
  if (!("Notification" in window)) {
    console.log("Browser does not support notifications.");
    return;
  }

  const permission = Notification.permission;
  if (permission !== "granted") {
    console.log("Notification permission not granted in browser. Current status:", permission);
    if (permission !== "denied") {
      try {
        const reqResult = await Notification.requestPermission();
        if (reqResult !== "granted") return;
      } catch (err) {
        console.warn("Could not request notification permission dynamically:", err);
        return;
      }
    } else {
      return;
    }
  }

  // Try Service Worker registration showNotification first (essential for Chrome/Safari on Tablets & Phones)
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          vibrate: [200, 100, 200],
          tag: 'schedule-pro-task',
          renotify: true
        } as any);
        console.log("Web notification displayed successfully via ServiceWorker Registration");
        return;
      }
    } catch (e) {
      console.warn("ServiceWorker showNotification failed, trying legacy constructor:", e);
    }
  }

  // Legacy constructor fallback (Desktop Chrome/Safari outside active SW runtime)
  try {
    const notif = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
    });
    console.log("Web notification displayed successfully via legacy constructor");
  } catch (e) {
    console.error("Critical: Legacy browser Notification constructor failed:", e);
  }
};

export const testNotification = async (): Promise<{ success: boolean; platform: string }> => {
  const platform = Capacitor.getPlatform();
  const hasPermission = await requestNotificationPermission();

  if (!hasPermission && platform !== 'web') {
    console.warn('Cant send native test notification on mobile: No permission');
    return { success: false, platform: 'none' };
  }

  try {
    const isPluginAvailable = Capacitor.isPluginAvailable('LocalNotifications');
    if (isPluginAvailable && platform !== 'web') {
      console.log('Attempting to send immediate notification for test...');
      
      // Schedule for 5 seconds later
      const testTime = new Date(Date.now() + 5000);
      
      await safeSchedule([
        {
          title: "Проверка уведомлений 🔔",
          body: "Если вы видите это, значит системные уведомления и планировщик работают отлично!",
          id: 12345,
          channelId: 'task-reminders-high-v2',
          sound: 'default',
          vibrate: true,
          schedule: { 
            at: testTime, 
            allowWhileIdle: true
          },
        }
      ]);
      console.log('Capacitor test notification processed');
    }

    // Comprehensive simulation for web view/previews
    if (platform === 'web') {
      console.log('Structuring visual fallback simulation timer for web browser standard iframe...');
      setTimeout(() => {
        try {
          if ((window as any)._onTestNotificationReceived) {
            (window as any)._onTestNotificationReceived();
          }
        } catch (err) {
          console.warn('Simulated notification listener failed:', err);
        }
      }, 5000);

      // Trigger standard browser Notification system as extra bonus if they actually granted permission
      if ('Notification' in window && Notification.permission === 'granted') {
        setTimeout(() => {
          try {
            new Notification("Проверка (Браузер) 🔔", {
              body: "Уведомления браузера тоже работают!",
            });
          } catch (err) {
            console.warn('Constructing browser Notification failed, trying ServiceWorker... ', err);
            // Fallback to service worker notification if available
            navigator.serviceWorker?.ready.then(registration => {
              registration.showNotification("Проверка (Браузер/PWA) 🔔", {
                body: "Уведомления PWA работают успешно!",
                tag: 'test'
              }).catch(swErr => console.warn('SW notification failed:', swErr));
            });
          }
        }, 5000);
      }
      return { success: true, platform: 'web_simulation' };
    }
    return { success: true, platform };
  } catch (e) {
    console.warn('Error scheduling test notification:', e);
    return { success: false, platform };
  }
};

export const scheduleTaskNotifications = async (tasks: ScheduleTask[]) => {
  const isPluginAvailable = Capacitor.isPluginAvailable('LocalNotifications');
  if (!isPluginAvailable) {
    console.log('Skipping scheduling: LocalNotifications plugin not available');
    return;
  }

  // Ensure permission and channel exist
  await requestNotificationPermission();

  // Cancel all existing notifications to avoid duplicates
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch (e) {
    console.error('Error cancelling notifications', e);
  }

  const notificationsToSchedule: any[] = [];
  const now = new Date();

  // Limit how far in the future we schedule (e.g. next 7 days) to avoid hitting system limits
  const maxFutureDate = new Date();
  maxFutureDate.setDate(maxFutureDate.getDate() + 7);

  tasks.forEach(task => {
    if (!task.notifications?.enabled) return;

    const [startH, startM] = task.startTime.split(':').map(Number);
    const [endH, endM] = task.endTime.split(':').map(Number);
    const durationStr = getDuration(task.startTime, task.endTime);

    const scheduleSingle = (idSuffix: string, h: number, m: number, title: string, body: string, dateStr?: string) => {
      const id = stringToId(task.id + idSuffix + (dateStr || ''));
      
      let scheduledTime: Date | null = null;
      if (dateStr) {
        const [y, mm, dd] = dateStr.split('-').map(Number);
        scheduledTime = new Date(y, mm - 1, dd, h, m, 0);
      }

      if (scheduledTime) {
        if (scheduledTime > now && scheduledTime < maxFutureDate) {
          notificationsToSchedule.push({
            title,
            body,
            id,
            channelId: 'task-reminders-high-v2',
            sound: 'default',
            vibrate: true,
            schedule: { 
              at: scheduledTime,
              allowWhileIdle: true
            }
          });
        }
      }
    };

    if (task.isRecurring && task.recurringDays && task.recurringDays.length > 0) {
      // For recurring tasks, we schedule individual instances for the next week
      // This is more reliable than recurring 'on' which sometimes acts up on Android with deep sleep
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dayOfWeek = d.getDay(); // 0 is Sunday
        
        if (task.recurringDays.includes(dayOfWeek)) {
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          if (task.notifications.onStart) {
            scheduleSingle('_start', startH, startM, `Начало: ${task.title}`, `Задание началось. Длительность: ${durationStr}`, dateStr);
          }
          if (task.notifications.onEnd) {
            scheduleSingle('_end', endH, endM, `Завершение: ${task.title}`, `Задание окончено. Длительность выполнения: ${durationStr}`, dateStr);
          }
          if (task.notifications.reminderMinutes > 0) {
            let remM = startM - task.notifications.reminderMinutes;
            let remH = startH;
            if (remM < 0) {
              remM += 60;
              remH -= 1;
            }
            if (remH >= 0) {
              scheduleSingle('_rem', remH, remM, `Напоминание: ${task.title}`, `Начнется через ${task.notifications.reminderMinutes} мин. Длительность: ${durationStr}`, dateStr);
            }
          }
        }
      }
    } else {
      // One-time task
      if (task.notifications.onStart) {
        scheduleSingle('_start', startH, startM, `Начало: ${task.title}`, `Задание началось. Длительность: ${durationStr}`, task.date);
      }
      if (task.notifications.onEnd) {
        scheduleSingle('_end', endH, endM, `Завершение: ${task.title}`, `Задание окончено. Длительность выполнения: ${durationStr}`, task.date);
      }
      if (task.notifications.reminderMinutes > 0) {
        let remM = startM - task.notifications.reminderMinutes;
        let remH = startH;
        if (remM < 0) {
          remM += 60;
          remH -= 1;
        }
        if (remH >= 0) {
          scheduleSingle('_rem', remH, remM, `Напоминание: ${task.title}`, `Начнется через ${task.notifications.reminderMinutes} мин. Длительность: ${durationStr}`, task.date);
        }
      }
    }
  });

  if (notificationsToSchedule.length > 0) {
    try {
      // Sort and take top 100 to avoid any weirdness with large arrays
      const sorted = notificationsToSchedule
        .sort((a, b) => a.schedule.at.getTime() - b.schedule.at.getTime())
        .slice(0, 100);

      console.log(`Scheduling ${sorted.length} notifications...`);
      await safeSchedule(sorted);
      console.log(`Successfully processed scheduling for ${sorted.length} notifications`);
    } catch (e) {
      console.error('CRITICAL: Error scheduling notifications:', e);
      
      // If it failed because of channel or permissions, try re-requesting
      if (JSON.stringify(e).includes('permission') || JSON.stringify(e).includes('channel')) {
        await requestNotificationPermission();
      }
    }
  } else {
    console.log('No notifications to schedule');
  }
};
