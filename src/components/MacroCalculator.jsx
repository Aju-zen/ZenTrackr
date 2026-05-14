import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const MacroCalculator = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    currentWeight: "",
    targetWeight: "",
    activityLevel: "",
    weeklyGoal: "",
    workoutType: "",
    workoutDuration: "",
    workoutFrequency: ""
  });
  const [results, setResults] = useState(null);

  const activityOptions = [
    { value: "sedentary", label: "🛋️ Sedentary (No exercise, desk job)", multiplier: 1.2 },
    { value: "light", label: "🚶 Light Activity (Light exercise 1-3 days/week)", multiplier: 1.375 },
    { value: "moderate", label: "🏃 Moderate Activity (Moderate exercise 3-5 days/week)", multiplier: 1.55 },
    { value: "active", label: "💪 Very Active (Hard exercise 6-7 days/week)", multiplier: 1.725 },
    { value: "extreme", label: "🔥 Extremely Active (Very hard exercise, physical job)", multiplier: 1.9 }
  ];

  const weeklyGoalOptions = [
    { value: "0.25", label: "0.25 kg/week (Slow & Steady)" },
    { value: "0.5", label: "0.5 kg/week (Moderate)" },
    { value: "0.75", label: "0.75 kg/week (Aggressive)" },
    { value: "1", label: "1 kg/week (Very Aggressive)" }
  ];

  const calculateMacros = () => {
    const weight = parseFloat(formData.currentWeight);
    const targetWeight = parseFloat(formData.targetWeight);
    const weeklyChange = parseFloat(formData.weeklyGoal);
    const activityMultiplier = activityOptions.find(a => a.value === formData.activityLevel)?.multiplier || 1.2;
    
    // Calculate BMR using Mifflin-St Jeor Equation (simplified for weight only)
    const bmr = weight * 22; // Simplified: 22 calories per kg for average person
    
    // Calculate TDEE (Total Daily Energy Expenditure)
    const tdee = bmr * activityMultiplier;
    
    // Determine if gaining or losing weight
    const isGaining = targetWeight > weight;
    const calorieAdjustment = weeklyChange * 7700; // 7700 calories per kg
    const dailyCalorieAdjustment = calorieAdjustment / 7;
    
    // Calculate target calories
    const targetCalories = isGaining 
      ? Math.round(tdee + dailyCalorieAdjustment)
      : Math.round(tdee - dailyCalorieAdjustment);
    
    // Calculate macros (60% carbs, 20% protein, 20% fat)
    const carbCalories = targetCalories * 0.6;
    const proteinCalories = targetCalories * 0.2;
    const fatCalories = targetCalories * 0.2;
    
    // Convert to grams
    const carbGrams = Math.round(carbCalories / 4);
    const proteinGrams = Math.round(proteinCalories / 4);
    const fatGrams = Math.round(fatCalories / 9);
    
    // Create ranges (±10% for flexibility)
    const calorieRange = {
      min: Math.round(targetCalories * 0.9),
      max: Math.round(targetCalories * 1.1)
    };
    
    const carbRange = {
      min: Math.round(carbGrams * 0.9),
      max: Math.round(carbGrams * 1.1)
    };
    
    const proteinRange = {
      min: Math.round(proteinGrams * 0.9),
      max: Math.round(proteinGrams * 1.1)
    };
    
    const fatRange = {
      min: Math.round(fatGrams * 0.9),
      max: Math.round(fatGrams * 1.1)
    };

    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      calorieRange,
      carbRange,
      proteinRange,
      fatRange,
      goalType: isGaining ? "bulking" : "weight_loss",
      weeklyChange: isGaining ? weeklyChange : -weeklyChange
    });
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      calculateMacros();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleUseResults = () => {
    // Navigate back to weekly targets with calculated values
    navigate('/weekly-targets', { 
      state: { 
        calculatedMacros: results,
        autoFill: true 
      } 
    });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="calculator-step">
            <h3>📏 Current Weight</h3>
            <p>Enter your current body weight in kilograms</p>
            <div className="form-group">
              <label>Current Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 70.5"
                value={formData.currentWeight}
                onChange={(e) => setFormData({...formData, currentWeight: e.target.value})}
                required
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="calculator-step">
            <h3>🎯 Target Weight</h3>
            <p>What's your goal weight in kilograms?</p>
            <div className="form-group">
              <label>Target Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 75.0"
                value={formData.targetWeight}
                onChange={(e) => setFormData({...formData, targetWeight: e.target.value})}
                required
              />
            </div>
            {formData.currentWeight && formData.targetWeight && (
              <div className="goal-preview">
                {parseFloat(formData.targetWeight) > parseFloat(formData.currentWeight) ? (
                  <p style={{color: '#22c55e'}}>💪 Goal: Gain {(parseFloat(formData.targetWeight) - parseFloat(formData.currentWeight)).toFixed(1)} kg</p>
                ) : (
                  <p style={{color: '#ef4444'}}>🔥 Goal: Lose {(parseFloat(formData.currentWeight) - parseFloat(formData.targetWeight)).toFixed(1)} kg</p>
                )}
              </div>
            )}
          </div>
        );
      
      case 3:
        return (
          <div className="calculator-step">
            <h3>🏃 Activity Level</h3>
            <p>Select your daily activity level</p>
            <div className="activity-options">
              {activityOptions.map((option) => (
                <label key={option.value} className={`activity-option ${formData.activityLevel === option.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="activityLevel"
                    value={option.value}
                    checked={formData.activityLevel === option.value}
                    onChange={(e) => setFormData({...formData, activityLevel: e.target.value})}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="calculator-step">
            <h3>⚡ Weekly Goal</h3>
            <p>How fast do you want to reach your goal?</p>
            <div className="goal-options">
              {weeklyGoalOptions.map((option) => (
                <label key={option.value} className={`goal-option ${formData.weeklyGoal === option.value ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="weeklyGoal"
                    value={option.value}
                    checked={formData.weeklyGoal === option.value}
                    onChange={(e) => setFormData({...formData, weeklyGoal: e.target.value})}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (results) {
    return (
      <div>
        <h2 className="page-title">🎯 Your Macro Results</h2>
        
        <div className="card">
          <h3>📊 Calculated Values</h3>
          <div className="results-grid">
            <div className="result-item">
              <div className="result-label">BMR (Base Metabolic Rate)</div>
              <div className="result-value">{results.bmr} cal/day</div>
            </div>
            <div className="result-item">
              <div className="result-label">TDEE (Total Daily Energy)</div>
              <div className="result-value">{results.tdee} cal/day</div>
            </div>
            <div className="result-item">
              <div className="result-label">Target Calories</div>
              <div className="result-value">{results.targetCalories} cal/day</div>
            </div>
            <div className="result-item">
              <div className="result-label">Weekly Goal</div>
              <div className="result-value">{Math.abs(results.weeklyChange)} kg/week</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>🍽️ Recommended Macro Ranges</h3>
          <div className="macro-results">
            <div className="macro-item">
              <div className="macro-header">
                <span className="macro-name">Calories</span>
                <span className="macro-range">{results.calorieRange.min} - {results.calorieRange.max}</span>
              </div>
              <div className="macro-bar">
                <div className="macro-fill" style={{width: '100%', background: '#dc2626'}}></div>
              </div>
            </div>
            
            <div className="macro-item">
              <div className="macro-header">
                <span className="macro-name">Carbs (60%)</span>
                <span className="macro-range">{results.carbRange.min}g - {results.carbRange.max}g</span>
              </div>
              <div className="macro-bar">
                <div className="macro-fill" style={{width: '60%', background: '#22c55e'}}></div>
              </div>
            </div>
            
            <div className="macro-item">
              <div className="macro-header">
                <span className="macro-name">Protein (20%)</span>
                <span className="macro-range">{results.proteinRange.min}g - {results.proteinRange.max}g</span>
              </div>
              <div className="macro-bar">
                <div className="macro-fill" style={{width: '20%', background: '#3b82f6'}}></div>
              </div>
            </div>
            
            <div className="macro-item">
              <div className="macro-header">
                <span className="macro-name">Fat (20%)</span>
                <span className="macro-range">{results.fatRange.min}g - {results.fatRange.max}g</span>
              </div>
              <div className="macro-bar">
                <div className="macro-fill" style={{width: '20%', background: '#eab308'}}></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>💡 Recommendations</h3>
          <div className="recommendations">
            <p>• <strong>Goal Type:</strong> {results.goalType === 'bulking' ? 'Muscle Gain (Bulking)' : 'Weight Loss'}</p>
            <p>• <strong>Calorie Distribution:</strong> 60% Carbs, 20% Protein, 20% Fat</p>
            <p>• <strong>Tracking Tip:</strong> Stay within the ranges for best results</p>
            <p>• <strong>Adjustment:</strong> Monitor progress and adjust if needed after 2-3 weeks</p>
          </div>
        </div>

        <div style={{textAlign: 'center', marginTop: '30px'}}>
          <button className="btn" onClick={handleUseResults} style={{marginRight: '10px'}}>
            ✅ Use These Values
          </button>
          <button className="btn" onClick={() => navigate('/weekly-targets')}>
            ❌ Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">🧮 Macro Calculator</h2>
      
      <div className="card">
        <div className="progress-header">
          <h3>Step {step} of 4</h3>
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${(step / 4) * 100}%`}}></div>
          </div>
        </div>

        {renderStep()}

        <div className="calculator-buttons">
          {step > 1 && (
            <button className="btn" onClick={handleBack}>
              ← Back
            </button>
          )}
          <button 
            className="btn" 
            onClick={handleNext}
            disabled={
              (step === 1 && !formData.currentWeight) ||
              (step === 2 && !formData.targetWeight) ||
              (step === 3 && !formData.activityLevel) ||
              (step === 4 && !formData.weeklyGoal)
            }
          >
            {step === 4 ? 'Calculate 🧮' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MacroCalculator;