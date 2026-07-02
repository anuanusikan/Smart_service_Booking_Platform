import { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    fetch('http://localhost:5000/api/test')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage('Failed to connect to server'));
  }, []);

  return (
    <div>
      <h1>SkillLink</h1>
      <p>Backend says: {message}</p>
    </div>
  );
}

export default App;