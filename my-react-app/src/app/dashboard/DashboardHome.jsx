import React from 'react';
import bannerImage from '../../assets/banner.png';

const DashboardHome = ({ sessionData }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 64px)',
      padding: '24px',
      background: 'var(--color-background)',
      overflowY: 'auto'
    }}>
      <img 
        src={bannerImage} 
        alt="Banner" 
        style={{
          maxWidth: '100%',
          height: 'auto',
          display: 'block'
        }}
      />
    </div>
  );
};

export default DashboardHome;
