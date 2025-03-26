import React, { useState, useCallback, useEffect } from 'react';
import './Generator.css';
import SpeechButton from './SpeechButton';

const SparkleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.5 10.5L21 12l-1.5-1.5L18 12l1.5-1.5zM12 4.5L13.5 6 12 4.5 10.5 6 12 4.5zM4.5 10.5L6 12l-1.5-1.5L3 12l1.5-1.5z"/>
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
    navigator.clipboard.writeText(currentItem.text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = currentItem.text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (e) {
          console.error('Fallback copy failed:', e);
        }
        document.body.removeChild(textArea);
      });
  }, [currentItem]);

  if (!data || !categories) {
    return <div>Loading...</div>;
  }

  return (
    <div className="generator">
      <h2>
        {title}{' '}{isDateIdeas ? '💝' : '🤔'}
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
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <SpeechButton 
              text={currentItem.text}
              meaning={currentItem.meaning}
              seriousness={selectedSeriousness}
              selectedBudget={selectedBudget}
              selectedExperience={selectedExperience}
              type={isDateIdeas ? 'dates' : (isBuzzwords ? 'buzzwords' : 'excuses')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Generator;
