import React from 'react';
import { Link } from 'react-router-dom';
import './UnderlinedLink.css';

const UnderlinedLink = ({ to, children, className, onClick }) => {
  return (
    <Link 
      to={to} 
      className={`underlined-link ${className || ''}`}
      onClick={onClick}
    >
      {children}
    </Link>
  );
};

export default UnderlinedLink; 