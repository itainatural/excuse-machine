import React, { useState, useEffect } from 'react';
import './LoadingAnimation.css';

const LoadingAnimation = ({ messages }) => {
  const [currentMessage, setCurrentMessage] = useState(messages[0]);

  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentMessage(prevMessage => {
        const currentIndex = messages.indexOf(prevMessage);
        const nextIndex = (currentIndex + 1) % messages.length;
        return messages[nextIndex];
      });
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, [messages]);

  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-inner"></div>
        <div className="spinner-inner"></div>
        <div className="spinner-inner"></div>
      </div>
      <div className="loading-message">{currentMessage}</div>
    </div>
  );
};

export default LoadingAnimation;
