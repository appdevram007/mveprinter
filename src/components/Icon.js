import React from 'react';
import { Text } from 'react-native';

const Icon = ({ name, size = 20, color = '#666', style }) => {
  const getIconChar = () => {
    switch (name) {
      case 'search': return '🔍';
      case 'filter': return '⚙️';
      case 'close': return '✕';
      case 'close-circle': return '✕';
      case 'time': return '🕒';
      case 'restaurant': return '🍽️';
      case 'cube': return '📦';
      case 'call': return '📞';
      case 'print': return '🖨️';
      case 'refresh': return '🔄';
      case 'wifi': return '📶';
      case 'settings': return '⚙️';
      case 'receipt': return '🧾';
      case 'lock': return '🔒';
      case 'key': return '🔑';
      case 'arrow-back': return '←';
      case 'hardware-chip': return '💻';
      case 'thermometer': return '🌡️';
      case 'paper-plane': return '📄';
      case 'log-out': return '🚪';
      case 'checkmark': return '✓';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'eye': return '👁️';
      case 'download': return '📥';
      case 'printer': return '🖨️';
      case 'database': return '🗄️';
      case 'api': return '🔌';
      default: return '•';
    }
  };

  return (
    <Text style={[{ fontSize: size, color }, style]}>
      {getIconChar()}
    </Text>
  );
};

export default Icon;