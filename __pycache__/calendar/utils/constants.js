// Calendar colors definitions
export const CALENDAR_COLORS = [
  { id: 'blue', color: '#0f54bc', color1: '#a8c1ff', color2: '#4da6fb', name: 'Personal' },
  { id: 'red', color: '#f54455', color1: '#ffbbcf', color2: '#ff6064', name: 'Missing employees' },
  { id: 'purple', color: '#6c6ce7', color1: '#e6e6ff', color2: '#a08dfc', name: 'Waiting for confirmation' },
  { id: 'green', color: '#0da71c', color1: '#ccffce', color2: '#32cb65', name: 'Approved employee' },
  { id: 'grey', color: '#8c8c8c', color1: '#e6e6e6', color2: '#b3b3b3', name: 'Unvalidated' },
];

// Modification types for event changes
export const MODIFICATION_TYPES = {
  MOVE: 'move',
  RESIZE: 'resize',
  PANEL: 'panel'
}; 