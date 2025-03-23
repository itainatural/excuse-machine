import React, { useState, useCallback, useEffect } from 'react';
import './Generator.css';
import SpeechButton from './SpeechButton';

const SparkleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const MicIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Generator = ({ title, data, categories }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState('any');
  const [selectedSeriousness, setSelectedSeriousness] = useState('any');
  const [selectedExperience, setSelectedExperience] = useState('any');
  const [currentItem, setCurrentItem] = useState(null);
  const [copied, setCopied] = useState(false);

  const isDateIdeas = title.toLowerCase().includes('date');
  const isBuzzwords = title.toLowerCase().includes('buzzword');
  
  const experienceLevels = {
    any: 'Any Level',
    junior: 'Junior 🌱',
    mid: 'Mid-Level 💪',
    senior: 'Senior 🎓',
    guru: 'Guru 🧙‍♂️'
  };

  const budgetRanges = {
    any: 'Any Budget',
    free: 'Free 🆓',
    low: 'Low 💰',
    medium: 'Medium 💰💰',
    high: 'High 💰💰💰'
  };
  
  useEffect(() => {
    if (!data) return;
    const firstCategory = Object.keys(data)[0];
    setSelectedCategory(firstCategory);
  }, [data]);

  useEffect(() => {
    console.log('Generator state:', { title, data, categories, selectedCategory });
  }, [title, data, categories, selectedCategory]);

  const generateItem = useCallback(() => {
    if (!data || !selectedCategory || !data[selectedCategory]) return;

    const categoryItems = data[selectedCategory];
    if (!Array.isArray(categoryItems)) {
      console.error('Invalid category items:', categoryItems);
      return;
    }

    let filteredItems = [...categoryItems];

    if (isDateIdeas && selectedBudget !== 'any') {
      filteredItems = filteredItems.filter(item => item.budget === selectedBudget);
    }

    if (!isDateIdeas && !isBuzzwords && selectedSeriousness !== 'any') {
      filteredItems = filteredItems.filter(item => item.seriousness === selectedSeriousness);
    }
    
    if (isBuzzwords && selectedExperience !== 'any') {
      filteredItems = filteredItems.filter(item => item.experience === selectedExperience);
    }
    
    if (filteredItems.length === 0) {
      const noItemsMessages = [
        { text: "Oops! Your budget filter is as empty as my wallet after payday! 🙈", emoji: "💸" },
        { text: "Even my AI brain can't find dates this cheap! Time to break the piggy bank? 🐷", emoji: "🏦" },
        { text: "Error 404: Romance not found in this price range! Maybe try selling a kidney? (Just kidding!) 😅", emoji: "💝" },
        { text: "Your budget is giving me error messages in binary: 0110... just kidding, I speak human! 🤖", emoji: "💰" },
        { text: "I searched high and low, but even the bargain bin cupid is out of ideas! 🏹", emoji: "😅" }
      ];
      const randomMessage = noItemsMessages[Math.floor(Math.random() * noItemsMessages.length)];
      setCurrentItem(randomMessage);
      return;
    }
    const randomIndex = Math.floor(Math.random() * filteredItems.length);
    setCurrentItem(filteredItems[randomIndex]);
  }, [data, selectedCategory, isDateIdeas, isBuzzwords, selectedBudget, selectedSeriousness, selectedExperience]);

  const copyToClipboard = useCallback(() => {
    if (!currentItem) return;
    
    const fullText = `${currentItem.text} ${currentItem.emoji}`;
    navigator.clipboard.writeText(fullText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => console.error('Failed to copy text: ', err));
  }, [currentItem]);

  if (!data || !categories) {
    return <div>Loading...</div>;
  }

  return (
    <div className="generator">
      <h2>
        {title}{' '}{isDateIdeas ? '💝' : isBuzzwords ? '🚀' : '🤔'}
      </h2>
      
      <div className="filters-container">
        <div className="category-selector">
          <select 
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {Object.entries(categories).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {isDateIdeas ? (
          <div className="budget-selector">
            <select 
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
            >
              {Object.entries(budgetRanges).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          isBuzzwords ? (
            <div className="experience-selector">
              <select
                value={selectedExperience}
                onChange={(e) => setSelectedExperience(e.target.value)}
              >
                {Object.entries(experienceLevels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="seriousness-selector">
              <select
                value={selectedSeriousness}
                onChange={(e) => setSelectedSeriousness(e.target.value)}
              >
                <option value="any">Any Level</option>
                <option value="casual">Casual 😌</option>
                <option value="serious">Serious 😐</option>
                <option value="emergency">Emergency 😰</option>
              </select>
            </div>
          )
        )}
      </div>

      <button onClick={generateItem} className="generate-button black">
        Generate {title} <SparkleIcon />
      </button>

      {currentItem && (
        <div className="result-container">
          <div className="result-content">
            <p className="result-text">{currentItem.text}</p>
            <div className="emoji-container">{currentItem.emoji}</div>
            {isBuzzwords && currentItem.meaning && (
              <p className="result-meaning">{currentItem.meaning}</p>
            )}
          </div>
          <div className="action-buttons">
            <button 
              onClick={copyToClipboard} 
              className={`copy-button ${copied ? 'copied' : ''}`}
            >
              {copied ? '✓ Copied!' : '📋 Copy to Clipboard'}
            </button>
            <SpeechButton 
              text={currentItem.text}
              meaning={currentItem.meaning}
              seriousness={selectedSeriousness}
              selectedBudget={selectedBudget}
              selectedExperience={selectedExperience}
              type={isDateIdeas ? 'dates' : (isBuzzwords ? 'buzzwords' : 'excuses')}
              icon={<MicIcon />}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Generator;
