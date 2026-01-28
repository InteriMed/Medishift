import React from 'react';
import { Link } from 'react-router-dom';
import './links.css';

const Links = ({ to, children, className, onClick }) => {
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

export default Links; 