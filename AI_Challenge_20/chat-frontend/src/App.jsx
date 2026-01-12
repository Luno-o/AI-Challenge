import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ChatPage from './components/ChatPage';
import AssistantPage from './components/AssistantPage';

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ background: '#2d3748', padding: '10px 20px', display: 'flex', gap: '20px' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>
          💬 Chat
        </Link>
        <Link to="/assistant" style={{ color: 'white', textDecoration: 'none', fontWeight: 600 }}>
          🤖 Assistant
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
      </Routes>
    </BrowserRouter>
  );
}
