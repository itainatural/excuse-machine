import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { useSpring, animated } from '@react-spring/web';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './Generator.css';
import SpeechButton from './SpeechButton';

// Lazy load components
const SparkleIcon = lazy(() => import('./SparkleIcon'));

// Loading fallback
const LoadingSparkle = () => (
  <div className="animate-pulse w-6 h-6 bg-gray-200 rounded-full"></div>
);

const Generator = ({ title, data, categories }) => {
  // Animation for content fade-in
  const fadeIn = useSpring({
    from: { opacity: 0, transform: 'translateY(20px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: { tension: 280, friction: 20 }
  });

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('Generator state:', { title, data, categories, selectedCategory });
    }
  }, [title, data, categories, selectedCategory]);

  // Memoize the filter functions
  const filterByBudget = useCallback((items, budget) => {
    return budget === 'any' ? items : items.filter(item => item.budget === budget);
  }, []);

  const filterBySeriousness = useCallback((items, seriousness) => {
    return seriousness === 'any' ? items : items.filter(item => item.seriousness === seriousness);
  }, []);

  const filterByExperience = useCallback((items, experience) => {
    return experience === 'any' ? items : items.filter(item => item.experience === experience);
  }, []);

  const generateItem = useCallback(() => {
    if (!data || !selectedCategory || !data[selectedCategory]) return;

    const categoryItems = data[selectedCategory];
    if (!Array.isArray(categoryItems)) {
      console.error('Invalid category items:', categoryItems);
      return;
    }

    let filteredItems = [...categoryItems];

    if (isDateIdeas) {
      filteredItems = filterByBudget(filteredItems, selectedBudget);
    }

    if (!isDateIdeas && !isBuzzwords) {
      filteredItems = filterBySeriousness(filteredItems, selectedSeriousness);
    }
    
    if (isBuzzwords) {
      filteredItems = filterByExperience(filteredItems, selectedExperience);
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
        setIsLoading(true);
setError(null);

try {
          setIsLoading(true);
          setError(null);
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
    <animated.div style={fadeIn} className="generator">
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {isLoading && (
        <div className="mt-4">
          <Skeleton count={3} className="mb-2" />
        </div>
      )}
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
    </animated.div>
  );
};

const WrappedGenerator = React.memo(Generator);

export default function App({ title, data, categories }) {
  return (
    <Suspense fallback={<div className="animate-pulse">Loading...</div>}>
      <WrappedGenerator title={title} data={data} categories={categories} />
    </Suspense>
  );
}
