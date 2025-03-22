import React, { useState } from 'react';
import './Generator.css';

const imageStyles = {
  cartoon: {
    label: "Cartoon",
    prompt: "in a fun cartoon style"
  },
  pixel: {
    label: "Pixel Art",
    prompt: "as detailed pixel art"
  },
  meme: {
    label: "Meme",
    prompt: "as a funny meme"
  },
  comic: {
    label: "Comic",
    prompt: "as a comic book panel"
  },
  claymation: {
    label: "Clay",
    prompt: "in claymation style"
  }
};

const imageMoods = {
  meme: {
    label: "Meme Style 😂",
    prompt: "internet meme style, funny and viral-worthy, exaggerated humor"
  },
  derp: {
    label: "Derpy 🤪",
    prompt: "silly and goofy, derpy style, intentionally awkward and funny"
  },
  epic: {
    label: "Epic Win 🏆",
    prompt: "over-the-top awesome, epic win moment, triumphant and hilarious"
  },
  fail: {
    label: "Epic Fail 🤦‍♂️",
    prompt: "comical fail moment, funny disaster, humorous mishap"
  },
  chaos: {
    label: "Pure Chaos 🌪️",
    prompt: "absolute mayhem, hilariously chaotic, unexpected combinations"
  }
};

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [selectedMood, setSelectedMood] = useState('meme');
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
    setShowPlaceholder(true);
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

      <div className="image-container">
        {isLoading ? (
          <div className="image-placeholder">
            <div className="placeholder-content">
              <span>🎨</span>
              <div className="loading-text">{loadingMessage}</div>
            </div>
            <div className="reflection"></div>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt="Generated content" />
        ) : (
          <div className="image-placeholder empty">
            <div className="placeholder-content">
              <span>🖼️</span>
              <div className="placeholder-text">Your image will appear here</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;
