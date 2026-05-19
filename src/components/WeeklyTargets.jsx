import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../services/supabase";

const WeeklyTargets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [calculationMode, setCalculationMode] = useState(null); // 'manual' or 'automatic'
  const [form, setForm] = useState({
    startDate: "",
    goalType: "bulking",
    weeklyGain: "",
    baseWeight: "",
    targetWeight: "",
    calMin: "",
    calMax: "",
    proMin: "",
    proMax: "",
    carbMin: "",
    carbMax: "",
    fatMin: "",
    fatMax: ""
  });
  const [existingTargets, setExistingTargets] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    fromDate: "",
    calMin: "",
    calMax: "",
    proMin: "",
    proMax: "",
    carbMin: "",
    carbMax: "",
    fatMin: "",
    fatMax: ""
  });

  const fetchExistingTargets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase.from("weekly_targets").select("*");
    
    // Filter by user_id for regular users, show all for admin
    if (user && user.email !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    
    const { data } = await query.order("week_number", { ascending: true });
    setExistingTargets(data || []);
  };

  useEffect(() => {
    fetchExistingTargets();
    
    // Check if we have calculated macros from the calculator
    if (location.state?.calculatedMacros && location.state?.autoFill) {
      const macros = location.state.calculatedMacros;
      setForm({
        ...form,
        goalType: macros.goalType,
        baseWeight: macros.baseWeight?.toString() || "",
        targetWeight: macros.targetWeight?.toString() || "",
        weeklyGain: Math.abs(macros.weeklyChange)?.toString() || "",
        calMin: macros.calorieRange.min.toString(),
        calMax: macros.calorieRange.max.toString(),
        proMin: macros.proteinRange.min.toString(),
        proMax: macros.proteinRange.max.toString(),
        carbMin: macros.carbRange.min.toString(),
        carbMax: macros.carbRange.max.toString(),
        fatMin: macros.fatRange.min.toString(),
        fatMax: macros.fatRange.max.toString()
      });
    }
  }, [location.state]);

  const generateTargets = async (e) => {
    e.preventDefault();

    const { startDate, goalType, weeklyGain, baseWeight, calMin, calMax, proMin, proMax, carbMin, carbMax, fatMin, fatMax } = form;

    const start = new Date(startDate);
    
    // Calculate number of weeks based on weight difference and weekly goal
    const currentWeight = parseFloat(baseWeight);
    const targetWeight = parseFloat(form.targetWeight || baseWeight); // Add target weight to form
    const weeklyRate = parseFloat(weeklyGain);
    const weightDifference = Math.abs(targetWeight - currentWeight);
    const weeks = Math.ceil(weightDifference / weeklyRate);
    
    let targets = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + i * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Calculate progressive target weight
      const isGaining = targetWeight > currentWeight;
      const progressiveWeight = isGaining 
        ? currentWeight + (weeklyRate * (i + 1))
        : currentWeight - (weeklyRate * (i + 1));

      targets.push({
        week_number: i + 1,
        start_date: weekStart.toISOString().split("T")[0],
        end_date: weekEnd.toISOString().split("T")[0],
        goal_type: goalType,
        target_weight: Math.round(progressiveWeight * 10) / 10, // Round to 1 decimal
        target_calories_min: calMin,
        target_calories_max: calMax,
        target_protein_min: proMin,
        target_protein_max: proMax,
        target_carbs_min: carbMin,
        target_carbs_max: carbMax,
        target_fat_min: fatMin,
        target_fat_max: fatMax
      });
    }

    // Add user_id to each target for regular users
    const { data: { user } } = await supabase.auth.getUser();
    const targetsWithUser = user && user.email !== 'admin' 
      ? targets.map(target => ({ ...target, user_id: user.id }))
      : targets;

    const { data, error } = await supabase.from("weekly_targets").insert(targetsWithUser);
    if (error) {
      console.error("Error inserting weekly targets:", error);
    } else {
      console.log("Inserted weekly targets:", data);
      alert(`${weeks}-week targets generated successfully!`);
      fetchExistingTargets();
    }
  };

  const updateTargets = async (e) => {
    e.preventDefault();
    
    const { fromDate, calMin, calMax, proMin, proMax, carbMin, carbMax, fatMin, fatMax } = editForm;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from("weekly_targets")
      .update({
        target_calories_min: calMin,
        target_calories_max: calMax,
        target_protein_min: proMin,
        target_protein_max: proMax,
        target_carbs_min: carbMin,
        target_carbs_max: carbMax,
        target_fat_min: fatMin,
        target_fat_max: fatMax
      })
      .gte("start_date", fromDate);
    
    // Filter by user_id for regular users
    if (user && user.email !== 'admin') {
      query = query.eq('user_id', user.id);
    }
    
    const { error } = await query;

    if (error) {
      console.error("Error updating targets:", error);
    } else {
      alert("Targets updated successfully!");
      fetchExistingTargets();
      setEditMode(false);
    }
  };

  if (existingTargets.length > 0 && !editMode) {
    return (
      <div>
        <h2 className="page-title">Target Setter</h2>
        <div className="card">

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{existingTargets.length}</div>
              <div className="stat-label">Weeks Created</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{existingTargets[0]?.start_date}</div>
              <div className="stat-label">Start Date</div>
            </div>
          </div>
          <div style={{textAlign: 'center', marginTop: '20px'}}>
            <button 
              className="btn" 
              onClick={() => {
                // Populate edit form with existing data
                const firstTarget = existingTargets[0];
                setEditForm({
                  fromDate: firstTarget?.start_date || "",
                  calMin: firstTarget?.target_calories_min || "",
                  calMax: firstTarget?.target_calories_max || "",
                  proMin: firstTarget?.target_protein_min || "",
                  proMax: firstTarget?.target_protein_max || "",
                  carbMin: firstTarget?.target_carbs_min || "",
                  carbMax: firstTarget?.target_carbs_max || "",
                  fatMin: firstTarget?.target_fat_min || "",
                  fatMax: firstTarget?.target_fat_max || ""
                });
                setEditMode(true);
              }}
              style={{marginRight: '10px'}}
            >
              ✏️ Edit Targets
            </button>
            <button 
              className="btn" 
              onClick={async () => {
                if (window.confirm('Delete all targets and create new ones?')) {
                  const { data: { user } } = await supabase.auth.getUser();
                  let query = supabase.from('weekly_targets').delete().neq('id', 0);
                  if (user && user.email !== 'admin') {
                    query = query.eq('user_id', user.id);
                  }
                  await query;
                  setExistingTargets([]);
                }
              }}
              style={{background: 'linear-gradient(145deg, #dc2626, #b91c1c)'}}
            >
              🗑️ Reset Targets
            </button>
          </div>
        </div>
        
        <div className="card">
          <h3>📋 Targets Log</h3>
          <div className="metric-row">
            <span className="metric-label">Created On</span>
            <span className="metric-value">{existingTargets[0]?.start_date}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Total Weeks</span>
            <span className="metric-value">{existingTargets.length}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Last Modified</span>
            <span className="metric-value">{new Date().toISOString().split('T')[0]}</span>
          </div>
        </div>
      </div>
    );
  }

  // Show calculation mode selection when no targets exist
  if (!calculationMode) {
    return (
      <div>
        <h2 className="page-title">🎯 Target Setter</h2>
        <div className="card">
          <h3 style={{textAlign: 'center', marginBottom: '30px'}}>Choose Your Setup Method</h3>
          
          <div className="calculation-options">
            <div 
              className="calculation-option"
              onClick={() => setCalculationMode('manual')}
            >
              <div className="option-icon">✏️</div>
              <div className="option-title">Manual Entry</div>
              <div className="option-description">
                Enter your macro ranges manually based on your knowledge or existing plan
              </div>
            </div>
            
            <div 
              className="calculation-option"
              onClick={() => setCalculationMode('automatic')}
            >
              <div className="option-icon">🧮</div>
              <div className="option-title">Automatic Calculation</div>
              <div className="option-description">
                Let AI calculate optimal macro ranges based on your goals and activity level
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If automatic calculation is selected, redirect to macro calculator
  if (calculationMode === 'automatic') {
    navigate('/macro-calculator', { state: { returnTo: '/targets' } });
    return null;
  }

  // Auto-generate targets when coming back from macro calculator with calculated values
  useEffect(() => {
    if (location.state?.calculatedMacros && location.state?.autoFill && calculationMode === null) {
      const macros = location.state.calculatedMacros;
      const autoForm = {
        startDate: new Date().toISOString().split('T')[0], // Today's date
        goalType: macros.goalType,
        baseWeight: macros.baseWeight?.toString() || "",
        targetWeight: macros.targetWeight?.toString() || "",
        weeklyGain: Math.abs(macros.weeklyChange)?.toString() || "",
        calMin: macros.calorieRange.min.toString(),
        calMax: macros.calorieRange.max.toString(),
        proMin: macros.proteinRange.min.toString(),
        proMax: macros.proteinRange.max.toString(),
        carbMin: macros.carbRange.min.toString(),
        carbMax: macros.carbRange.max.toString(),
        fatMin: macros.fatRange.min.toString(),
        fatMax: macros.fatRange.max.toString()
      };
      
      // Auto-generate targets immediately
      generateTargetsFromCalculation(autoForm);
    }
  }, [location.state, calculationMode]);

  const generateTargetsFromCalculation = async (autoForm) => {
    const { startDate, goalType, weeklyGain, baseWeight, calMin, calMax, proMin, proMax, carbMin, carbMax, fatMin, fatMax } = autoForm;

    const start = new Date(startDate);
    
    // Calculate number of weeks based on weight difference and weekly goal
    const currentWeight = parseFloat(baseWeight);
    const targetWeight = parseFloat(autoForm.targetWeight || baseWeight);
    const weeklyRate = parseFloat(weeklyGain);
    const weightDifference = Math.abs(targetWeight - currentWeight);
    const weeks = Math.ceil(weightDifference / weeklyRate);
    
    let targets = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(start.getDate() + i * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      // Calculate progressive target weight
      const isGaining = targetWeight > currentWeight;
      const progressiveWeight = isGaining 
        ? currentWeight + (weeklyRate * (i + 1))
        : currentWeight - (weeklyRate * (i + 1));

      targets.push({
        week_number: i + 1,
        start_date: weekStart.toISOString().split("T")[0],
        end_date: weekEnd.toISOString().split("T")[0],
        goal_type: goalType,
        target_weight: Math.round(progressiveWeight * 10) / 10,
        target_calories_min: calMin,
        target_calories_max: calMax,
        target_protein_min: proMin,
        target_protein_max: proMax,
        target_carbs_min: carbMin,
        target_carbs_max: carbMax,
        target_fat_min: fatMin,
        target_fat_max: fatMax
      });
    }

    // Add user_id to each target for regular users
    const { data: { user } } = await supabase.auth.getUser();
    const targetsWithUser = user && user.email !== 'admin' 
      ? targets.map(target => ({ ...target, user_id: user.id }))
      : targets;

    const { data, error } = await supabase.from("weekly_targets").insert(targetsWithUser);
    if (error) {
      console.error("Error inserting weekly targets:", error);
      alert("Error generating targets. Please try again.");
    } else {
      console.log("Inserted weekly targets:", data);
      alert(`🎯 ${weeks}-week targets generated successfully from AI calculation!`);
      fetchExistingTargets();
      // Clear the navigation state
      navigate('/targets', { replace: true });
    }
  };

  if (editMode) {
    return (
      <div>
        <h2 className="page-title">🎯 Target Setter</h2>
        <div className="card">

        <form onSubmit={updateTargets}>
          <div className="form-group">
            <label>Update targets from this date onwards</label>
            <input
              type="date"
              value={editForm.fromDate}
              onChange={(e) => setEditForm({ ...editForm, fromDate: e.target.value })}
              min={existingTargets[0]?.start_date}
              max={existingTargets[existingTargets.length - 1]?.end_date}
              required
            />
          </div>

          <h3 style={{color: '#dc2626', textShadow: '0 0 10px rgba(220, 38, 38, 0.5)', marginTop: '30px'}}>🍽️ New Nutrition Ranges</h3>
          
          <div className="stats-grid">
            <div className="form-group">
              <label>Calories Min</label>
              <input type="number" placeholder="e.g. 2000" value={editForm.calMin} onChange={(e) => setEditForm({ ...editForm, calMin: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Calories Max</label>
              <input type="number" placeholder="e.g. 2500" value={editForm.calMax} onChange={(e) => setEditForm({ ...editForm, calMax: e.target.value })} required />
            </div>
          </div>

          <div className="stats-grid">
            <div className="form-group">
              <label>Protein Min (g)</label>
              <input type="number" placeholder="e.g. 120" value={editForm.proMin} onChange={(e) => setEditForm({ ...editForm, proMin: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Protein Max (g)</label>
              <input type="number" placeholder="e.g. 150" value={editForm.proMax} onChange={(e) => setEditForm({ ...editForm, proMax: e.target.value })} required />
            </div>
          </div>

          <div className="stats-grid">
            <div className="form-group">
              <label>Carbs Min (g)</label>
              <input type="number" placeholder="e.g. 200" value={editForm.carbMin} onChange={(e) => setEditForm({ ...editForm, carbMin: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Carbs Max (g)</label>
              <input type="number" placeholder="e.g. 300" value={editForm.carbMax} onChange={(e) => setEditForm({ ...editForm, carbMax: e.target.value })} required />
            </div>
          </div>

          <div className="stats-grid">
            <div className="form-group">
              <label>Fat Min (g)</label>
              <input type="number" placeholder="e.g. 60" value={editForm.fatMin} onChange={(e) => setEditForm({ ...editForm, fatMin: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Fat Max (g)</label>
              <input type="number" placeholder="e.g. 80" value={editForm.fatMax} onChange={(e) => setEditForm({ ...editForm, fatMax: e.target.value })} required />
            </div>
          </div>

          <div style={{textAlign: 'center', marginTop: '30px'}}>
            <button type="submit" className="btn" style={{marginRight: '10px'}}>💾 Update Targets</button>
            <button type="button" className="btn" onClick={() => setEditMode(false)}>❌ Cancel</button>
          </div>
        </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">🎯 Target Setter</h2>
      <div className="card">

      <form onSubmit={generateTargets}>
        <div className="form-group">
          <label>Start Date</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Goal Type</label>
          <select
            value={form.goalType}
            onChange={(e) => setForm({ ...form, goalType: e.target.value })}
            required
          >
            <option value="bulking">💪 Bulking (Muscle Gain)</option>
            <option value="weight_loss">🔥 Weight Loss (Fat Loss)</option>
          </select>
        </div>

        <div className="stats-grid">
          <div className="form-group">
            <label>Starting Weight (kg)</label>
            <input
              type="number"
              placeholder="e.g. 60"
              value={form.baseWeight}
              onChange={(e) => setForm({ ...form, baseWeight: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Target Weight (kg)</label>
            <input
              type="number"
              placeholder="e.g. 65"
              value={form.targetWeight}
              onChange={(e) => setForm({ ...form, targetWeight: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Weekly Rate (kg/week)</label>
          <input
            type="number"
            step="0.1"
            placeholder="e.g. 0.5"
            value={form.weeklyGain}
            onChange={(e) => setForm({ ...form, weeklyGain: e.target.value })}
            required
          />
        </div>

        {form.baseWeight && form.targetWeight && form.weeklyGain && (
          <div className="goal-preview">
            {parseFloat(form.targetWeight) > parseFloat(form.baseWeight) ? (
              <div style={{background: 'rgba(34, 197, 94, 0.1)', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                <p style={{color: '#22c55e', margin: '5px 0'}}>
                  💪 Goal: Gain {(parseFloat(form.targetWeight) - parseFloat(form.baseWeight)).toFixed(1)} kg
                </p>
                <p style={{color: 'rgba(255, 255, 255, 0.8)', margin: '5px 0'}}>
                  Duration: {Math.ceil(Math.abs(parseFloat(form.targetWeight) - parseFloat(form.baseWeight)) / parseFloat(form.weeklyGain))} weeks
                </p>
              </div>
            ) : (
              <div style={{background: 'rgba(239, 68, 68, 0.1)', padding: '15px', borderRadius: '8px', textAlign: 'center'}}>
                <p style={{color: '#ef4444', margin: '5px 0'}}>
                  🔥 Goal: Lose {(parseFloat(form.baseWeight) - parseFloat(form.targetWeight)).toFixed(1)} kg
                </p>
                <p style={{color: 'rgba(255, 255, 255, 0.8)', margin: '5px 0'}}>
                  Duration: {Math.ceil(Math.abs(parseFloat(form.targetWeight) - parseFloat(form.baseWeight)) / parseFloat(form.weeklyGain))} weeks
                </p>
              </div>
            )}
          </div>
        )}

        <h3 style={{color: '#dc2626', textShadow: '0 0 10px rgba(220, 38, 38, 0.5)', marginTop: '30px'}}>🍽️ Nutrition Ranges</h3>
        
        <div className="stats-grid">
          <div className="form-group">
            <label>Calories Min</label>
            <input type="number" placeholder="e.g. 2000" value={form.calMin} onChange={(e) => setForm({ ...form, calMin: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Calories Max</label>
            <input type="number" placeholder="e.g. 2500" value={form.calMax} onChange={(e) => setForm({ ...form, calMax: e.target.value })} />
          </div>
        </div>

        <div className="stats-grid">
          <div className="form-group">
            <label>Protein Min (g)</label>
            <input type="number" placeholder="e.g. 120" value={form.proMin} onChange={(e) => setForm({ ...form, proMin: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Protein Max (g)</label>
            <input type="number" placeholder="e.g. 150" value={form.proMax} onChange={(e) => setForm({ ...form, proMax: e.target.value })} />
          </div>
        </div>

        <div className="stats-grid">
          <div className="form-group">
            <label>Carbs Min (g)</label>
            <input type="number" placeholder="e.g. 200" value={form.carbMin} onChange={(e) => setForm({ ...form, carbMin: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Carbs Max (g)</label>
            <input type="number" placeholder="e.g. 300" value={form.carbMax} onChange={(e) => setForm({ ...form, carbMax: e.target.value })} />
          </div>
        </div>

        <div className="stats-grid">
          <div className="form-group">
            <label>Fat Min (g)</label>
            <input type="number" placeholder="e.g. 60" value={form.fatMin} onChange={(e) => setForm({ ...form, fatMin: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Fat Max (g)</label>
            <input type="number" placeholder="e.g. 80" value={form.fatMax} onChange={(e) => setForm({ ...form, fatMax: e.target.value })} />
          </div>
        </div>

        <div style={{textAlign: 'center', marginTop: '30px'}}>
          <button type="submit" className="btn">
            ✨ Generate {form.baseWeight && form.targetWeight && form.weeklyGain ? 
              Math.ceil(Math.abs(parseFloat(form.targetWeight) - parseFloat(form.baseWeight)) / parseFloat(form.weeklyGain)) + '-Week' : 
              'Dynamic'
            } Targets
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default WeeklyTargets;
