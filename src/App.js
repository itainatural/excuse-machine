import React, { useState } from 'react';
import './App.css';
import './components/Generator.css';
import Generator from './components/Generator';
import ImageGenerator from './components/ImageGenerator';
import excuses from './data/excuses.json';
import dateIdeas from './data/dateIdeas.json';
import buzzwords from './data/buzzwords.json';





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

        </div>
      </div>
    </div>
  );
}

export default App;
