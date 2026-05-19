# 🤖 AI Food Scanner Setup Guide

## Getting Your Gemini API Key

### Step 1: Get Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### Step 2: Add API Key to Your App
1. Open `src/components/FoodAI.jsx`
2. Find line 9: `const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';`
3. Replace `'YOUR_GEMINI_API_KEY'` with your actual API key
4. Save the file

### Step 3: Deploy
```bash
npm run deploy
```

## 🎯 How It Works

### Features:
- **📸 Take Photo** - Use device camera to capture food
- **📁 Upload Image** - Select image from gallery
- **🤖 AI Analysis** - Gemini identifies food and calculates nutrition
- **📊 Auto-fill** - Adds detected values to your daily entry
- **✏️ Manual Adjustment** - You can modify AI results

### What AI Detects:
- ✅ **Food Items** with confidence levels
- ✅ **Calories** per item and total
- ✅ **Protein, Carbs, Fat** breakdown
- ✅ **Portion Size** estimation
- ✅ **Additional Notes** about the food

### Pricing:
- **Free Tier**: 60 requests per minute
- **Very affordable** for personal use
- **No monthly fees** - pay per use

## 🚀 Usage Tips

### For Best Results:
1. **Good lighting** - Take photos in well-lit areas
2. **Clear view** - Make sure food is clearly visible
3. **Single items** - Works best with individual food items
4. **Check results** - Always verify AI estimates
5. **Manual adjustment** - Modify values if needed

### Supported Foods:
- ✅ **Common foods** (pizza, burger, salad, etc.)
- ✅ **Fruits and vegetables**
- ✅ **Packaged foods**
- ✅ **Restaurant meals**
- ✅ **Home-cooked dishes**

The AI will provide confidence levels (high/medium/low) so you know how accurate the estimate is!

## 🔒 Privacy & Security

- **Images processed** by Google's Gemini AI
- **No permanent storage** of your photos
- **Nutrition data only** - no personal information shared
- **Secure API** communication with HTTPS

Ready to try AI-powered food tracking! 🍽️🤖