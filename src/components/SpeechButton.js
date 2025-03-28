import React, { useState, useEffect, useRef } from 'react';
import './SpeechButton.css';

const MicrophoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
  </svg>
);

const SpeechButton = ({ 
  text, 
  meaning, 
  seriousness = 'casual', 
  selectedBudget = 'any',
  selectedExperience = 'any',
  type = 'excuses' 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimeoutRef = useRef(null);
  
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const voices = {
    alloy: { emoji: '🤖', name: 'Alloy' },
    echo: { emoji: '🎭', name: 'Echo' },
    fable: { emoji: '🎨', name: 'Fable' },
    onyx: { emoji: '💎', name: 'Onyx' },
    nova: { emoji: '✨', name: 'Nova' },
    shimmer: { emoji: '🌟', name: 'Shimmer' }
  };

  const generateSpeech = async () => {
    try {
      console.log('Starting speech generation...');
      setIsPlaying(true);

      // Get voice settings based on content type and seriousness
      const getVoiceSettings = () => {
        // Dynamic voice and model selection based on content type
        let voiceType, modelType;

        // Set model type first
        modelType = 'tts-1-hd'; // Always use HD quality

        // Dynamic voice selection based on content type
        switch (type) {
          case 'dates':
            voiceType = seriousness === 'casual' ? 'nova' : 'shimmer'; // Playful vs Romantic
            break;
          case 'excuses':
            voiceType = seriousness === 'casual' ? 'echo' : 'onyx'; // Casual vs Professional
            break;
          case 'buzzwords':
            if (selectedExperience === 'guru') {
              voiceType = 'onyx'; // Authoritative voice for experts
            } else {
              voiceType = 'fable'; // Engaging voice for regular content
            }
            break;
          case 'visions':
            voiceType = seriousness === 'quirky' ? 'fable' : 'shimmer';
            break;
          default:
            voiceType = 'alloy'; // Neutral fallback voice
        }

        return {
          voice: voiceType,
          speed: seriousness === 'casual' ? 1.1 : 0.9,
          model: modelType
        };
      };

      const voiceSettings = getVoiceSettings();
      console.log('Making speech API request to:', process.env.REACT_APP_API_URL);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/generate-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          ...voiceSettings
        }),
        mode: 'cors',
        credentials: 'omit' // Don't send credentials since we're using * origin
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Speech server error:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.error || 'Failed to generate speech');
      }

      if (!data.audio) {
        console.error('Invalid response:', data);
        throw new Error('No audio data in response');
      }

      console.log('Speech generated successfully');
      const { audio: audioData } = data;
      
      // Convert base64 to blob
      const binaryString = window.atob(audioData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url);
      
      // Play the audio
      const audioPlayer = new Audio(url);
      audioPlayer.play();
      
      // Clean up when audio finishes playing
      audioPlayer.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      console.error('Error generating speech:', error);
      setIsPlaying(false);
    }
  };

  const handleClick = () => {
    if (!isPlaying) {
      setIsAnimating(true);
      generateSpeech();
      
      // Reset animation after 2 seconds
      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, 2000);
    }
  };

  // Get emoji based on content type
  const getButtonEmoji = () => {
    if (type === 'dates') {
      return '🗣️';
    } else if (type === 'excuses') {
      return '🔊';
    } else if (type === 'buzzwords') {
      return selectedExperience === 'guru' ? '🎙️' : '🔈';
    }
    return '🔊';
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPlaying}
      className={`voice-input-button ${isPlaying ? 'recording' : ''}`}
      aria-label={isPlaying ? 'Speaking...' : 'Speak text'}
    >
      <MicrophoneIcon />
    </button>
  );
};

export default SpeechButton;
