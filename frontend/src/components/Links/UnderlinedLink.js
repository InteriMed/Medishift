import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const UnderlinedLink = ({ text, to, color = '#000000', hoverColor = '#808080', fontSize = '14px', bottomMargin = '0px', marginTop = '0px' }) => {
  const [isHovered, setIsHovered] = useState(false);

  const linkStyle = {
    color: isHovered ? hoverColor : color,
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'color 0.3s ease',
    marginBottom: bottomMargin,
    marginTop: marginTop,
    display: 'inline-block',
    fontSize: fontSize,
  };

  return (
    <Link
      to={to}
      style={linkStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {text}
    </Link>
  );
};

UnderlinedLink.propTypes = {
  text: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  color: PropTypes.string,
  hoverColor: PropTypes.string,
  fontSize: PropTypes.string,
  bottomMargin: PropTypes.string,
};

export default UnderlinedLink;
