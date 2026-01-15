import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import ChatPage from './pages/ChatPage';

import AssistantPage from './pages/AssistantPage';

import SupportPage from './pages/SupportPage';
import { TeamAssistantPage } from './pages/TeamAssistantPage'; // ✨ НОВЫЙ

export default function App() {

  return (
    <BrowserRouter>
      <div style={{ padding: '10px', background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
        <Link to="/" style={{ marginRight: '20px' }}>💬 Chat</Link>
        <Link to="/assistant" style={{ marginRight: '20px' }}>🤖 Assistant</Link>
        <Link to="/support">💬 Support</Link>
         <Link to="/team">🎯 Team Assistant</Link> {/* ✨ НОВЫЙ */}
      </div>
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/support" element={<SupportPage />} />
           <Route path="/team" element={<TeamAssistantPage />} /> {/* ✨ НОВЫЙ */}
      </Routes>
    </BrowserRouter>
  );

}
