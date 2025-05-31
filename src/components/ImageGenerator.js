import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Generator.css';
import LoadingAnimation from './LoadingAnimation';

const imageStyles = {
  cartoon: {
    label: "Cartoon",
    prompt: "in a fun cartoon style"
  },
  meme: {
    label: "Meme",
    prompt: "as a funny meme"
  },
  realistic: {
    label: "Realistic",
    prompt: "in a photorealistic style, highly detailed"
  }
};

const imageMoods = {
  basic: {
    label: "Basic",
    prompt: "simple and clean",
    complexity: 0.3
  },
  standard: {
    label: "Standard",
    prompt: "natural and balanced",
    complexity: 0.6
  },
  detailed: {
    label: "Detailed",
    prompt: "highly detailed",
    complexity: 0.8
  },
  ultra: {
    label: "Ultra",
    prompt: "ultra detailed, maximum quality",
    complexity: 1.0
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
  const [microphoneInitialized, setMicrophoneInitialized] = useState(false);
  const [selectedMood, setSelectedMood] = useState('standard');
  const [weirdness, setWeirdness] = useState(30);

  // Initialize microphone permissions
  useEffect(() => {
    const initializeMicrophone = async () => {
      if (!microphoneInitialized) {
        console.log('Initializing microphone permissions...');
        try {
          // Only check permission status, don't request yet
          const result = await navigator.permissions.query({ name: 'microphone' });
          console.log('Initial microphone permission state:', result.state);
          setHasPermission(result.state === 'granted');
        } catch (error) {
          console.log('Could not query initial permission state:', error);
          // Don't set hasPermission to false here, wait for actual request
        }
        setMicrophoneInitialized(true);
      }
    };

    initializeMicrophone();
  }, [microphoneInitialized]);

  // Handle slider value
  useEffect(() => {
    const slider = document.querySelector('.slider');
    if (slider) {
      slider.style.setProperty('--slider-value', `${weirdness}%`);
    }
  }, [weirdness]);
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [hasPermission, setHasPermission] = useState(null); // null = unknown, true = granted, false = denied

  const loadingMessages = useMemo(() => [
    "GPT Image is creating your masterpiece... 🎬",
    "Generating advanced AI visuals... 🧠",
    "Crafting your vision with precision... 🖌️",
    "Adding intricate details... 🌲",
    "Applying cinematic quality... ⭐",
    "Rendering photorealistic elements... 🎭",
    "Finding the perfect visual style... 🌈",
    "Making sure it's stunning... 📸",
    "Sprinkling some AI magic... ✨",
    "Converting imagination to reality... 🚀"
  ], []);

  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0]);

  const [error, setError] = useState(null);

  const handleImageGeneration = useCallback(async () => {
    if (!prompt || isLoading) return;
    setError(null);
    
    const complexity = imageMoods[selectedMood].complexity;

    setLoadingMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);

    try {
      setIsLoading(true);

      if (!prompt.trim()) {
        throw new Error('Please enter a prompt');
      }

      const weirdLevel = weirdness > 70 ? 'extremely surreal and weird' : 
                        weirdness > 40 ? 'quirky and unusual' : 
                        'mostly normal with slight quirkiness';
      
      // Enhanced prompt for GPT-4o with Sora
      const fullPrompt = `Create a high-quality, photorealistic image: ${prompt}. Mood: ${imageMoods[selectedMood].prompt}. Style: ${imageStyles[selectedStyle].prompt}. ${weirdLevel}. Make it engaging, cinematic, and visually stunning!`;

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: fullPrompt,
          complexity: complexity
        }),
        mode: 'cors',
        credentials: 'omit'
      });

      const data = await response.json();
      console.log('Image generation response data:', data);
      
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        throw new Error(data.error || 'Failed to generate image');
      }

      if (!data.url) {
        console.error('No URL in response data:', data);
        throw new Error('No image URL in response');
      }

      console.log('Setting image URL:', data.url);
      setImageUrl(data.url);
      
    } catch (error) {
      console.error('Image generation error:', {
        message: error.message,
        type: error.name,
        apiUrl: process.env.REACT_APP_API_URL,
        stack: error.stack
      });
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setError('Cannot connect to server. Please check your internet connection or try again later.');
      } else {
        setError(error.message || 'Failed to generate image');
      }
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, loadingMessages, weirdness, selectedMood, selectedStyle]);

  useEffect(() => {
    // Check initial microphone permission
    checkMicrophonePermission();

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setHasPermission(false);
          if (!hasPermission) {
            alert('Microphone access is required. Please allow access in your browser settings and refresh the page.');
          }
        } else if (event.error === 'network') {
          alert('Network error occurred. Please check your connection.');
        } else {
          alert('An error occurred with voice input. Please try again.');
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      setRecognition(recognition);
    }
  }, [handleImageGeneration, setPrompt, setIsRecording]);

  const checkMicrophonePermission = async () => {
    try {
      // Log available permissions API
      console.log('Checking permissions API availability:', {
        permissions: !!navigator.permissions,
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!navigator.mediaDevices?.getUserMedia
      });

      // First try to get the permission state
      const result = await navigator.permissions.query({ name: 'microphone' });
      console.log('Permission query result:', result.state);
      
      // Update state based on current permission
      const isGranted = result.state === 'granted';
      setHasPermission(isGranted);

      // Listen for permission changes
      result.onchange = () => {
        const newState = result.state === 'granted';
        console.log('Permission state changed:', result.state);
        setHasPermission(newState);
      };

      return isGranted;
    } catch (error) {
      console.log('Permissions API failed, falling back to getUserMedia');
      // If permissions API is not supported, try getUserMedia directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('Successfully got audio stream');
        stream.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind, track.label);
          track.stop();
        });
        setHasPermission(true);
        return true;
      } catch (mediaError) {
        const errorDetails = {
          name: mediaError.name,
          message: mediaError.message,
          constraint: mediaError.constraint,
          stack: mediaError.stack
        };
        console.error('Permission check error:', errorDetails);
        setHasPermission(false);
        return false;
      }
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      // Check browser support first
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        const error = new Error('Browser does not support getUserMedia');
        console.error('Browser support check failed:', {
          mediaDevices: !!navigator.mediaDevices,
          getUserMedia: !!navigator.mediaDevices?.getUserMedia
        });
        throw error;
      }

      console.log('Checking existing permission...');
      const permissionStatus = await checkMicrophonePermission();
      if (permissionStatus === true) {
        console.log('Already have permission');
        return true;
      }

      console.log('Requesting permission...');
      // Request permission with explicit audio-only and quality settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      console.log('Got audio stream, cleaning up...');
      // Immediately stop the stream after getting permission
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label);
        track.stop();
      });

      setHasPermission(true);
      return true;

    } catch (error) {
      // Log detailed error information
      const errorDetails = {
        name: error.name,
        message: error.message,
        constraint: error.constraint,
        stack: error.stack,
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          vendor: navigator.vendor
        }
      };
      console.error('Microphone permission error:', errorDetails);
      
      setHasPermission(false);

      // Show appropriate error message based on the error
      if (error.name === 'NotAllowedError') {
        // Check if permission was dismissed or denied
        const isDismissed = document.visibilityState === 'visible' && !document.hidden;
        if (isDismissed) {
          alert('Please allow microphone access when prompted. Click the microphone icon again to retry.');
        } else {
          alert('To enable voice input:\n\n1. Click the lock/info icon in your browser\'s address bar\n2. Find "Microphone" in the permissions\n3. Allow access\n4. Refresh the page');
        }
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        alert('Cannot access your microphone. Please check if another application is using it, then refresh the page.');
      } else if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice input is not supported in your browser. Please try Chrome, Edge, or Safari.');
      } else {
        alert('Failed to access microphone. Please check your browser settings and try again.\n\nIf the problem persists, try refreshing the page or using a different browser.');
      }
      return false;
    }
  };

  const toggleRecording = async () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    // If we're already recording, stop it
    if (isRecording) {
      try {
        recognition.stop();
        console.log('Stopped recording');
      } catch (error) {
        console.error('Error stopping recognition:', error);
        setIsRecording(false);
      }
      return;
    }

    // If we haven't initialized yet, do it now
    if (!microphoneInitialized) {
      console.log('Initializing microphone before recording...');
      await new Promise(resolve => {
        setMicrophoneInitialized(true);
        // Wait for the initialization effect to run
        setTimeout(resolve, 100);
      });
    }

    // Request microphone permission
    console.log('Requesting microphone permission...');
    const permissionGranted = await requestMicrophonePermission();
    if (!permissionGranted) {
      console.log('Microphone permission denied');
      return;
    }

    try {
      setPrompt('');
      recognition.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recognition:', error.name, error.message);
      setIsRecording(false);
    }
  };

  const handleKeyPress = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !isLoading) {
      e.preventDefault();
      await handleImageGeneration();
    }
  };

  return (
    <div className="image-generator">
      <h1>GPT Image Visions 🎬</h1>
      <div className="controls">
        <div className="filters-container">
          <div className="filter-group">
            <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)}>
              {Object.entries(imageStyles).map(([key, style]) => (
                <option key={key} value={key}>{style.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <select value={selectedMood} onChange={(e) => setSelectedMood(e.target.value)}>
              {Object.entries(imageMoods).map(([key, mood]) => (
                <option key={key} value={key}>{mood.label}</option>
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
        {isLoading ? (
          <LoadingAnimation messages={loadingMessages} />
        ) : imageUrl ? (
          <img src={imageUrl} alt="Generated content" className="generated-image" />
        ) : null}
      </div>


    </div>
  );
};

export default ImageGenerator;
