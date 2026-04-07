import { supabase } from './supabase';
import { NotificationService } from './notifications';

export class ReminderChecker {
  static startChecking() {
    // Check every minute
    setInterval(() => {
      this.checkReminders();
    }, 60000);
    
    // Check immediately
    this.checkReminders();
  }

  static async checkReminders() {
    try {
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const today = now.toISOString().split('T')[0];

      // Get today's reminders
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_active', true)
        .eq('send_notification', true);

      if (!reminders) return;

      // Check completed reminders
      const completedKey = `completed_reminders_${today}`;
      const completed = JSON.parse(localStorage.getItem(completedKey) || '[]');
      
      // Check sent notifications today
      const sentKey = `sent_notifications_${today}`;
      const sent = JSON.parse(localStorage.getItem(sentKey) || '[]');

      reminders.forEach(reminder => {
        // Check if reminder applies to today
        const reminderDays = reminder.days ? 
          reminder.days.split(',').map(d => parseInt(d)) : 
          [reminder.day];
        
        if (!reminderDays.includes(currentDay)) return;
        
        // Skip if already completed or notification already sent today
        if (completed.includes(reminder.id) || sent.includes(reminder.id)) return;
        
        // Check if it's time for this reminder
        if (reminder.notification_time === currentTime) {
          NotificationService.showNotification(
            '⏰ Reminder',
            reminder.message
          );
          
          // Mark as sent today
          sent.push(reminder.id);
          localStorage.setItem(sentKey, JSON.stringify(sent));
        }
      });
    } catch (error) {
      console.error('Error checking reminders:', error);
    }
  }
}