import React, { useState, useEffect } from 'react';
import './Generator.css';
import SpeechButton from './SpeechButton';

const imageStyles = {
  cartoon: {
    label: "Cartoon",
    prompt: "in a fun cartoon style"
  },
  meme: {
    label: "Meme Style 😂",
    prompt: "as a funny meme"
  },
  realistic: {
    label: "Realistic 📸",
    prompt: "in a photorealistic style, highly detailed"
  }
};

const imageMoods = {
  any: {
    label: "Any Level",
    prompt: "balanced and natural style"
  }
};

const MicrophoneIcon = ({ isRecording }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isRecording ? "#34C759" : "currentColor"} strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </svg>
);

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cartoon');
  const [selectedMood, setSelectedMood] = useState('any');
  const [weirdness, setWeirdness] = useState(30);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Initialize speech recognition
    if (window.webkitSpeechRecognition) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsRecording(false);
        // Auto-generate after voice input
        generateImage();
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognition);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      setPrompt('');
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleKeyPress = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !isLoading) {
      e.preventDefault();
      await generateImage();
    }
  };



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

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/generate-image`, {
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
              className="style-selector"
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
              className="mood-selector"
            >
              {Object.entries(imageMoods).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="slider-container">
          <div className="slider-header">
            <span>Weirdness</span>
            <span>{weirdness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={weirdness}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setWeirdness(value);
            }}
            className="slider"
          />
        </div>


        <div className="prompt-container">
          <div className="input-group">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your vision and press Enter, or use voice input →"
              className="text-input"
              disabled={isLoading}
            />
            <button
              onClick={toggleRecording}
              className={`voice-input-button ${isRecording ? 'recording' : ''}`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
              disabled={isLoading}
            >
              <MicrophoneIcon isRecording={isRecording} />
            </button>
          </div>
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

      {imageUrl && !isLoading && (
        <div className="speech-button-container">
          <SpeechButton 
            text={`Here's what I generated based on your request: ${prompt}. The image shows ${imageStyles[selectedStyle].label} style with ${weirdness}% weirdness level.`}
            type="visions"
            seriousness={weirdness > 70 ? 'quirky' : 'casual'}
          />
        </div>
      )}
    </div>
  );
};

export default ImageGenerator;
