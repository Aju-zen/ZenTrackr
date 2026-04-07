import { useState, useEffect, useCallback } from "react";
import { addDailyEntry, updateDailyEntry, supabase } from "../services/supabase";

export default function DailyEntry() {
  const [form, setForm] = useState({
    entry_date: "",
    weight: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: ""
  });
  const [currentEntryId, setCurrentEntryId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    setForm({
      entry_date: today,
      weight: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: ""
    });
    loadEntryForDate(today);
  }, []);

  const loadEntryForDate = async (date) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from("daily_entries")
        .select("*")
        .eq("entry_date", date);
      
      if (user && user.email !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data } = await query.single();
      
      if (data) {
        setForm({
          entry_date: data.entry_date,
          weight: data.weight || "",
          calories: data.calories || "",
          protein: data.protein || "",
          carbs: data.carbs || "",
          fat: data.fat || ""
        });
        setCurrentEntryId(data.id);
      } else {
        setForm({
          entry_date: date,
          weight: "",
          calories: "",
          protein: "",
          carbs: "",
          fat: ""
        });
        setCurrentEntryId(null);
      }
    } catch (error) {
      setForm({
        entry_date: date,
        weight: "",
        calories: "",
        protein: "",
        carbs: "",
        fat: ""
      });
      setCurrentEntryId(null);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(
    debounce(async (formData, entryId) => {
      try {
        if (entryId) {
          await updateDailyEntry(entryId, formData);
        } else {
          await addDailyEntry(formData);
          const { data: { user } } = await supabase.auth.getUser();
          
          let newEntryQuery = supabase
            .from("daily_entries")
            .select("*")
            .eq("entry_date", formData.entry_date);
          
          if (user && user.email !== 'admin') {
            newEntryQuery = newEntryQuery.eq('user_id', user.id);
          }
          
          const { data: newEntry } = await newEntryQuery.single();
          if (newEntry) {
            setCurrentEntryId(newEntry.id);
          }
        }
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(""), 2000);
      } catch (error) {
        console.error("Auto-save error:", error);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(""), 2000);
      }
    }, 1000),
    []
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newForm = { ...form, [name]: value };
    setForm(newForm);
    
    if (name === "entry_date") {
      loadEntryForDate(value);
      return;
    }
    
    // Debounced auto-save - create row even with single value
    if (name !== "entry_date" && form.entry_date) {
      // Prepare entry with all fields, using null for empty values
      const entryToSave = {
        entry_date: newForm.entry_date,
        weight: newForm.weight || null,
        calories: newForm.calories || null,
        protein: newForm.protein || null,
        carbs: newForm.carbs || null,
        fat: newForm.fat || null
      };
      debouncedSave(entryToSave, currentEntryId);
    }
  };

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <div>
      <h2 className="page-title">Track Today</h2>
      <div className="card">

      <div className="form-group">
        <label>Date</label>
        <input type="date" name="entry_date" value={form.entry_date} onChange={handleChange} />
      </div>
      <div className="stats-grid">
        <div className="form-group">
          <label>Weight (kg)</label>
          <input type="number" name="weight" placeholder="Enter weight" value={form.weight} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Calories</label>
          <input type="number" name="calories" placeholder="Enter calories" value={form.calories} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Protein (g)</label>
          <input type="number" name="protein" placeholder="Enter protein" value={form.protein} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Carbs (g)</label>
          <input type="number" name="carbs" placeholder="Enter carbs" value={form.carbs} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Fat (g)</label>
          <input type="number" name="fat" placeholder="Enter fat" value={form.fat} onChange={handleChange} />
        </div>
      </div>
      {saveStatus && (
        <div className={`notification ${saveStatus === 'saved' ? 'show' : saveStatus === 'error' ? 'show error' : ''}`}>
          {saveStatus === 'saved' ? '✓ Saved' : '❌ Error saving'}
        </div>
      )}

      </div>
    </div>
  );
}
