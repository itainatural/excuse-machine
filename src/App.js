import React, { useState } from 'react';
import './App.css';
import './components/Generator.css';
import Generator from './components/Generator';
import ImageGenerator from './components/ImageGenerator';
import excuses from './data/excuses.json';
import dateIdeas from './data/dateIdeas.json';
import buzzwords from './data/buzzwords.json';



const QuestionIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function App() {
  const [activeGenerator, setActiveGenerator] = useState('excuses');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  if (!excuses || !dateIdeas) {
    console.error('Missing data:', { excuses, dateIdeas });
    return <div>Error loading data</div>;
  }

  console.log('App rendered with data:', { excuses, dateIdeas });

  const excuseCategories = {
    work: 'Work 💼',
    social: 'Social 🎉',
    school: 'School 📚'
  };

  const dateCategories = {
    first_date: 'First Date 💫',
    dating: 'Dating 💕',
    serious: 'Serious Relationship ❤️',
    married: 'Married with Kids 👨‍👩‍👧‍👦'
  };

  const buzzwordCategories = {
    creative_testing: 'Creative Testing 🧪',
    ad_formats: 'Ad Formats 📱',
    growth_levers: 'Growth Levers 📈',
    campaign_scaling: 'Campaign Scaling 🚀',
    creative_angles: 'Creative Angles 🎯',
    platform_hacks: 'Platform Hacks ⚡',
    testing_frameworks: 'Testing Frameworks 🔬'
  };

  const generators = [
    {
      id: 'excuses',
      title: 'Excuses',
      emoji: '🤔',
      data: excuses,
      categories: excuseCategories,
      component: Generator
    },
    {
      id: 'date',
      title: 'Date Ideas',
      emoji: '💝',
      data: dateIdeas,
      categories: dateCategories,
      component: Generator
    },
    {
      id: 'buzzwords',
      title: 'Buzzwords',
      emoji: '🚀',
      data: buzzwords,
      categories: buzzwordCategories,
      component: Generator
    },
    {
      id: 'visions',
      title: 'Visions',
      emoji: '🎨',
      component: ImageGenerator
    }
  ];

  const activeGen = generators.find(g => g.id === activeGenerator);
  if (!activeGen) {
    console.error('No generator found for:', activeGenerator);
    return <div>Error: Generator not found</div>;
  }

  return (
    <div className="App">
      <nav className="navbar">
        <button 
          className="menu-button" 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          aria-label="Toggle menu"
        >
          🍔
        </button>
        <h1>Creative Hacks</h1>
      </nav>
      <div className="app-layout">
        <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <ul className="nav-items">
            {generators.map(gen => (
              <li
                key={gen.id}
                className={`nav-item ${activeGenerator === gen.id ? 'active' : ''}`}
                onClick={() => setActiveGenerator(gen.id)}
              >
                <span className="nav-item-emoji">{gen.emoji}</span>
                <span className="nav-item-text">{gen.title}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={`main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="generator-container">
            {activeGen && (
              activeGen.component === Generator ? (
                <Generator 
                  title={activeGen.title}
                  data={activeGen.data}
                  categories={activeGen.categories}
                />
              ) : (
                <activeGen.component />
              )
            )}
          </div>
          <div className="footer">
            <p className="footer-text">Because life's too short to always tell the truth! 😏</p>
            <button className="help-button" aria-label="Help">
              <QuestionIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
