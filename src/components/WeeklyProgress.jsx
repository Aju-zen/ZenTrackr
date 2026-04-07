import React, { useState } from 'react';
import Photos from './Photos';
import Measurements from './Measurements';

const WeeklyProgress = () => {
  const [activeTab, setActiveTab] = useState('photos');

  return (
    <div>
      <h2 className="page-title">Weekly Progress</h2>
      <div className="card">

        
        <div className="analytics-tabs">
          <button 
            className={`tab ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            Photos
          </button>
          <button 
            className={`tab ${activeTab === 'measurements' ? 'active' : ''}`}
            onClick={() => setActiveTab('measurements')}
          >
            Measurements
          </button>
        </div>
      </div>

      {activeTab === 'photos' && <Photos />}
      {activeTab === 'measurements' && <Measurements />}
    </div>
  );
};

export default WeeklyProgress;