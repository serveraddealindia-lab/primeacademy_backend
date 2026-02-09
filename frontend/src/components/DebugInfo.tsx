const DebugInfo = (): JSX.Element => {
  const viteApiUrl = import.meta.env.VITE_API_BASE_URL;
  const apiUrl = viteApiUrl || 'http://localhost:5000/api';
  
  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      background: 'red', 
      color: 'white', 
      padding: '10px', 
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <div>VITE_API_BASE_URL: {viteApiUrl || 'UNDEFINED'}</div>
      <div>Effective API URL: {apiUrl}</div>
      <div>Environment: {process.env.NODE_ENV}</div>
    </div>
  );
};

export default DebugInfo;