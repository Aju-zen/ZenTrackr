import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const Measurements = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [measurements, setMeasurements] = useState({
    chest: '',
    waist: '',
    arms: '',
    shoulders: ''
  });
  // eslint-disable-next-line no-unused-vars
  const [existingMeasurements, setExistingMeasurements] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchExistingMeasurements();
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchExistingMeasurements = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('body_measurements')
        .select('*')
        .eq('measurement_date', selectedDate);
      
      if (user && user.email !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.single();

      if (data && !error) {
        setExistingMeasurements(data);
        setMeasurements({
          chest: data.chest || '',
          waist: data.waist || '',
          arms: data.arms || '',
          shoulders: data.shoulders || ''
        });
      } else {
        setExistingMeasurements({});
        setMeasurements({
          chest: '',
          waist: '',
          arms: '',
          shoulders: ''
        });
      }
    } catch (err) {
      console.error('Error fetching measurements:', err);
    }
  };

  const handleInputChange = (field, value) => {
    setMeasurements(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveMeasurements = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const measurementData = {
        measurement_date: selectedDate,
        chest: measurements.chest ? parseFloat(measurements.chest) : null,
        waist: measurements.waist ? parseFloat(measurements.waist) : null,
        arms: measurements.arms ? parseFloat(measurements.arms) : null,
        shoulders: measurements.shoulders ? parseFloat(measurements.shoulders) : null,
        updated_at: new Date().toISOString()
      };
      
      if (user && user.email !== 'admin') {
        measurementData.user_id = user.id;
      }
      
      const { error } = await supabase
        .from('body_measurements')
        .upsert(measurementData, {
          onConflict: 'measurement_date'
        });

      if (error) throw error;

      fetchExistingMeasurements();
      alert('Measurements saved successfully!');
    } catch (err) {
      console.error('Error saving measurements:', err);
      alert('Error saving measurements. Please try again.');
    }
    setLoading(false);
  };

  const measurementFields = [
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'arms', label: 'Arms' },
    { key: 'shoulders', label: 'Shoulders' }
  ];

  return (
    <div>
      <div className="card">
        <h2>Body Measurements</h2>
        
        <div className="form-group">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="measurements-grid">
          {measurementFields.map(({ key, label }) => (
            <div key={key} className="measurement-card">
              <div className="measurement-header">
                <span className="measurement-label">{label}</span>
              </div>
              <div className="form-group">
                <input
                  type="number"
                  step="0.1"
                  placeholder="cm"
                  value={measurements[key]}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          ))}
        </div>

        <button 
          className="btn"
          onClick={saveMeasurements}
          disabled={loading}
          style={{ marginTop: '20px' }}
        >
          {loading ? 'Saving...' : 'Save Measurements'}
        </button>
      </div>

      <MeasurementViewer />
    </div>
  );
};

const MeasurementViewer = () => {
  const [allMeasurements, setAllMeasurements] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState('chest');
  const [loading, setLoading] = useState(false);

  const measurementFields = [
    { key: 'chest', label: 'Chest' },
    { key: 'waist', label: 'Waist' },
    { key: 'arms', label: 'Arms' },
    { key: 'shoulders', label: 'Shoulders' }
  ];

  useEffect(() => {
    fetchAllMeasurements();
  }, []);

  const fetchAllMeasurements = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('body_measurements')
        .select('*')
        .order('measurement_date', { ascending: true });
      
      if (user && user.email !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;

      if (data && !error) {
        setAllMeasurements(data);
      } else {
        setAllMeasurements([]);
      }
    } catch (err) {
      console.error('Error fetching measurements:', err);
    }
    setLoading(false);
  };

  const filteredMeasurements = allMeasurements.filter(m => m[selectedMetric] !== null);

  return (
    <div className="card">
      <h2>Measurement Progress</h2>
      
      <div className="form-group">
        <label>Select Metric:</label>
        <select 
          value={selectedMetric} 
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="form-input"
        >
          {measurementFields.map(field => (
            <option key={field.key} value={field.key}>
              {field.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading measurements...</div>
      ) : filteredMeasurements.length > 0 ? (
        <div className="measurement-timeline">
          <h3>{measurementFields.find(f => f.key === selectedMetric)?.label} Progress</h3>
          <div className="measurement-list">
            {filteredMeasurements.map((measurement, index) => (
              <div key={index} className="measurement-item">
                <div className="measurement-date">{measurement.measurement_date}</div>
                <div className="measurement-value">{measurement[selectedMetric]} cm</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-data">
          <p>No {measurementFields.find(f => f.key === selectedMetric)?.label} measurements found</p>
          <p>Add measurements to track your progress over time.</p>
        </div>
      )}
    </div>
  );
};

export default Measurements;