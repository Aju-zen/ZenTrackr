import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { NotificationService } from "../services/notifications";

const Settings = () => {
  const [pin, setPin] = useState("");
  const [showPinInput, setShowPinInput] = useState(false);
  const [deleteType, setDeleteType] = useState("");
  const [notification, setNotification] = useState("");
  const [notificationPermission, setNotificationPermission] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission === 'granted');
    }
  }, []);

  const enableNotifications = async () => {
    const granted = await NotificationService.requestPermission();
    setNotificationPermission(granted);
    if (granted) {
      NotificationService.showNotification('🎉 Notifications Enabled!', 'You\'ll now receive reminders for your weight tracking goals');
    }
  };

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(""), 3000);
  };

  const handleDeleteRequest = (type) => {
    setDeleteType(type);
    setShowPinInput(true);
    setPin("");
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    
    if (pin !== "1071") {
      showNotification("Incorrect PIN", "error");
      setPin("");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (deleteType === "daily_entries") {
        let query = supabase.from("daily_entries").delete().neq("id", 0);
        if (user && user.email !== 'admin') {
          query = query.eq('user_id', user.id);
        }
        const { error } = await query;
        if (error) throw error;
        showNotification("All daily entries deleted successfully");
      } else if (deleteType === "weekly_targets") {
        let query = supabase.from("weekly_targets").delete().neq("id", 0);
        if (user && user.email !== 'admin') {
          query = query.eq('user_id', user.id);
        }
        const { error } = await query;
        if (error) throw error;
        showNotification("All weekly targets deleted successfully");
      } else if (deleteType === "progress_photos") {
        // Delete from database
        let dbQuery = supabase.from("progress_photos").delete().neq("id", 0);
        if (user && user.email !== 'admin') {
          dbQuery = dbQuery.eq('user_id', user.id);
        }
        const { error: dbError } = await dbQuery;
        if (dbError) throw dbError;
        
        // For admin, delete all photos from storage; for users, only their photos
        if (user && user.email === 'admin') {
          const { data: files } = await supabase.storage.from('progress-photos').list();
          if (files && files.length > 0) {
            const filePaths = files.map(file => file.name);
            await supabase.storage.from('progress-photos').remove(filePaths);
          }
        }
        
        showNotification("All progress photos deleted successfully");
      } else if (deleteType === "body_measurements") {
        let query = supabase.from("body_measurements").delete().neq("id", 0);
        if (user && user.email !== 'admin') {
          query = query.eq('user_id', user.id);
        }
        const { error } = await query;
        if (error) throw error;
        showNotification("All body measurements deleted successfully");
      } else if (deleteType === "all_data") {
        if (user && user.email !== 'admin') {
          await supabase.from("daily_entries").delete().eq('user_id', user.id);
          await supabase.from("weekly_targets").delete().eq('user_id', user.id);
          await supabase.from("reminders").delete().eq('user_id', user.id);
          await supabase.from("progress_photos").delete().eq('user_id', user.id);
          await supabase.from("body_measurements").delete().eq('user_id', user.id);
        } else {
          await supabase.from("daily_entries").delete().neq("id", 0);
          await supabase.from("weekly_targets").delete().neq("id", 0);
          await supabase.from("reminders").delete().neq("id", 0);
          await supabase.from("progress_photos").delete().neq("id", 0);
          await supabase.from("body_measurements").delete().neq("id", 0);
          
          // Delete all photos from storage (admin only)
          const { data: files } = await supabase.storage.from('progress-photos').list();
          if (files && files.length > 0) {
            const filePaths = files.map(file => file.name);
            await supabase.storage.from('progress-photos').remove(filePaths);
          }
        }
        
        showNotification("All data deleted successfully");
      }
    } catch (error) {
      showNotification("Error deleting data: " + error.message, "error");
    }

    setShowPinInput(false);
    setPin("");
    setDeleteType("");
  };

  const handleCancel = () => {
    setShowPinInput(false);
    setPin("");
    setDeleteType("");
  };

  return (
    <div>
      <h2 className="page-title">⚙️ Settings</h2>
      <div className="card">
        <h2>🔔 Notifications</h2>
        {!notificationPermission ? (
          <div>
            <div className="metric-row">
              <span className="metric-label">Push Notifications</span>
              <span className="metric-value" style={{color: '#ef4444'}}>Disabled</span>
            </div>
            <div style={{textAlign: 'center', marginTop: '20px'}}>
              <button className="btn" onClick={enableNotifications}>
                🔔 Enable Notifications
              </button>
            </div>
            <div style={{color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginTop: '15px', textAlign: 'center'}}>
              Get reminders for your daily tracking and weekly goals
            </div>
          </div>
        ) : (
          <div>
            <div className="metric-row">
              <span className="metric-label">Push Notifications</span>
              <span className="metric-value" style={{color: '#22c55e'}}>✅ Enabled</span>
            </div>
            <div style={{color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', marginTop: '15px', textAlign: 'center'}}>
              You'll receive notifications for your reminders and daily tracking
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>⚙️ Settings</h2>
        
        {notification && (
          <div className={`notification ${notification.type === 'success' ? 'show' : 'show error'}`}>
            {notification.message}
          </div>
        )}

        <div style={{ marginBottom: "30px" }}>
          <h3 style={{ color: "#ffffff", marginBottom: "20px" }}>🗑️ Data Management</h3>
          <p style={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: "20px", fontSize: "14px" }}>
            Warning: These actions cannot be undone. PIN required for security.
          </p>
          
          <div className="stats-grid">
            <div className="form-group">
              <button 
                className="btn btn-danger" 
                onClick={() => handleDeleteRequest("daily_entries")}
                style={{ width: "100%", background: "linear-gradient(145deg, #dc2626, #b91c1c)" }}
              >
                🗑️ Delete Daily Entries
              </button>
            </div>
            
            <div className="form-group">
              <button 
                className="btn btn-danger" 
                onClick={() => handleDeleteRequest("weekly_targets")}
                style={{ width: "100%", background: "linear-gradient(145deg, #dc2626, #b91c1c)" }}
              >
                🗑️ Delete Weekly Targets
              </button>
            </div>
            
            <div className="form-group">
              <button 
                className="btn btn-danger" 
                onClick={() => handleDeleteRequest("progress_photos")}
                style={{ width: "100%", background: "linear-gradient(145deg, #dc2626, #b91c1c)" }}
              >
                🗑️ Delete Progress Photos
              </button>
            </div>
            
            <div className="form-group">
              <button 
                className="btn btn-danger" 
                onClick={() => handleDeleteRequest("body_measurements")}
                style={{ width: "100%", background: "linear-gradient(145deg, #dc2626, #b91c1c)" }}
              >
                🗑️ Delete Body Measurements
              </button>
            </div>
            
            <div className="form-group">
              <button 
                className="btn btn-danger" 
                onClick={() => handleDeleteRequest("all_data")}
                style={{ width: "100%", background: "linear-gradient(145deg, #dc2626, #b91c1c)" }}
              >
                🗑️ Delete All Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPinInput && (
        <div className="pin-modal">
          <div className="pin-content">
            <h3 style={{ color: "#ffffff", marginBottom: "20px" }}>🔒 Enter PIN</h3>
            <p style={{ color: "rgba(255, 255, 255, 0.7)", marginBottom: "20px" }}>
              Enter PIN to confirm deletion of {deleteType.replace("_", " ")}
            </p>
            
            <form onSubmit={handlePinSubmit}>
              <div className="form-group">
                <input
                  type="password"
                  placeholder="Enter 4-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength="4"
                  style={{ textAlign: "center", fontSize: "18px", letterSpacing: "4px" }}
                  autoFocus
                />
              </div>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" className="btn" style={{ flex: 1 }}>
                  Confirm Delete
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCancel}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;