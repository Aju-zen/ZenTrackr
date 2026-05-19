import React, { useState, useRef } from 'react';

const FoodAI = ({ onFoodAnalyzed }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [editableResult, setEditableResult] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState(null); // 'photo', 'text', or null
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Gemini API configuration
  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyDDzDHgRXOyBxBXCFM7k57dgzisd90hWJU';
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`;

  // Check if API key is configured
  const isAPIConfigured = GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY';

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      alert('Camera access is required for food scanning. Please allow camera permission.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      analyzeWithGemini(imageData);
      stopCamera();
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        analyzeWithGemini(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeTextWithGemini = async (foodText) => {
    if (!isAPIConfigured) {
      alert('Gemini API key not configured. Please add your API key to enable AI food analysis.\n\nSee GEMINI_SETUP.md for instructions.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const requestBody = {
        contents: [{
          parts: [
            {
              text: `Analyze this food description and provide nutrition information in this exact JSON format:
              {
                "foodItems": [
                  {
                    "name": "food name",
                    "quantity": "quantity described",
                    "calories": number,
                    "protein": number,
                    "carbs": number,
                    "fat": number,
                    "confidence": "high/medium/low"
                  }
                ],
                "totalCalories": number,
                "totalProtein": number,
                "totalCarbs": number,
                "totalFat": number,
                "notes": "any additional notes about the food or portion size"
              }
              
              Food description: "${foodText}"
              
              Please provide realistic nutrition values for the described food items and quantities. If the description is unclear, make reasonable assumptions and set confidence to "low".`
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        }
      };

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const nutritionData = JSON.parse(jsonMatch[0]);
        setAnalysisResult(nutritionData);
        setEditableResult({
          totalCalories: nutritionData.totalCalories,
          totalProtein: nutritionData.totalProtein,
          totalCarbs: nutritionData.totalCarbs,
          totalFat: nutritionData.totalFat
        });
      } else {
        throw new Error('Could not parse nutrition data from AI response');
      }

    } catch (error) {
      console.error('Error analyzing food text:', error);
      alert('Failed to analyze food description. Please try again or enter values manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };
    if (!isAPIConfigured) {
      alert('Gemini API key not configured. Please add your API key to enable AI food scanning.\n\nSee GEMINI_SETUP.md for instructions.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Remove data URL prefix
      const base64Image = imageData.split(',')[1];

      const requestBody = {
        contents: [{
          parts: [
            {
              text: `Analyze this food image and provide nutrition information in this exact JSON format:
              {
                "foodItems": [
                  {
                    "name": "food name",
                    "calories": number,
                    "protein": number,
                    "carbs": number,
                    "fat": number,
                    "confidence": "high/medium/low"
                  }
                ],
                "totalCalories": number,
                "totalProtein": number,
                "totalCarbs": number,
                "totalFat": number,
                "notes": "any additional notes about the food or portion size"
              }
              
              Please estimate realistic portion sizes and provide accurate nutritional values. If you can't identify the food clearly, set confidence to "low" and provide your best estimate.`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        }
      };

      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const nutritionData = JSON.parse(jsonMatch[0]);
        setAnalysisResult(nutritionData);
        setEditableResult({
          totalCalories: nutritionData.totalCalories,
          totalProtein: nutritionData.totalProtein,
          totalCarbs: nutritionData.totalCarbs,
          totalFat: nutritionData.totalFat
        });
      } else {
        throw new Error('Could not parse nutrition data from AI response');
      }

    } catch (error) {
      console.error('Error analyzing food:', error);
      alert('Failed to analyze food. Please try again or enter values manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const useAnalysisResult = () => {
    if (editableResult && onFoodAnalyzed) {
      onFoodAnalyzed({
        calories: editableResult.totalCalories,
        protein: editableResult.totalProtein,
        carbs: editableResult.totalCarbs,
        fat: editableResult.totalFat,
        details: analysisResult
      });
      setAnalysisResult(null);
      setEditableResult(null);
      setIsEditing(false);
    }
  };

  const clearResult = () => {
    setAnalysisResult(null);
    setEditableResult(null);
    setIsEditing(false);
    setInputMode(null);
    setTextInput('');
  };

  const handleTextAnalysis = () => {
    if (textInput.trim()) {
      analyzeTextWithGemini(textInput.trim());
    }
  };

  const handleEditChange = (field, value) => {
    setEditableResult(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="food-ai-container">
      {!isAPIConfigured && (
        <div className="api-setup-notice">
          <h4>🔧 Setup Required</h4>
          <p>To use AI food scanning, you need to add your Gemini API key.</p>
          <p style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)'}}>See GEMINI_SETUP.md for instructions</p>
        </div>
      )}
      
      {isAPIConfigured && !inputMode && !analysisResult && !isAnalyzing && (
        <div className="ai-options">
          <h4>🤖 AI Food Scanner</h4>
          <p style={{fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '15px'}}>
            Analyze food using photo or text description to automatically detect calories and macros
          </p>
          
          <div className="input-mode-selection">
            <button 
              className="mode-option"
              onClick={() => setInputMode('photo')}
            >
              <div className="mode-icon">📸</div>
              <div className="mode-title">Take Photo</div>
              <div className="mode-desc">Scan food with camera</div>
            </button>
            
            <button 
              className="mode-option"
              onClick={() => setInputMode('text')}
            >
              <div className="mode-icon">✏️</div>
              <div className="mode-title">Type Food</div>
              <div className="mode-desc">Describe what you ate</div>
            </button>
          </div>
        </div>
      )}
      
      {isAPIConfigured && inputMode === 'photo' && !showCamera && !analysisResult && !isAnalyzing && (
        <div className="ai-options">
          <h4>📸 Photo Analysis</h4>
          <p style={{fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '15px'}}>
            Take a photo or upload an image of your food
          </p>
          
          <div className="ai-buttons">
            <button 
              className="btn-secondary" 
              onClick={startCamera}
              style={{marginRight: '10px'}}
            >
              📸 Take Photo
            </button>
            
            <button 
              className="btn-secondary" 
              onClick={() => fileInputRef.current?.click()}
            >
              📁 Upload Image
            </button>
          </div>
          
          <button 
            className="btn-back"
            onClick={() => setInputMode(null)}
            style={{marginTop: '15px'}}
          >
            ← Back to Options
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{display: 'none'}}
          />
        </div>
      )}
      
      {isAPIConfigured && inputMode === 'text' && !analysisResult && !isAnalyzing && (
        <div className="ai-options">
          <h4>✏️ Text Analysis</h4>
          <p style={{fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '15px'}}>
            Describe your food and AI will estimate nutrition values
          </p>
          
          <div className="text-input-container">
            <textarea
              className="food-text-input"
              placeholder="e.g. 2 dosa with sambar, 1 cup rice with dal, large pizza slice..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={3}
            />
            
            <div className="text-examples">
              <p style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px'}}>Examples:</p>
              <div className="example-tags">
                <span className="example-tag" onClick={() => setTextInput('2 dosa with coconut chutney')}>2 dosa with chutney</span>
                <span className="example-tag" onClick={() => setTextInput('1 cup rice with dal')}>1 cup rice with dal</span>
                <span className="example-tag" onClick={() => setTextInput('chicken biryani 1 plate')}>chicken biryani 1 plate</span>
                <span className="example-tag" onClick={() => setTextInput('2 roti with sabzi')}>2 roti with sabzi</span>
              </div>
            </div>
          </div>
          
          <div className="ai-buttons">
            <button 
              className="btn" 
              onClick={handleTextAnalysis}
              disabled={!textInput.trim()}
            >
              🤖 Analyze Food
            </button>
            
            <button 
              className="btn-secondary"
              onClick={() => setInputMode(null)}
              style={{marginLeft: '10px'}}
            >
              ← Back to Options
            </button>
          </div>
        </div>
      )}

      {showCamera && (
        <div className="camera-container">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline
            style={{
              width: '100%',
              maxWidth: '400px',
              borderRadius: '12px',
              marginBottom: '15px'
            }}
          />
          <div className="camera-controls">
            <button className="btn" onClick={capturePhoto}>
              📸 Capture Food
            </button>
            <button className="btn-secondary" onClick={stopCamera} style={{marginLeft: '10px'}}>
              ❌ Cancel
            </button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="analyzing-container">
          <div className="loading-spinner">🤖</div>
          <h4>Analyzing food...</h4>
          <p style={{color: 'rgba(255, 255, 255, 0.7)'}}>
            {inputMode === 'text' ? 
              'AI is processing your food description and calculating nutrition values' :
              'AI is identifying the food and calculating nutrition values'
            }
          </p>
        </div>
      )}

      {analysisResult && (
        <div className="analysis-result">
          <h4>🍽️ AI Analysis Result</h4>
          
          <div className="detected-foods">
            {analysisResult.foodItems.map((food, index) => (
              <div key={index} className="food-item">
                <div className="food-name">
                  {food.name} {food.quantity && `(${food.quantity})`}
                  <span className={`confidence ${food.confidence}`}>
                    ({food.confidence} confidence)
                  </span>
                </div>
                <div className="food-nutrition">
                  {food.calories} cal • {food.protein}g protein • {food.carbs}g carbs • {food.fat}g fat
                </div>
              </div>
            ))}
          </div>

          <div className="total-nutrition">
            <h5>📊 Total Nutrition:</h5>
            {!isEditing ? (
              <div className="nutrition-grid">
                <div className="nutrition-item">
                  <span className="label">Calories:</span>
                  <span className="value">{editableResult?.totalCalories || analysisResult.totalCalories}</span>
                </div>
                <div className="nutrition-item">
                  <span className="label">Protein:</span>
                  <span className="value">{editableResult?.totalProtein || analysisResult.totalProtein}g</span>
                </div>
                <div className="nutrition-item">
                  <span className="label">Carbs:</span>
                  <span className="value">{editableResult?.totalCarbs || analysisResult.totalCarbs}g</span>
                </div>
                <div className="nutrition-item">
                  <span className="label">Fat:</span>
                  <span className="value">{editableResult?.totalFat || analysisResult.totalFat}g</span>
                </div>
              </div>
            ) : (
              <div className="nutrition-edit-grid">
                <div className="edit-item">
                  <label>Calories:</label>
                  <input
                    type="number"
                    value={editableResult?.totalCalories || ''}
                    onChange={(e) => handleEditChange('totalCalories', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="edit-item">
                  <label>Protein (g):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editableResult?.totalProtein || ''}
                    onChange={(e) => handleEditChange('totalProtein', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="edit-item">
                  <label>Carbs (g):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editableResult?.totalCarbs || ''}
                    onChange={(e) => handleEditChange('totalCarbs', e.target.value)}
                    className="edit-input"
                  />
                </div>
                <div className="edit-item">
                  <label>Fat (g):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editableResult?.totalFat || ''}
                    onChange={(e) => handleEditChange('totalFat', e.target.value)}
                    className="edit-input"
                  />
                </div>
              </div>
            )}
          </div>

          {analysisResult.notes && (
            <div className="ai-notes">
              <p><strong>Notes:</strong> {analysisResult.notes}</p>
            </div>
          )}

          <div className="result-actions">
            <button className="btn" onClick={useAnalysisResult}>
              ✅ Use These Values
            </button>
            <button 
              className="btn-secondary" 
              onClick={toggleEdit}
              style={{marginLeft: '10px'}}
            >
              {isEditing ? '💾 Save Edits' : '✏️ Edit Values'}
            </button>
            <button className="btn-secondary" onClick={clearResult} style={{marginLeft: '10px'}}>
              🔄 Try Again
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{display: 'none'}} />
    </div>
  );
};

export default FoodAI;