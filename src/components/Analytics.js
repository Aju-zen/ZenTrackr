import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const Analytics = () => {
  const [viewType, setViewType] = useState("daily");
  const [data, setData] = useState(null);
  const [targets, setTargets] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [viewType]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    setLoading(true);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    try {
      if (viewType === "daily") {
        await fetchDailyAnalytics(today);
      } else if (viewType === "weekly") {
        await fetchWeeklyAnalytics(today);
      } else if (viewType === "body") {
        await fetchBodyAnalytics();
      } else {
        await fetchFullAnalytics();
      }
    } catch (error) {
      console.error("Analytics fetch error:", error);
    }
    setLoading(false);
  };

  const fetchDailyAnalytics = async (today) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    let entryQuery = supabase
      .from("daily_entries")
      .select("*")
      .eq("entry_date", today);
    
    if (user && user.email !== 'admin') {
      entryQuery = entryQuery.eq('user_id', user.id);
    }
    
    const { data: entryData } = await entryQuery.single();

    let weekQuery = supabase
      .from("weekly_targets")
      .select("*")
      .lte("start_date", today)
      .gte("end_date", today);
    
    if (user && user.email !== 'admin') {
      weekQuery = weekQuery.eq('user_id', user.id);
    }
    
    const { data: weekData } = await weekQuery.single();

    setData(entryData);
    setTargets(weekData);
  };

  const fetchWeeklyAnalytics = async (today) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    let weekQuery = supabase
      .from("weekly_targets")
      .select("*")
      .lte("start_date", today)
      .gte("end_date", today);
    
    if (user && user.email !== 'admin') {
      weekQuery = weekQuery.eq('user_id', user.id);
    }
    
    const { data: weekData } = await weekQuery.single();

    if (weekData) {
      let entriesQuery = supabase
        .from("daily_entries")
        .select("*")
        .gte("entry_date", weekData.start_date)
        .lte("entry_date", weekData.end_date)
        .order("entry_date");
      
      if (user && user.email !== 'admin') {
        entriesQuery = entriesQuery.eq('user_id', user.id);
      }
      
      const { data: entries } = await entriesQuery;

      const avgData = calculateAverages(entries);
      setData({ ...avgData, entries, weekData });
      setTargets(weekData);
    }
  };

  const fetchFullAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    let entriesQuery = supabase
      .from("daily_entries")
      .select("*")
      .order("entry_date");
    
    if (user && user.email !== 'admin') {
      entriesQuery = entriesQuery.eq('user_id', user.id);
    }
    
    const { data: allEntries } = await entriesQuery;

    let targetsQuery = supabase
      .from("weekly_targets")
      .select("*")
      .order("week_number");
    
    if (user && user.email !== 'admin') {
      targetsQuery = targetsQuery.eq('user_id', user.id);
    }
    
    const { data: allTargets } = await targetsQuery;

    const cumulativeData = calculateCumulativeTotals(allEntries);
    setData({ ...cumulativeData, entries: allEntries, allTargets });
    setTargets(allTargets?.[0]);
  };

  const fetchBodyAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch weight data
    let weightQuery = supabase
      .from("daily_entries")
      .select("entry_date, weight")
      .not("weight", "is", null)
      .order("entry_date");
    
    if (user && user.email !== 'admin') {
      weightQuery = weightQuery.eq('user_id', user.id);
    }
    
    const { data: weightEntries } = await weightQuery;

    // Fetch measurements data
    let measurementQuery = supabase
      .from("body_measurements")
      .select("*")
      .order("measurement_date");
    
    if (user && user.email !== 'admin') {
      measurementQuery = measurementQuery.eq('user_id', user.id);
    }
    
    const { data: measurementEntries } = await measurementQuery;

    let bodyData = { weightData: [], measurementData: [] };

    // Process weight data
    if (weightEntries && weightEntries.length > 0) {
      const weightData = weightEntries.map(entry => ({
        date: entry.entry_date,
        weight: parseFloat(entry.weight)
      }));

      const startWeight = weightData[0].weight;
      const currentWeight = weightData[weightData.length - 1].weight;
      const totalChange = currentWeight - startWeight;
      
      bodyData.weightData = weightData;
      bodyData.startWeight = startWeight;
      bodyData.currentWeight = currentWeight;
      bodyData.totalChange = totalChange.toFixed(1);
    }

    // Process measurements data
    if (measurementEntries && measurementEntries.length > 0) {
      bodyData.measurementData = measurementEntries;
    }

    setData(bodyData);
    setTargets(null);
  };

  // eslint-disable-next-line no-unused-vars
  const fetchBodyWeightAnalytics = async () => {
    const { data: allEntries } = await supabase
      .from("daily_entries")
      .select("entry_date, weight")
      .not("weight", "is", null)
      .order("entry_date");

    if (allEntries && allEntries.length > 0) {
      const weightData = allEntries.map(entry => ({
        date: entry.entry_date,
        weight: parseFloat(entry.weight)
      }));

      const startWeight = weightData[0].weight;
      const currentWeight = weightData[weightData.length - 1].weight;
      const totalChange = currentWeight - startWeight;
      const avgWeight = (weightData.reduce((sum, entry) => sum + entry.weight, 0) / weightData.length).toFixed(1);
      
      // Calculate weekly changes
      const weeklyChanges = [];
      for (let i = 1; i < weightData.length; i++) {
        const change = weightData[i].weight - weightData[i-1].weight;
        weeklyChanges.push(change);
      }
      
      const avgWeeklyChange = weeklyChanges.length > 0 ? 
        (weeklyChanges.reduce((sum, change) => sum + change, 0) / weeklyChanges.length).toFixed(2) : 0;
      
      // Determine trend
      let trend, trendColor;
      if (totalChange > 1) {
        trend = "Gaining Weight";
        trendColor = "#22c55e";
      } else if (totalChange < -1) {
        trend = "Losing Weight";
        trendColor = "#ef4444";
      } else {
        trend = "Maintaining Weight";
        trendColor = "#eab308";
      }

      setData({
        weightData,
        startWeight,
        currentWeight,
        totalChange: totalChange.toFixed(1),
        avgWeight,
        avgWeeklyChange,
        trend,
        trendColor,
        totalDays: weightData.length
      });
    } else {
      setData(null);
    }
    setTargets(null);
  };

  const calculateAverages = (entries) => {
    if (!entries || entries.length === 0) return null;
    
    const totals = entries.reduce((acc, entry) => ({
      weight: acc.weight + (entry.weight || 0),
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein || 0),
      carbs: acc.carbs + (entry.carbs || 0),
      fat: acc.fat + (entry.fat || 0)
    }), { weight: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      avgWeight: (totals.weight / entries.length).toFixed(1),
      avgCalories: (totals.calories / entries.length).toFixed(0),
      avgProtein: (totals.protein / entries.length).toFixed(1),
      avgCarbs: (totals.carbs / entries.length).toFixed(1),
      avgFat: (totals.fat / entries.length).toFixed(1),
      totalDays: entries.length
    };
  };

  const calculateCumulativeTotals = (entries) => {
    if (!entries || entries.length === 0) return null;
    
    const totals = entries.reduce((acc, entry) => ({
      weight: acc.weight + (entry.weight || 0),
      calories: acc.calories + (entry.calories || 0),
      protein: acc.protein + (entry.protein || 0),
      carbs: acc.carbs + (entry.carbs || 0),
      fat: acc.fat + (entry.fat || 0)
    }), { weight: 0, calories: 0, protein: 0, carbs: 0, fat: 0 });

    return {
      avgWeight: (totals.weight / entries.length).toFixed(1),
      calories: totals.calories.toFixed(0),
      protein: totals.protein.toFixed(1),
      carbs: totals.carbs.toFixed(1),
      fat: totals.fat.toFixed(1),
      totalDays: entries.length
    };
  };

  const getStatus = (value, min, max, goalType = 'bulking', nutrientType = 'calories') => {
    if (!value || !min || !max) return { status: "no-data", color: "#666" };
    
    const val = parseFloat(value);
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);
    
    if (goalType === 'bulking') {
      // Bulking: Exceeding max is good for calories, protein, carbs; bad for fat
      if (nutrientType === 'fat') {
        if (val <= minVal + (maxVal - minVal) * 0.2) return { status: "Very Good", color: "#22c55e" };
        if (val <= maxVal) return { status: "Good", color: "#eab308" };
        return { status: "Not Good", color: "#ef4444" };
      } else {
        if (val >= maxVal) return { status: "Very Good", color: "#22c55e" };
        if (val >= minVal) return { status: "Good", color: "#eab308" };
        return { status: "Not Good", color: "#ef4444" };
      }
    } else {
      // Weight Loss: Stay within range for calories, carbs, fat; exceeding max is good for protein
      if (nutrientType === 'protein') {
        if (val >= maxVal) return { status: "Very Good", color: "#22c55e" };
        if (val >= minVal) return { status: "Good", color: "#eab308" };
        return { status: "Not Good", color: "#ef4444" };
      } else {
        if (val >= minVal && val <= maxVal) return { status: "Good", color: "#eab308" };
        if (val < minVal) return { status: "Too Low", color: "#ef4444" };
        return { status: "Too High", color: "#ef4444" };
      }
    }
  };

  const ProgressBar = ({ value, min, max, goalType = 'bulking', nutrientType = 'calories' }) => {
    if (!value || !min || !max) return null;
    
    const val = parseFloat(value);
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);
    const percentage = Math.min(100, Math.max(0, ((val - minVal) / (maxVal - minVal)) * 100));
    const status = getStatus(value, min, max, goalType, nutrientType);
    
    return (
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ 
              width: `${percentage}%`, 
              background: status.color 
            }}
          />
        </div>
        <div className="progress-labels">
          <span>{min}</span>
          <span style={{ color: status.color, fontWeight: "600" }}>{value}</span>
          <span>{max}</span>
        </div>
      </div>
    );
  };

  const WeightProgress = () => {
    if (viewType === "daily") return null;
    
    if (viewType === "weekly" && data?.weekData) {
      const targetWeight = data.weekData.target_weight;
      const avgWeight = data.avgWeight;
      const weightDiff = (avgWeight - targetWeight).toFixed(1);
      const isOnTrack = Math.abs(weightDiff) <= 0.5;
      
      return (
        <div className="card">
          <h3>Weight Progress</h3>
          <div className="weight-analysis">
            <div className="weight-stat">
              <div className="stat-value">{avgWeight} kg</div>
              <div className="stat-label">Average Weight</div>
            </div>
            <div className="weight-stat">
              <div className="stat-value">{targetWeight} kg</div>
              <div className="stat-label">Target Weight</div>
            </div>
            <div className="weight-status">
              <div 
                className="status-indicator"
                style={{ 
                  color: isOnTrack ? "#22c55e" : "#ef4444",
                  fontSize: "18px",
                  fontWeight: "600"
                }}
              >
                {isOnTrack ? "✅ On Track" : weightDiff > 0 ? "⬆️ Above Target" : "⬇️ Below Target"}
              </div>
              <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px" }}>
                {weightDiff > 0 ? "+" : ""}{weightDiff} kg from target
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (viewType === "full" && data?.entries) {
      const weightEntries = data.entries.filter(e => e.weight).sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
      
      if (weightEntries.length === 0) return null;
      
      const startWeight = parseFloat(weightEntries[0].weight);
      const currentWeight = parseFloat(weightEntries[weightEntries.length - 1].weight);
      const totalChange = (currentWeight - startWeight).toFixed(1);
      const avgWeight = data.avgWeight;
      
      // Calculate weekly progress
      const weeklyChanges = [];
      for (let i = 1; i < weightEntries.length; i++) {
        const prevWeight = parseFloat(weightEntries[i-1].weight);
        const currWeight = parseFloat(weightEntries[i].weight);
        const change = currWeight - prevWeight;
        weeklyChanges.push(change);
      }
      
      const avgWeeklyChange = weeklyChanges.length > 0 ? 
        (weeklyChanges.reduce((sum, change) => sum + change, 0) / weeklyChanges.length).toFixed(2) : 0;
      
      return (
        <div className="card">
          <h3>Full Weight Progress</h3>
          <div className="weight-analysis">
            <div className="weight-stat">
              <div className="stat-value">{startWeight} kg</div>
              <div className="stat-label">Starting Weight</div>
            </div>
            <div className="weight-stat">
              <div className="stat-value">{currentWeight} kg</div>
              <div className="stat-label">Current Weight</div>
            </div>
            <div className="weight-stat">
              <div className="stat-value" style={{ color: totalChange >= 0 ? "#22c55e" : "#ef4444" }}>
                {totalChange >= 0 ? "+" : ""}{totalChange} kg
              </div>
              <div className="stat-label">Total Change</div>
            </div>
          </div>
          
          <div className="weight-analysis" style={{ marginTop: "20px" }}>
            <div className="weight-stat">
              <div className="stat-value">{avgWeight} kg</div>
              <div className="stat-label">Average Weight</div>
            </div>
            <div className="weight-stat">
              <div className="stat-value" style={{ color: avgWeeklyChange >= 0 ? "#22c55e" : "#ef4444" }}>
                {avgWeeklyChange >= 0 ? "+" : ""}{avgWeeklyChange} kg
              </div>
              <div className="stat-label">Avg Weekly Change</div>
            </div>
            <div className="weight-stat">
              <div className="stat-value">{weightEntries.length}</div>
              <div className="stat-label">Days Tracked</div>
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  if (loading) return <div className="loading">Loading analytics...</div>;

  return (
    <div>
      <h2 className="page-title">Analytics</h2>
      <div className="card">

        <div className="analytics-tabs">
          <button 
            className={viewType === "daily" ? "tab active" : "tab"}
            onClick={() => setViewType("daily")}
          >
            Today
          </button>
          <button 
            className={viewType === "weekly" ? "tab active" : "tab"}
            onClick={() => setViewType("weekly")}
          >
            This Week
          </button>
          <button 
            className={viewType === "full" ? "tab active" : "tab"}
            onClick={() => setViewType("full")}
          >
            Full Analytics
          </button>
          <button 
            className={viewType === "body" ? "tab active" : "tab"}
            onClick={() => setViewType("body")}
          >
            Body
          </button>
        </div>
      </div>

      {!data && (
        <div className="card">
          <div className="no-data">No data available for {viewType} analytics.</div>
        </div>
      )}

      <WeightProgress />
      
      {viewType === "full" && data?.entries && (
        <div className="card">
          <h3>📋 Complete History</h3>
          <div className="data-table-container">
            <div className="data-table">
              <div className="table-header">
                <div className="table-cell">Date</div>
                <div className="table-cell">Weight</div>
                <div className="table-cell">Calories</div>
                <div className="table-cell">Protein</div>
                <div className="table-cell">Carbs</div>
                <div className="table-cell">Fat</div>
              </div>
              {data.entries.slice().reverse().map((entry, index) => (
                <div key={entry.id || index} className="table-row">
                  <div className="table-cell date-cell">
                    {new Date(entry.entry_date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </div>
                  <div className="table-cell">{entry.weight || '-'}</div>
                  <div className="table-cell">{entry.calories || '-'}</div>
                  <div className="table-cell">{entry.protein || '-'}</div>
                  <div className="table-cell">{entry.carbs || '-'}</div>
                  <div className="table-cell">{entry.fat || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {viewType === "body" && data && (
        <>
        {data.weightData && data.weightData.length > 0 && (
        <div className="card">
          <h3>Weight Progress</h3>
          
          <div className="weight-line-chart">
            <svg width="100%" height="200" viewBox="0 0 400 200">
              <defs>
                <linearGradient id="weightGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              
              {(() => {
                const maxWeight = Math.max(...data.weightData.map(d => d.weight));
                const minWeight = Math.min(...data.weightData.map(d => d.weight));
                const range = maxWeight - minWeight || 1;
                const padding = 40;
                const chartWidth = 400 - (padding * 2);
                const chartHeight = 160;
                
                const points = data.weightData.map((entry, index) => {
                  const x = padding + (index / (data.weightData.length - 1)) * chartWidth;
                  const y = padding + (1 - (entry.weight - minWeight) / range) * chartHeight;
                  return `${x},${y}`;
                }).join(' ');
                
                const areaPoints = `${padding},${padding + chartHeight} ${points} ${padding + chartWidth},${padding + chartHeight}`;
                
                return (
                  <>
                    <polygon points={areaPoints} fill="url(#weightGradient)" />
                    <polyline 
                      points={points} 
                      fill="none" 
                      stroke="#22c55e" 
                      strokeWidth="3" 
                      strokeLinecap="round"
                    />
                    {data.weightData.map((entry, index) => {
                      const x = padding + (index / (data.weightData.length - 1)) * chartWidth;
                      const y = padding + (1 - (entry.weight - minWeight) / range) * chartHeight;
                      return (
                        <g key={index}>
                          <circle cx={x} cy={y} r="4" fill="#22c55e" stroke="#ffffff" strokeWidth="2" />
                          <text x={x} y={y - 10} textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="600">
                            {entry.weight}
                          </text>
                          <text x={x} y={padding + chartHeight + 20} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10">
                            {entry.date.split('-')[2]}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
          
          <div className="weight-analysis">
            <div className="weight-stat">
              <div className="stat-value">{data.startWeight} kg</div>
              <div className="stat-label">Start</div>
            </div>
            <div className="weight-stat">
              <div className="stat-value">{data.currentWeight} kg</div>
              <div className="stat-label">Current</div>
            </div>
            <div className="weight-stat">
              <div className="stat-value" style={{ color: data.totalChange >= 0 ? "#22c55e" : "#ef4444" }}>
                {data.totalChange >= 0 ? "+" : ""}{data.totalChange} kg
              </div>
              <div className="stat-label">Change</div>
            </div>
          </div>
        </div>
        )}
        
        {data.measurementData && data.measurementData.length > 0 && (
        <div className="card">
          <h3>Body Measurements</h3>
          
          <div className="body-measurements-grid">
            {['chest', 'waist', 'arms', 'shoulders'].map(metric => {
              const measurements = data.measurementData.filter(m => m[metric]);
              if (measurements.length === 0) return null;
              
              const latest = measurements[measurements.length - 1][metric];
              const first = measurements[0][metric];
              const change = (latest - first).toFixed(1);
              const colors = { chest: '#22c55e', waist: '#eab308', arms: '#f97316', shoulders: '#8b5cf6' };
              // const icons = { chest: '💪', waist: '🔄', arms: '🥜', shoulders: '🏋️' };
              
              return (
                <div key={metric} className="body-measurement-card">
                  <div className="measurement-info">
                    <div className="measurement-title">{metric.charAt(0).toUpperCase() + metric.slice(1)}</div>
                    <div className="measurement-value" style={{ color: colors[metric] }}>
                      {latest} <span className="unit">cm</span>
                    </div>
                    <div className="measurement-change-info">
                      <span className="change-label">Change:</span>
                      <span className="change-value" style={{ color: change >= 0 ? '#22c55e' : '#ef4444' }}>
                        {change >= 0 ? '+' : ''}{change} cm
                      </span>
                    </div>
                  </div>
                  <div className="measurement-progress-ring">
                    <div className="progress-circle" style={{ borderColor: colors[metric] }}>
                      <span className="progress-text">{measurements.length}</span>
                    </div>
                    <div className="progress-label">Records</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
        </>
      )}
      
      {data && targets && viewType !== "body" && viewType !== "full" && (
        <div className="card">
          <h3>🍽️ Nutrition Analysis</h3>
          
          <div className="nutrition-item">
            <div className="nutrition-header">
              <span>Calories</span>
              <span style={{ color: getStatus(
                viewType === "daily" ? data.calories : (viewType === "full" ? data.calories : data.avgCalories), 
                viewType === "full" ? targets.target_calories_min * data.totalDays : targets.target_calories_min, 
                viewType === "full" ? targets.target_calories_max * data.totalDays : targets.target_calories_max,
                targets.goal_type,
                'calories'
              ).color }}>
                {getStatus(
                  viewType === "daily" ? data.calories : (viewType === "full" ? data.calories : data.avgCalories), 
                  viewType === "full" ? targets.target_calories_min * data.totalDays : targets.target_calories_min, 
                  viewType === "full" ? targets.target_calories_max * data.totalDays : targets.target_calories_max,
                  targets.goal_type,
                  'calories'
                ).status}
              </span>
            </div>
            <ProgressBar 
              value={viewType === "daily" ? data.calories : (viewType === "full" ? data.calories : data.avgCalories)}
              min={viewType === "full" ? targets.target_calories_min * data.totalDays : targets.target_calories_min}
              max={viewType === "full" ? targets.target_calories_max * data.totalDays : targets.target_calories_max}
              goalType={targets.goal_type}
              nutrientType="calories"
            />
          </div>

          <div className="nutrition-item">
            <div className="nutrition-header">
              <span>Protein (g)</span>
              <span style={{ color: getStatus(
                viewType === "daily" ? data.protein : (viewType === "full" ? data.protein : data.avgProtein), 
                viewType === "full" ? targets.target_protein_min * data.totalDays : targets.target_protein_min, 
                viewType === "full" ? targets.target_protein_max * data.totalDays : targets.target_protein_max,
                targets.goal_type,
                'protein'
              ).color }}>
                {getStatus(
                  viewType === "daily" ? data.protein : (viewType === "full" ? data.protein : data.avgProtein), 
                  viewType === "full" ? targets.target_protein_min * data.totalDays : targets.target_protein_min, 
                  viewType === "full" ? targets.target_protein_max * data.totalDays : targets.target_protein_max,
                  targets.goal_type,
                  'protein'
                ).status}
              </span>
            </div>
            <ProgressBar 
              value={viewType === "daily" ? data.protein : (viewType === "full" ? data.protein : data.avgProtein)}
              min={viewType === "full" ? targets.target_protein_min * data.totalDays : targets.target_protein_min}
              max={viewType === "full" ? targets.target_protein_max * data.totalDays : targets.target_protein_max}
              goalType={targets.goal_type}
              nutrientType="protein"
            />
          </div>

          <div className="nutrition-item">
            <div className="nutrition-header">
              <span>Carbs (g)</span>
              <span style={{ color: getStatus(
                viewType === "daily" ? data.carbs : (viewType === "full" ? data.carbs : data.avgCarbs), 
                viewType === "full" ? targets.target_carbs_min * data.totalDays : targets.target_carbs_min, 
                viewType === "full" ? targets.target_carbs_max * data.totalDays : targets.target_carbs_max,
                targets.goal_type,
                'carbs'
              ).color }}>
                {getStatus(
                  viewType === "daily" ? data.carbs : (viewType === "full" ? data.carbs : data.avgCarbs), 
                  viewType === "full" ? targets.target_carbs_min * data.totalDays : targets.target_carbs_min, 
                  viewType === "full" ? targets.target_carbs_max * data.totalDays : targets.target_carbs_max,
                  targets.goal_type,
                  'carbs'
                ).status}
              </span>
            </div>
            <ProgressBar 
              value={viewType === "daily" ? data.carbs : (viewType === "full" ? data.carbs : data.avgCarbs)}
              min={viewType === "full" ? targets.target_carbs_min * data.totalDays : targets.target_carbs_min}
              max={viewType === "full" ? targets.target_carbs_max * data.totalDays : targets.target_carbs_max}
              goalType={targets.goal_type}
              nutrientType="carbs"
            />
          </div>

          <div className="nutrition-item">
            <div className="nutrition-header">
              <span>Fat (g)</span>
              <span style={{ color: getStatus(
                viewType === "daily" ? data.fat : (viewType === "full" ? data.fat : data.avgFat), 
                viewType === "full" ? targets.target_fat_min * data.totalDays : targets.target_fat_min, 
                viewType === "full" ? targets.target_fat_max * data.totalDays : targets.target_fat_max,
                targets.goal_type,
                'fat'
              ).color }}>
                {getStatus(
                  viewType === "daily" ? data.fat : (viewType === "full" ? data.fat : data.avgFat), 
                  viewType === "full" ? targets.target_fat_min * data.totalDays : targets.target_fat_min, 
                  viewType === "full" ? targets.target_fat_max * data.totalDays : targets.target_fat_max,
                  targets.goal_type,
                  'fat'
                ).status}
              </span>
            </div>
            <ProgressBar 
              value={viewType === "daily" ? data.fat : (viewType === "full" ? data.fat : data.avgFat)}
              min={viewType === "full" ? targets.target_fat_min * data.totalDays : targets.target_fat_min}
              max={viewType === "full" ? targets.target_fat_max * data.totalDays : targets.target_fat_max}
              goalType={targets.goal_type}
              nutrientType="fat"
            />
          </div>
        </div>
      )}
      
      {viewType === "full" && data && targets && (
        <div className="card">
          <h3>🍽️ Cumulative Nutrition Analysis</h3>
          
          <div className="nutrition-item">
            <div className="nutrition-header">
              <span>Total Calories ({data.totalDays} days)</span>
              <span style={{ color: getStatus(
                data.calories, 
                targets.target_calories_min * data.totalDays, 
                targets.target_calories_max * data.totalDays,
                targets.goal_type,
                'calories'
              ).color }}>
                {getStatus(
                  data.calories, 
                  targets.target_calories_min * data.totalDays, 
                  targets.target_calories_max * data.totalDays,
                  targets.goal_type,
                  'calories'
                ).status}
              </span>
            </div>
            <ProgressBar 
              value={data.calories}
              min={targets.target_calories_min * data.totalDays}
              max={targets.target_calories_max * data.totalDays}
              goalType={targets.goal_type}
              nutrientType="calories"
            />
          </div>

          <div className="nutrition-item">
            <div className="nutrition-header">
              <span>Total Protein (g)</span>
              <span style={{ color: getStatus(
                data.protein, 
                targets.target_protein_min * data.totalDays, 
                targets.target_protein_max * data.totalDays,
                targets.goal_type,
                'protein'
              ).color }}>
                {getStatus(
                  data.protein, 
                  targets.target_protein_min * data.totalDays, 
                  targets.target_protein_max * data.totalDays,
                  targets.goal_type,
                  'protein'
                ).status}
              </span>
            </div>
            <ProgressBar 
              value={data.protein}
              min={targets.target_protein_min * data.totalDays}
              max={targets.target_protein_max * data.totalDays}
              goalType={targets.goal_type}
              nutrientType="protein"
            />
          </div>

          <div className="nutrition-item">
            <div className="nutrition-header">
              <span>Total Carbs (g)</span>
              <span style={{ color: getStatus(
                data.carbs, 
                targets.target_carbs_min * data.totalDays, 
                targets.target_carbs_max * data.totalDays,
                targets.goal_type,
                'carbs'
              ).color }}>
                {getStatus(
                  data.carbs, 
                  targets.target_carbs_min * data.totalDays, 
                  targets.target_carbs_max * data.totalDays,
                  targets.goal_type,
                  'carbs'
                ).status}
              </span>
            </div>
            <ProgressBar 
              value={data.carbs}
              min={targets.target_carbs_min * data.totalDays}
              max={targets.target_carbs_max * data.totalDays}
              goalType={targets.goal_type}
              nutrientType="carbs"
            />
          </div>

          <div className="nutrition-item">
            <div className="nutrition-header">
              <span>Total Fat (g)</span>
              <span style={{ color: getStatus(
                data.fat, 
                targets.target_fat_min * data.totalDays, 
                targets.target_fat_max * data.totalDays,
                targets.goal_type,
                'fat'
              ).color }}>
                {getStatus(
                  data.fat, 
                  targets.target_fat_min * data.totalDays, 
                  targets.target_fat_max * data.totalDays,
                  targets.goal_type,
                  'fat'
                ).status}
              </span>
            </div>
            <ProgressBar 
              value={data.fat}
              min={targets.target_fat_min * data.totalDays}
              max={targets.target_fat_max * data.totalDays}
              goalType={targets.goal_type}
              nutrientType="fat"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;