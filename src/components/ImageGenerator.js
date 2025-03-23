import React, { useState } from 'react';
import './Generator.css';

const imageStyles = {
  cartoon: {
    label: "Cartoon",
    prompt: "in a fun cartoon style"
  },
  meme: {
    label: "Meme Style 😂",
    prompt: "as a funny meme"
  }
};

const imageMoods = {
  any: {
    label: "Any Level",
    prompt: "balanced and natural style"
  }
};

const StarsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [selectedMood, setSelectedMood] = useState('any');
  const [weirdness, setWeirdness] = useState(30);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);



  const loadingMessages = [
    "Teaching AI to hold a brush... 🎨",
    "Mixing digital paint... 🖌️",
    "Consulting with Bob Ross... 🌲",
    "Adding happy little accidents... ⭐",
    "Downloading creativity.exe... 💫",
    "Arguing with the art critic AI... 🤖",
    "Finding the right shade of awesome... 🌈",
    "Making sure it's Instagram-worthy... 📸",
    "Sprinkling some magic pixels... ✨",
    "Converting coffee to art... ☕"
  ];

  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

  const [error, setError] = useState(null);

  const generateImage = async () => {
    if (!prompt || isLoading) return;
    setError(null);

    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);

    try {
      setIsLoading(true);
      if (!prompt.trim()) {
        setError('Please enter a prompt');
        setIsLoading(false);
        return;
      }

      const weirdLevel = weirdness > 70 ? 'extremely surreal and weird' : 
                        weirdness > 40 ? 'quirky and unusual' : 
                        'mostly normal with slight quirkiness';
      
      const fullPrompt = `Create an image: ${prompt}. Mood: ${imageMoods[selectedMood].prompt}. Style: ${imageStyles[selectedStyle].prompt}. ${weirdLevel}. Make it engaging and fun!`;
      console.log('Generating image with prompt:', fullPrompt);

      const response = await fetch('https://excuse-machine.onrender.com/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: fullPrompt })
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      setImageUrl(data.url);
    } catch (error) {
      console.error('Image generation error:', error);
      setError(error.message || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="image-generator">
      <h1>Visions 🎨</h1>
      <div className="controls">
        <div className="filters">
          <div className="filter-group">
            <select 
              value={selectedStyle} 
              onChange={(e) => setSelectedStyle(e.target.value)}
            >
              {Object.entries(imageStyles).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select 
              value={selectedMood} 
              onChange={(e) => setSelectedMood(e.target.value)}
            >
              {Object.entries(imageMoods).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-group">
          <div className="slider-control">
            <div className="slider-label">Weirdness</div>
            <input
              type="range"
              min="0"
              max="100"
              value={weirdness}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setWeirdness(value);
                const slider = e.target;
                const percent = (value - slider.min) / (slider.max - slider.min);
                slider.style.setProperty('--value-percent', `${percent * 100}%`);
              }}
              className="slider"
              ref={(el) => {
                if (el) {
                  const percent = (weirdness - el.min) / (el.max - el.min);
                  el.style.setProperty('--value-percent', `${percent * 100}%`);
                }
              }}
            />
            <div className="slider-value">{weirdness}%</div>
          </div>
        </div>

        <div className="prompt-input">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A happy alligator celebrating being acquired..."
            className="text-input"
          />
          <button 
            onClick={generateImage} 
            disabled={!prompt || isLoading}
            className={`generate-button ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? '🎨 Generating...' : '✨ Generate'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className={`image-container ${(isLoading || imageUrl) ? 'visible' : ''} ${isLoading ? 'loading' : ''}`}>
        {imageUrl && !isLoading && (
          <img src={imageUrl} alt="Generated content" />
        )}
        {isLoading && (
          <div className="loading-text">{loadingMessage}</div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;
