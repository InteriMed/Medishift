import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './Header.module.css';
import profileIcon from '../../../assets/img/profile-user.png';

const Header = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const headerRef = useRef(null);
  const [disableHover, setDisableHover] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!disableHover) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsClosing(false);
      setShowDropdown(true);
    }
  };

  const handleMouseLeave = () => {
    setIsClosing(true);
    timeoutRef.current = setTimeout(() => {
      setShowDropdown(false);
      setIsClosing(false);
    }, 300);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    
    setIsDragging(true);
    const rect = headerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const headerWidth = headerRef.current.offsetWidth;
    const headerHeight = headerRef.current.offsetHeight;
    
    let newX = e.clientX - dragOffset.x;
    let newY = e.clientY - dragOffset.y;

    // Stick to borders
    const margin = 10;
    if (newX < margin) newX = 0;
    if (newX > window.innerWidth - headerWidth - margin) {
      newX = window.innerWidth - headerWidth;
    }
    if (newY < margin) newY = 0;
    if (newY > window.innerHeight - headerHeight - margin) {
      newY = window.innerHeight - headerHeight;
    }

    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const preventDragHandler = (e) => {
    e.preventDefault();
    return false;
  };

  const menuItems = [
    { icon: '⊞', label: 'Dashboard', path: '/dashboard' },
    { icon: '📅', label: 'Calendar', path: '/calendar' },
    { icon: '💬', label: 'Messages', path: '/messages' },
    { icon: '👥', label: 'HR Core', path: '/hr' },
    { icon: '📞', label: 'Contacts', path: '/contacts' },
    { icon: '⚙️', label: 'Settings', path: '/settings' },
    { icon: '', label: 'Logout', path: '/logout' },
  ];

  const UserMenu = () => (
    <div 
      className={styles.userMenu} 
      ref={dropdownRef}
      onMouseEnter={() => {
        if (!disableHover && !isDragging) {
          handleMouseEnter();
        }
      }}
      onMouseLeave={() => {
        if (!disableHover && !isDragging) {
          handleMouseLeave();
        }
      }}
    >
      <button 
        className={styles.iconButton}
      >
        <img src={profileIcon} alt="Profile" className={styles.profileIcon} />
      </button>
      
      {showDropdown && (
        <div 
          className={`${styles.dropdown} ${isClosing ? styles.closing : ''}`}
          style={{ transformOrigin: 'top right' }}
        >
          {menuItems.map((item, index) => (
            <NavLink 
              key={index} 
              to={item.path}
              className={styles.dropdownItem}
              draggable={false}
              onDragStart={preventDragHandler}
            >
              <span className={styles.menuIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <header 
      ref={headerRef}
      className={`${styles.header} ${isDragging ? styles.dragging : ''}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        right: 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      <UserMenu />
    </header>
  );
};

export default Header;
