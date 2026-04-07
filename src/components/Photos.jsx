import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const PhotoViewer = () => {
  const [allPhotos, setAllPhotos] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('front_relaxed');
  const [loading, setLoading] = useState(false);
  const [fullScreenPhoto, setFullScreenPhoto] = useState(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const photoTypes = [
    { key: 'front_relaxed', label: 'Front Relaxed' },
    { key: 'side_relaxed', label: 'Side Relaxed' },
    { key: 'back_relaxed', label: 'Back Relaxed' },
    { key: 'front_flexed', label: 'Front Flexed' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'shoulders', label: 'Shoulders' }
  ];

  useEffect(() => {
    fetchAllPhotos();
  }, [selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAllPhotos = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('progress_photos')
        .select('*')
        .order('photo_date', { ascending: true });
      
      if (user && user.email !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query;

      if (data && !error) {
        const categoryPhotos = [];
        for (const record of data) {
          if (record[selectedCategory]) {
            const { data: urlData } = await supabase.storage
              .from('progress-photos')
              .getPublicUrl(record[selectedCategory]);
            categoryPhotos.push({
              date: record.photo_date,
              url: urlData.publicUrl,
              category: selectedCategory
            });
          }
        }
        setAllPhotos(categoryPhotos);
      } else {
        setAllPhotos([]);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
    }
    setLoading(false);
  };

  return (
    <div className="card">
      <h2>View Progress Photos</h2>
      
      <div className="form-group">
        <label>Select Category:</label>
        <select 
          value={selectedCategory} 
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="form-input"
        >
          {photoTypes.map(type => (
            <option key={type.key} value={type.key}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading photos...</div>
      ) : allPhotos.length > 0 ? (
        <div className="photo-timeline">
          <h3>{photoTypes.find(t => t.key === selectedCategory)?.label} Progress</h3>
          <div className="photo-viewer-grid">
            {allPhotos.map((photo, index) => (
              <div key={index} className="photo-view-card" onClick={() => { setFullScreenPhoto(photo); setCurrentPhotoIndex(index); }}>
                <div className="photo-date">{photo.date}</div>
                <div className="photo-display">
                  <img src={photo.url} alt={`${selectedCategory} ${photo.date}`} className="progress-photo" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-data">
          <p>No {photoTypes.find(t => t.key === selectedCategory)?.label} photos found</p>
          <p>Upload photos to see your progress over time.</p>
        </div>
      )}

      {fullScreenPhoto && (
        <div className="photo-modal" onClick={() => setFullScreenPhoto(null)}>
          <div className="photo-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setFullScreenPhoto(null)}>×</button>
            
            {currentPhotoIndex > 0 && (
              <button className="nav-arrow nav-prev" onClick={() => {
                const newIndex = currentPhotoIndex - 1;
                setCurrentPhotoIndex(newIndex);
                setFullScreenPhoto(allPhotos[newIndex]);
              }}>‹</button>
            )}
            
            <img src={fullScreenPhoto.url} alt={`${fullScreenPhoto.category} ${fullScreenPhoto.date}`} />
            
            {currentPhotoIndex < allPhotos.length - 1 && (
              <button className="nav-arrow nav-next" onClick={() => {
                const newIndex = currentPhotoIndex + 1;
                setCurrentPhotoIndex(newIndex);
                setFullScreenPhoto(allPhotos[newIndex]);
              }}>›</button>
            )}
            
            <div className="photo-modal-info">
              <span>{photoTypes.find(t => t.key === fullScreenPhoto.category)?.label}</span>
              <span>{fullScreenPhoto.date}</span>
              <span>{currentPhotoIndex + 1} / {allPhotos.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Photos = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState({
    front_relaxed: null,
    side_relaxed: null,
    back_relaxed: null,
    front_flexed: null,
    biceps: null,
    shoulders: null
  });
  const [existingPhotos, setExistingPhotos] = useState({});
  const [loading, setLoading] = useState(false);

  const photoTypes = [
    { key: 'front_relaxed', label: 'Front Relaxed' },
    { key: 'side_relaxed', label: 'Side Relaxed' },
    { key: 'back_relaxed', label: 'Back Relaxed' },
    { key: 'front_flexed', label: 'Front Flexed' },
    { key: 'biceps', label: 'Biceps' },
    { key: 'shoulders', label: 'Shoulders' }
  ];

  useEffect(() => {
    fetchExistingPhotos();
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchExistingPhotos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('progress_photos')
        .select('*')
        .eq('photo_date', selectedDate);
      
      if (user && user.email !== 'admin') {
        query = query.eq('user_id', user.id);
      }
      
      const { data, error } = await query.single();

      if (data && !error) {
        setExistingPhotos(data);
      } else {
        setExistingPhotos({});
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
    }
  };

  const handleFileSelect = (photoType, file) => {
    if (file && file.type.startsWith('image/')) {
      setPhotos(prev => ({
        ...prev,
        [photoType]: file
      }));
    }
  };

  const uploadPhoto = async (photoType, file) => {
    const fileName = `${selectedDate}_${photoType}_${Date.now()}.${file.name.split('.').pop()}`;
    
    console.log('Uploading file:', fileName, 'Size:', file.size);
    
    const { data, error } = await supabase.storage
      .from('progress-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
    
    console.log('Upload successful:', data);
    return data.path;
  };

  const savePhotos = async () => {
    setLoading(true);
    try {
      const photoUrls = { ...existingPhotos };

      // Upload new photos
      for (const [photoType, file] of Object.entries(photos)) {
        if (file) {
          console.log(`Uploading ${photoType}:`, file.name);
          const photoPath = await uploadPhoto(photoType, file);
          photoUrls[photoType] = photoPath;
          console.log(`Uploaded ${photoType} to:`, photoPath);
        }
      }

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      
      const photoData = {
        photo_date: selectedDate,
        front_relaxed: photoUrls.front_relaxed || null,
        side_relaxed: photoUrls.side_relaxed || null,
        back_relaxed: photoUrls.back_relaxed || null,
        front_flexed: photoUrls.front_flexed || null,
        biceps: photoUrls.biceps || null,
        shoulders: photoUrls.shoulders || null,
        updated_at: new Date().toISOString()
      };
      
      if (user && user.email !== 'admin') {
        photoData.user_id = user.id;
      }
      
      console.log('Saving to database:', photoData);
      
      const { data, error } = await supabase
        .from('progress_photos')
        .upsert(photoData, {
          onConflict: 'photo_date'
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Database save successful:', data);

      setPhotos({
        front_relaxed: null,
        side_relaxed: null,
        back_relaxed: null,
        front_flexed: null,
        biceps: null,
        shoulders: null
      });
      
      fetchExistingPhotos();
      alert('Photos saved successfully!');
    } catch (err) {
      console.error('Error saving photos:', err);
      alert(`Error saving photos: ${err.message}`);
    }
    setLoading(false);
  };



  return (
    <div>
      <div className="card">
        <h2>Progress Photos</h2>
        
        <div className="form-group">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="photos-grid">
          {photoTypes.map(({ key, label }) => (
            <div key={key} className="photo-upload-card">
              <div className="photo-header">
                <span className="photo-label">{label}</span>
              </div>
              
              {existingPhotos[key] ? (
                <div className="existing-photo">
                  <div className="photo-placeholder">
                    📷 Photo Uploaded
                  </div>
                  <button 
                    className="btn-secondary"
                    onClick={() => document.getElementById(`file-${key}`).click()}
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div className="photo-upload">
                  <div className="photo-placeholder">
                    {photos[key] ? '✅ Ready to Upload' : '📷 No Photo'}
                  </div>
                  <button 
                    className="btn-secondary"
                    onClick={() => document.getElementById(`file-${key}`).click()}
                  >
                    {photos[key] ? 'Change' : 'Select'}
                  </button>
                </div>
              )}
              
              <input
                id={`file-${key}`}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => handleFileSelect(key, e.target.files[0])}
              />
            </div>
          ))}
        </div>

        {Object.values(photos).some(photo => photo) && (
          <button 
            className="btn"
            onClick={savePhotos}
            disabled={loading}
            style={{ marginTop: '20px' }}
          >
            {loading ? 'Uploading...' : 'Save Photos'}
          </button>
        )}
      </div>

      <PhotoViewer />
    </div>
  );
};

export default Photos;