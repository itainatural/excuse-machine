import React, { useState, useCallback, useEffect } from 'react';
import './Generator.css';

const Generator = ({ title, data, categories }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedBudget, setSelectedBudget] = useState('any');
  const [selectedSeriousness, setSelectedSeriousness] = useState('any');
  const [currentItem, setCurrentItem] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const isDateIdeas = title.toLowerCase().includes('date');
  
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

    if (!isDateIdeas && selectedSeriousness !== 'any') {
      filteredItems = filteredItems.filter(item => item.seriousness === selectedSeriousness);
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
  }, [data, selectedCategory, isDateIdeas, selectedBudget, selectedSeriousness]);

  const copyToClipboard = useCallback(() => {
    if (!currentItem) return;
    
    const fullText = `${currentItem.text} ${currentItem.emoji}`;
    navigator.clipboard.writeText(fullText)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => console.error('Failed to copy text: ', err));
  }, [currentItem]);

  if (!data || !categories) {
    return <div>Loading...</div>;
  }

  return (
    <div className="generator">
      <h2>
        {title}{' '}<span className="title-emoji">{isDateIdeas ? '💝' : '🤔'}</span>
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
        )}
      </div>

      <button onClick={generateItem} className="generate-button">
        Generate {title}
        <span className="button-sparkle">✨</span>
      </button>

      {currentItem && (
        <div className="result-container">
          <p className="result-text">{currentItem.text}</p>
          <p className="result-text" style={{ marginTop: '0.5rem' }}>{currentItem.emoji}</p>
          <button 
            onClick={copyToClipboard} 
            className={`copy-button ${copySuccess ? 'success' : ''}`}
          >
            Copy to Clipboard
          </button>
        </div>
      )}
      <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '2rem', textAlign: 'center' }}>
        Because life's too short to always tell the truth! 😉
      </p>
    </div>
  );
};

export default Generator;
