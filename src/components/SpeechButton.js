import React, { useState } from 'react';

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
        // Dynamic voice selection
        let voiceType;
        if (type === 'dates') {
          voiceType = 'coral';
        } else if (type === 'excuses') {
          voiceType = 'nova';
        } else if (type === 'buzzwords' && selectedExperience === 'guru') {
          voiceType = 'onyx';
        } else {
          voiceType = 'echo';
        }

        return {
          voice: voiceType,
          speed: seriousness === 'casual' ? 1.1 : 0.9,
          model: type === 'buzzwords' ? 'tts-1-hd' : 'tts-1'
        };
      };

      const voiceSettings = getVoiceSettings();
      const response = await fetch('https://excuse-machine.onrender.com/api/generate-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          ...voiceSettings
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const { audio: audioData } = await response.json();
      
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
      generateSpeech();
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
      style={{
        padding: '8px 16px',
        borderRadius: '20px',
        border: 'none',
        backgroundColor: isPlaying ? '#ddd' : '#4CAF50',
        color: 'white',
        cursor: isPlaying ? 'default' : 'pointer',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '16px'
      }}
    >
      {getButtonEmoji()}
      {isPlaying ? 'Speaking...' : 'Speak'}
    </button>
  );
};

export default SpeechButton;
