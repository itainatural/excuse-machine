import React, { useState } from 'react';
import OpenAI from 'openai';
import { Buffer } from 'buffer';

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
      
      console.log('API Key:', process.env.REACT_APP_OPENAI_API_KEY ? 'Present' : 'Missing');
      const openai = new OpenAI({
        apiKey: process.env.REACT_APP_OPENAI_API_KEY,
        dangerouslyAllowBrowser: true
      });

      console.log('Creating speech with text:', text);
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

        const settings = {
          voice: voiceType,
          speed: seriousness === 'casual' ? 1.1 : 0.9,
          // Adjust other settings based on context
          model: type === 'buzzwords' ? 'tts-1-hd' : 'tts-1'
        };

        return settings;
      };

      const voiceSettings = getVoiceSettings();
      const mp3 = await openai.audio.speech.create({
        model: voiceSettings.model,
        voice: voiceSettings.voice,
        input: text,
        speed: voiceSettings.speed
      });

      // Convert the response to a Buffer
      const buffer = Buffer.from(await mp3.arrayBuffer());
      
      // Create a blob URL from the buffer
      const blob = new Blob([buffer], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      
      setAudioUrl(url);
      
      // Play the audio
      const audio = new Audio(url);
      audio.play();
      
      // Clean up when audio finishes playing
      audio.onended = () => {
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
