import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import ChatPage from './pages/ChatPage';
import AssistantPage from './pages/AssistantPage';
import LlmOptimizationPage from './pages/LlmOptimizationPage';
import SupportPage from './pages/SupportPage';
import TeamAssistantPage from './pages/TeamAssistantPage';
import AnalyticsPage from './pages/AnalyticsPage';

import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      {/* Навигация */}
      <nav className="main-nav">
        <div className="nav-container">
          <h1 className="nav-logo">🤖 AI Assistant</h1>
          <div className="nav-links">
            <Link to="/chat" className="nav-link">💬 Chat</Link>
            <Link to="/assistant" className="nav-link">🤖 Assistant</Link>
            <Link to="/support" className="nav-link">💬 Support</Link>
            <Link to="/team" className="nav-link">🎯 Team Assistant</Link>
            <Link to="/llm-optimization" className="nav-link">🧪 LLM Lab</Link>
            <Link to="/analytics" className="nav-link">Analytics</Link>
          </div>
        </div>
      </nav>

      {/* Роуты */}
      <Routes>
        <Route path="/" element={<ChatPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/team" element={<TeamAssistantPage />} />
        <Route path="/llm-optimization" element={<LlmOptimizationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
