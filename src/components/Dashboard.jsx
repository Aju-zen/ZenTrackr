import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, updateReminder } from "../services/supabase";

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(null);
  const [weeklyTarget, setWeeklyTarget] = useState(null);
  const [daysLeft, setDaysLeft] = useState(null);
  const [progress, setProgress] = useState(null);
  const [streak, setStreak] = useState(0);
  const [todayReminders, setTodayReminders] = useState([]);
  const [dailyQuote, setDailyQuote] = useState(null);
  const [loading, setLoading] = useState(true);

  const calculateOverallPerformance = async () => {
    const { data: allEntries } = await supabase
      .from("daily_entries")
      .select("*")
      .order("entry_date");

    const { data: allTargets } = await supabase
      .from("weekly_targets")
      .select("*")
      .order("week_number");

    if (!allEntries || !allTargets || allEntries.length === 0) {
      return { score: 0, status: "No Data", message: "Start tracking to see your performance!" };
    }

    let totalScore = 0;
    let validDays = 0;

    allEntries.forEach(entry => {
      const entryDate = entry.entry_date;
      const target = allTargets.find(t => entryDate >= t.start_date && entryDate <= t.end_date);
      
      if (target && entry.calories && entry.protein && entry.carbs && entry.fat) {
        let dayScore = 0;
        
        // Score each nutrient (0-25 points each)
        const calScore = entry.calories >= target.target_calories_min && entry.calories <= target.target_calories_max ? 25 : 0;
        const proScore = entry.protein >= target.target_protein_min && entry.protein <= target.target_protein_max ? 25 : 0;
        const carbScore = entry.carbs >= target.target_carbs_min && entry.carbs <= target.target_carbs_max ? 25 : 0;
        const fatScore = entry.fat >= target.target_fat_min && entry.fat <= target.target_fat_max ? 25 : 0;
        
        dayScore = calScore + proScore + carbScore + fatScore;
        totalScore += dayScore;
        validDays++;
      }
    });

    const avgScore = validDays > 0 ? (totalScore / validDays) : 0;
    
    let status, message, color;
    if (avgScore >= 80) {
      status = "Excellent";
      message = "You're crushing your goals! Keep it up!";
      color = "#22c55e";
    } else if (avgScore >= 60) {
      status = "Good";
      message = "Great progress! Small improvements will make you excellent.";
      color = "#eab308";
    } else if (avgScore >= 40) {
      status = "Fair";
      message = "You're on track. Focus on consistency for better results.";
      color = "#f97316";
    } else {
      status = "Needs Improvement";
      message = "Don't give up! Every small step counts towards your goal.";
      color = "#ef4444";
    }

    return { score: Math.round(avgScore), status, message, color, totalDays: validDays };
  };

  const calculateStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let entriesQuery = supabase
        .from("daily_entries")
        .select("*")
        .order("entry_date", { ascending: false });
      
      if (user && user.email !== 'admin') {
        entriesQuery = entriesQuery.eq('user_id', user.id);
      }
      
      const { data: entries } = await entriesQuery;
      
      let targetsQuery = supabase
        .from("weekly_targets")
        .select("*")
        .order("week_number", { ascending: true });
      
      if (user && user.email !== 'admin') {
        targetsQuery = targetsQuery.eq('user_id', user.id);
      }
      
      const { data: targets } = await targetsQuery;
      
      if (!entries || !targets || entries.length === 0 || targets.length === 0) {
        setStreak(0);
        return;
      }
      
      let currentStreak = 0;
      const today = new Date();
      
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const entry = entries.find(e => e.entry_date === dateStr);
        const target = targets.find(t => dateStr >= t.start_date && dateStr <= t.end_date);
        
        if (!entry || !target || !entry.calories) {
          break;
        }
        
        const goalType = target.goal_type || 'bulking';
        let inRange = true;
        
        if (goalType === 'bulking') {
          inRange = inRange && entry.calories >= target.target_calories_min;
        } else {
          inRange = inRange && entry.calories >= target.target_calories_min && entry.calories <= target.target_calories_max;
        }
        
        if (entry.protein) {
          inRange = inRange && entry.protein >= target.target_protein_min;
        }
        
        if (entry.carbs && goalType === 'weight_loss') {
          inRange = inRange && entry.carbs >= target.target_carbs_min && entry.carbs <= target.target_carbs_max;
        } else if (entry.carbs && goalType === 'bulking') {
          inRange = inRange && entry.carbs >= target.target_carbs_min;
        }
        
        if (entry.fat) {
          inRange = inRange && entry.fat >= target.target_fat_min && entry.fat <= target.target_fat_max;
        }
        
        if (inRange) {
          currentStreak++;
        } else {
          break;
        }
      }
      
      setStreak(currentStreak);
    } catch (error) {
      console.error('Error calculating streak:', error);
      setStreak(0);
    }
  };

  const getBadges = () => {
    const badges = [
      { name: 'Kickstart', days: 10, filename: 'kickstart.png' },
      { name: 'Beast', days: 30, filename: 'beast.png' },
      { name: 'Conqueror', days: 60, filename: 'conqueror.png' },
      { name: 'Unstoppable', days: 100, filename: 'unstoppable.png' }
    ];
    
    return badges.map((badge, index) => {
      const unlocked = streak >= badge.days;
      let statusText = `${badge.days} Days`;
      
      if (!unlocked) {
        if (index === 0 || streak >= badges[index - 1].days) {
          // Next badge to unlock
          const daysLeft = badge.days - streak;
          statusText = `${daysLeft} days left`;
        } else {
          // Future badge - need previous badge first
          const previousBadge = badges[index - 1];
          statusText = `Unlock "${previousBadge.name}" to gain access`;
        }
      }
      
      return {
        ...badge,
        unlocked,
        statusText
      };
    });
  };

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const todayDay = new Date().getDay();
      console.log("Today's date for dashboard:", today);

      // Get user for authentication
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch today's reminders with user filtering
      let remindersQuery = supabase
        .from("reminders")
        .select("*")
        .eq("is_active", true);
      
      // Filter by user_id for regular users
      if (user && user.email !== 'admin') {
        remindersQuery = remindersQuery.eq('user_id', user.id);
      }
      
      const { data: allReminders } = await remindersQuery;
      
      // Filter reminders that include today
      const remindersData = (allReminders || []).filter(rem => {
        const reminderDays = rem.days ? rem.days.split(',').map(d => parseInt(d)) : [rem.day];
        return reminderDays.includes(todayDay);
      });
      
      // Filter out completed reminders
      const completedKey = `completed_reminders_${today}`;
      const completed = JSON.parse(localStorage.getItem(completedKey) || '[]');
      const pendingReminders = remindersData.filter(r => !completed.includes(r.id));
      
      setTodayReminders(pendingReminders);

      // Fetch daily quote (cycle through 120 quotes based on day of year)
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
      const quoteId = (dayOfYear % 120) + 1;
      
      const { data: quoteData } = await supabase
        .from("quotes")
        .select("text")
        .eq("id", quoteId)
        .single();
      
      setDailyQuote(quoteData?.text);

      // Calculate overall performance
      const performance = await calculateOverallPerformance();
      setProgress(performance);
      
      // Calculate streak
      await calculateStreak();
      
      // Fetch current week with user filtering
      let weekQuery = supabase
        .from("weekly_targets")
        .select("*")
        .lte("start_date", today)
        .gte("end_date", today)
        .order("week_number", { ascending: true })
        .limit(1);
      
      // Filter by user_id for regular users
      if (user && user.email !== 'admin') {
        weekQuery = weekQuery.eq('user_id', user.id);
      }
      
      const { data: weekData, error: weekError } = await weekQuery;

      console.log("Week data returned:", weekData);
      console.log("Week error:", weekError);
      
      // If no current week found, get the closest week
      if (!weekData || weekData.length === 0) {
        console.log("No current week found, fetching all weeks for debugging");
        let allWeeksQuery = supabase
          .from("weekly_targets")
          .select("*")
          .order("week_number", { ascending: true });
        
        // Filter by user_id for regular users
        if (user && user.email !== 'admin') {
          allWeeksQuery = allWeeksQuery.eq('user_id', user.id);
        }
        
        const { data: allWeeks } = await allWeeksQuery;
        console.log("All weeks in database:", allWeeks);
        
        if (allWeeks && allWeeks.length > 0) {
          // Use the first week as fallback
          setCurrentWeek(allWeeks[0].week_number);
          setWeeklyTarget(allWeeks[0]);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setCurrentWeek(weekData[0].week_number);
        setWeeklyTarget(weekData[0]);
      }

      // Days left in full program
      let endDateQuery = supabase
        .from("weekly_targets")
        .select("end_date")
        .order("week_number", { ascending: false })
        .limit(1);
      
      // Filter by user_id for regular users
      if (user && user.email !== 'admin') {
        endDateQuery = endDateQuery.eq('user_id', user.id);
      }
      
      const { data: allWeeks } = await endDateQuery;

      if (allWeeks && allWeeks.length > 0) {
        const endDate = new Date(allWeeks[0].end_date);
        const todayDate = new Date();
        const diffTime = endDate - todayDate;
        setDaysLeft(Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))));
      }



      setLoading(false);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setLoading(false);
    }
  };

  const handleReminderComplete = async (reminderId) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const completedKey = `completed_reminders_${today}`;
      const completed = JSON.parse(localStorage.getItem(completedKey) || '[]');
      completed.push(reminderId);
      localStorage.setItem(completedKey, JSON.stringify(completed));
      
      // Hide reminder from dashboard
      setTodayReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (error) {
      console.error("Error completing reminder:", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!weeklyTarget) {
    return (
      <div className="card">
        <div className="no-data">
          <p>No weekly targets found for this week.</p>
          <p>Please set up your weekly targets first in the "Weekly Targets" section.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">Dashboard</h2>
      {dailyQuote && (
        <div style={{ 
          textAlign: 'center', 
          fontStyle: 'italic', 
          fontSize: '18px', 
          color: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          marginBottom: '20px',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          "{dailyQuote}"
        </div>
      )}

      <div className="card">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{currentWeek}</div>
            <div className="stat-label">Week</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{daysLeft}</div>
            <div className="stat-label">Days Left</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: streak >= 7 ? '#22c55e' : streak >= 3 ? '#eab308' : '#ffffff' }}>
              {streak} 🔥
            </div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>
        
        <div className="stats-grid" style={{marginTop: '20px'}}>
          <button className="btn" onClick={() => navigate('/daily')}>
            Track Today
          </button>
          <button className="btn" onClick={() => navigate('/analytics')}>
            Analytics
          </button>
        </div>
      </div>

      <div className="card">
        <h3>🏆 Badges</h3>
        <div className="badges-grid">
          {getBadges().map((badge, index) => (
            <div key={index} className={`badge-item ${badge.unlocked ? 'unlocked' : 'locked'}`}>
              <img 
                src={`/badges/${badge.filename}`} 
                alt={badge.name}
                className="badge-image"
                style={{ opacity: badge.unlocked ? 1 : 0.3 }}
              />
              <div className="badge-name">{badge.name}</div>
              <div className="badge-days">{badge.statusText}</div>
            </div>
          ))}
        </div>
      </div>

      {todayReminders.length > 0 && (
        <div className="card">
          <h3>🔔 Today's Reminders</h3>
          <div className="reminders-list">
            {todayReminders.map((reminder) => (
              <div key={reminder.id} className="reminder-item active" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                <div className="reminder-info" style={{flex: 1}}>
                  <div className="reminder-message">{reminder.message}</div>
                </div>
                <div className="reminder-checkbox">
                  <input 
                    type="checkbox" 
                    onChange={() => handleReminderComplete(reminder.id)}
                    style={{transform: 'scale(1.2)', cursor: 'pointer'}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {progress && (
        <div className="card">
          <div className="performance-container">
            <div className="performance-score">
              <div className="score-circle" style={{ borderColor: progress.color, background: `linear-gradient(145deg, ${progress.color}20, ${progress.color}10)` }}>
                <div className="score-value" style={{ color: progress.color }}>
                  {progress.score >= 80 ? '🔥' : progress.score >= 60 ? '💪' : progress.score >= 40 ? '⚡' : '🎯'}
                </div>
              </div>
            </div>
            <div className="performance-details">
              <div className="performance-status" style={{ color: progress.color }}>
                {progress.status}
              </div>
              <div className="performance-message">
                {progress.message}
              </div>
              <div className="performance-stats">
                Based on {progress.totalDays} days of tracking
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;