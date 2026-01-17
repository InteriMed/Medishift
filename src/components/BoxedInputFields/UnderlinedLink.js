import React from 'react';
import { Link } from 'react-router-dom';
import './UnderlinedLink.css';

const UnderlinedLink = ({ text, to, color = '#333', margin = '0', onClick, className = '' }) => {
  const style = {
    color,
    margin
  };
  
  if (onClick) {
    return (
      <a 
        href="#" 
        className={`underlined-link ${className}`}
        style={style}
        onClick={(e) => {
          e.preventDefault();
          onClick(e);
        }}
      >
        {text}
      </a>
    );
  }
  
  return (
    <Link 
      to={to} 
      className={`underlined-link ${className}`}
      style={style}
    >
      {text}
    </Link>
  );
};

export default UnderlinedLink; 