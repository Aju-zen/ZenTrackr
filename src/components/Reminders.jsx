import { useState, useEffect } from "react";
import { addReminder, getReminders, updateReminder, deleteReminder } from "../services/supabase";
import { NotificationService } from "../services/notifications";

export default function Reminders() {
  const [form, setForm] = useState({ 
    days: [],
    message: ""
  });
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [completedReminders, setCompletedReminders] = useState([]);

  useEffect(() => {
    fetchReminders();
  }, []);

  const fetchReminders = async () => {
    try {
      const data = await getReminders();
      setReminders(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const reminderData = {
        day: parseInt(form.days[0]),
        days: form.days.join(','),
        message: form.message,
        is_active: true
      };
      
      if (editingId) {
        await updateReminder(editingId, reminderData);
        setEditingId(null);
      } else {
        await addReminder(reminderData);
      }
      
      setForm({ 
        days: [],
        message: ""
      });
      await fetchReminders();
    } catch (error) {
      console.error("Error saving reminder:", error);
      alert("Error saving reminder: " + error.message);
    }
  };

  const handleEdit = (reminder) => {
    setForm({
      days: reminder.days ? reminder.days.split(',') : [reminder.day?.toString()].filter(Boolean),
      message: reminder.message
    });
    setEditingId(reminder.id);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      try {
        await deleteReminder(id);
        await fetchReminders();
      } catch (error) {
        console.error("Error deleting reminder:", error);
        alert("Error deleting reminder: " + error.message);
      }
    }
  };

  const handleCancel = () => {
    setForm({ 
      days: [],
      message: ""
    });
    setEditingId(null);
  };

  const handleDayToggle = (dayValue) => {
    setForm(prev => ({
      ...prev,
      days: (prev.days || []).includes(dayValue) 
        ? (prev.days || []).filter(d => d !== dayValue)
        : [...(prev.days || []), dayValue]
    }));
  };

  const getDayName = (dayNum) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayNum];
  };



  const today = new Date().toISOString().split("T")[0];
  const todayDay = new Date().getDay();
  const completedKey = `completed_reminders_${today}`;
  const completedIds = JSON.parse(localStorage.getItem(completedKey) || '[]');
  
  const activeReminders = reminders.filter(rem => rem.is_active !== false);
  const inactiveReminders = reminders.filter(rem => rem.is_active === false);
  const todayCompletedReminders = activeReminders.filter(rem => {
    const reminderDays = rem.days ? rem.days.split(',').map(d => parseInt(d)) : [rem.day];
    return reminderDays.includes(todayDay) && completedIds.includes(rem.id);
  });

  const handleUncomplete = (reminderId) => {
    const completed = JSON.parse(localStorage.getItem(completedKey) || '[]');
    const updated = completed.filter(id => id !== reminderId);
    localStorage.setItem(completedKey, JSON.stringify(updated));
    // Force re-render by updating state
    setCompletedReminders(prev => prev.filter(id => id !== reminderId));
  };

  if (loading) return <div className="loading">Loading reminders...</div>;

  return (
    <div>
      <h2 className="page-title">Reminders</h2>
      <div className="card">
        <h2>{editingId ? '✏️ Edit Reminder' : '🔔 Set Reminder'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Days of Week</label>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '10px'}}>
              {[
                {value: '0', label: 'Sunday'},
                {value: '1', label: 'Monday'},
                {value: '2', label: 'Tuesday'},
                {value: '3', label: 'Wednesday'},
                {value: '4', label: 'Thursday'},
                {value: '5', label: 'Friday'},
                {value: '6', label: 'Saturday'}
              ].map(day => (
                <label key={day.value} className="checkbox-label" style={{paddingLeft: '35px'}}>
                  <input 
                    type="checkbox" 
                    checked={(form.days || []).includes(day.value)}
                    onChange={() => handleDayToggle(day.value)}
                  />
                  <span className="checkmark"></span>
                  {day.label}
                </label>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label>Message</label>
            <input 
              type="text" 
              name="message" 
              placeholder="e.g. Check weight, Take measurements, Gym session" 
              value={form.message} 
              onChange={handleChange} 
              required 
            />
          </div>


          
          <div style={{textAlign: 'center', marginTop: '20px'}}>
            <button type="submit" className="btn">
              {editingId ? '✏️ Update Reminder' : 'Save Reminder'}
            </button>
            {editingId && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCancel}
                style={{marginLeft: '10px'}}
              >
                ❌ Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {activeReminders.length > 0 && (
        <div className="card">
          <h3>📅 Active Reminders</h3>
          <div className="reminders-list">
            {activeReminders.map((rem) => {
              const reminderDays = rem.days ? rem.days.split(',').map(d => parseInt(d)) : [rem.day];
              const dayNames = reminderDays.map(d => getDayName(d)).join(', ');
              return (
              <div key={rem.id} className="reminder-item active">
                <div className="reminder-info">
                  <div className="reminder-day">{dayNames}</div>
                  <div className="reminder-message">{rem.message}</div>
                </div>
                <div className="reminder-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => handleEdit(rem)}
                    style={{marginRight: '5px', padding: '5px 10px', fontSize: '12px'}}
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-secondary" 
                    onClick={() => handleDelete(rem.id)}
                    style={{padding: '5px 10px', fontSize: '12px', background: '#dc2626'}}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {todayCompletedReminders.length > 0 && (
        <div className="card">
          <h3>✅ Completed Today</h3>
          <div className="reminders-list">
            {todayCompletedReminders.map((rem) => (
              <div key={rem.id} className="reminder-item" style={{opacity: 0.7}}>
                <div className="reminder-info">
                  <div className="reminder-day">{getDayName(rem.day)}</div>
                  <div className="reminder-message" style={{textDecoration: 'line-through'}}>{rem.message}</div>
                </div>
                <div className="reminder-actions">
                  <button 
                    className="btn-secondary" 
                    onClick={() => handleUncomplete(rem.id)}
                    style={{padding: '5px 10px', fontSize: '12px', background: '#22c55e'}}
                  >
                    ↩️ Undo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {inactiveReminders.length > 0 && (
        <div className="card">
          <h3>📋 Inactive Reminders</h3>
          <div className="reminders-list">
            {inactiveReminders.slice(0, 3).map((rem) => (
              <div key={rem.id} className="reminder-item inactive">
                <div className="reminder-info">
                  <div className="reminder-day">{getDayName(rem.day)}</div>
                  <div className="reminder-message">{rem.message}</div>
                </div>
              </div>
            ))}
            {inactiveReminders.length > 3 && (
              <div className="reminder-item">
                <div className="reminder-message" style={{textAlign: 'center', opacity: 0.6}}>+{inactiveReminders.length - 3} more inactive</div>
              </div>
            )}
          </div>
        </div>
      )}

      {reminders.length === 0 && (
        <div className="card">
          <div className="no-data">
            <p>No weekly reminders set yet.</p>
            <p>Create recurring reminders for your fitness goals!</p>
          </div>
        </div>
      )}
    </div>
  );
}
