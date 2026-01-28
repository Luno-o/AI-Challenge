import React, { useState, useEffect } from 'react';
import './LlmOptimizationPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const LlmOptimizationPage = () => {
  const [models, setModels] = useState({});
  const [presets, setPresets] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  
  // Форма для одиночного запроса
  const [prompt, setPrompt] = useState('Объясни что такое Docker простыми словами');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [topK, setTopK] = useState(40);
  const [numPredict, setNumPredict] = useState(256);
  const [repeatPenalty, setRepeatPenalty] = useState(1.1);
  
  // Результаты
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [compareResults, setCompareResults] = useState([]);
  
  // Шаблоны
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateData, setTemplateData] = useState({
    title: 'Реализовать JWT аутентификацию',
    description: 'Добавить токены для API',
    priority: 'high'
  });

  // Загрузка доступных моделей
  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_URL}/api/llm/models`);
      const data = await res.json();
      setModels(data.available_models || {});
      setPresets(data.task_presets || []);
      setCurrentModel(data.current_model || '');
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  };

  // Одиночный запрос с кастомными параметрами
  const handleOptimizedQuery = async () => {
    setLoading(true);
    setResult(null);

    try {
      const startTime = Date.now();
      const res = await fetch(`${API_URL}/api/llm/optimized`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          temperature,
          top_p: topP,
          top_k: topK,
          num_predict: numPredict,
          repeat_penalty: repeatPenalty,
          preset: selectedPreset || undefined
        })
      });

      const data = await res.json();
      const duration = Date.now() - startTime;

      setResult({
        ...data,
        clientDuration: duration
      });
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // Сравнение разных конфигураций
  const handleCompareConfigs = async () => {
    setLoading(true);
    setCompareResults([]);

    const configs = [
      { name: '❄️ Low Temp (0.3)', temperature: 0.3, num_predict: 200 },
      { name: '🌡️ Medium Temp (0.7)', temperature: 0.7, num_predict: 200 },
      { name: '🔥 High Temp (0.9)', temperature: 0.9, num_predict: 200 }
    ];

    try {
      const res = await fetch(`${API_URL}/api/llm/test-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, configs })
      });

      const data = await res.json();
      setCompareResults(data.results || []);
    } catch (err) {
      console.error('Compare failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Использование шаблона
  const handleTemplateQuery = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/llm/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_name: selectedTemplate,
          data: templateData,
          preset: 'task_analysis'
        })
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="llm-optimization-page">
      <header className="llm-header">
        <h1>🧪 LLM Optimization Lab</h1>
        <div className="model-info">
          <span>Current Model: <strong>{currentModel}</strong></span>
          <span>Available Presets: {presets.length}</span>
        </div>
      </header>

      <div className="llm-container">
        {/* LEFT PANEL - Configuration */}
        <aside className="llm-sidebar">
          <section className="config-section">
            <h3>⚙️ Parameters</h3>
            
            <label>
              Preset:
              <select value={selectedPreset} onChange={(e) => setSelectedPreset(e.target.value)}>
                <option value="">None (Custom)</option>
                {presets.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>

            <label>
              Temperature: {temperature}
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
              <small>Creativity (0 = strict, 2 = creative)</small>
            </label>

            <label>
              Top P: {topP}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={topP}
                onChange={(e) => setTopP(parseFloat(e.target.value))}
              />
              <small>Diversity (0.9 recommended)</small>
            </label>

            <label>
              Top K: {topK}
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
              />
              <small>Token selection pool</small>
            </label>

            <label>
              Max Tokens: {numPredict}
              <input
                type="range"
                min="50"
                max="2048"
                step="50"
                value={numPredict}
                onChange={(e) => setNumPredict(parseInt(e.target.value))}
              />
              <small>Response length limit</small>
            </label>

            <label>
              Repeat Penalty: {repeatPenalty}
              <input
                type="range"
                min="1"
                max="2"
                step="0.05"
                value={repeatPenalty}
                onChange={(e) => setRepeatPenalty(parseFloat(e.target.value))}
              />
              <small>Avoid repetition (1.1 recommended)</small>
            </label>
          </section>

          <section className="presets-info">
            <h4>📋 Available Presets</h4>
            <ul>
              <li><strong>coding</strong> - Low temp, precise</li>
              <li><strong>creative</strong> - High temp, diverse</li>
              <li><strong>factual</strong> - Very low temp</li>
              <li><strong>chat</strong> - Balanced</li>
              <li><strong>task_analysis</strong> - Project tasks</li>
            </ul>
          </section>
        </aside>

        {/* CENTER - Main Content */}
        <main className="llm-main">
          <div className="tabs">
            <button className="tab active">Single Query</button>
            <button className="tab" onClick={handleCompareConfigs} disabled={loading}>
              Compare Configs
            </button>
          </div>

          <section className="query-section">
            <h3>💬 Prompt</h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              rows={4}
            />

            <div className="action-buttons">
              <button
                onClick={handleOptimizedQuery}
                disabled={loading || !prompt}
                className="btn-primary"
              >
                {loading ? '⏳ Processing...' : '🚀 Run Query'}
              </button>
            </div>
          </section>

          {/* Template Section */}
          <section className="template-section">
            <h3>📝 Use Template</h3>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Select template...</option>
              <option value="task_analysis">Task Analysis</option>
              <option value="code_review">Code Review</option>
              <option value="explain_concept">Explain Concept</option>
            </select>

            {selectedTemplate === 'task_analysis' && (
              <div className="template-inputs">
                <input
                  placeholder="Task title"
                  value={templateData.title}
                  onChange={(e) => setTemplateData({...templateData, title: e.target.value})}
                />
                <input
                  placeholder="Description"
                  value={templateData.description}
                  onChange={(e) => setTemplateData({...templateData, description: e.target.value})}
                />
                <select
                  value={templateData.priority}
                  onChange={(e) => setTemplateData({...templateData, priority: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <button onClick={handleTemplateQuery} disabled={loading}>
                  Analyze Task
                </button>
              </div>
            )}
          </section>

          {/* Results */}
          {result && (
            <section className="result-section">
              <h3>✨ Result</h3>
              {result.error ? (
                <div className="error">{result.error}</div>
              ) : (
                <>
                  <div className="result-content">
                    {result.answer || result.response}
                  </div>
                  <div className="result-meta">
                    <span>⏱️ Duration: {result.duration || result.clientDuration}ms</span>
                    {result.config && (
                      <span>🎛️ Config: {JSON.stringify(result.config)}</span>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {/* Comparison Results */}
          {compareResults.length > 0 && (
            <section className="compare-section">
              <h3>📊 Configuration Comparison</h3>
              <div className="compare-grid">
                {compareResults.map((r, i) => (
                  <div key={i} className={`compare-card ${r.success ? '' : 'error'}`}>
                    <h4>{r.config}</h4>
                    {r.success ? (
                      <>
                        <p className="response-preview">
                          {r.response.substring(0, 150)}...
                        </p>
                        <div className="compare-meta">
                          <span>⏱️ {r.duration}ms</span>
                          <span>📏 {r.response.length} chars</span>
                        </div>
                      </>
                    ) : (
                      <p className="error">{r.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* RIGHT PANEL - Model Info */}
        <aside className="llm-info">
          <section className="model-details">
            <h3>📦 Model Info</h3>
            {Object.keys(models).length > 0 && models[currentModel] && (
              <div className="model-card">
                <p><strong>Name:</strong> {models[currentModel].name}</p>
                <p><strong>Size:</strong> {models[currentModel].size}</p>
                <p><strong>Quantization:</strong> {models[currentModel].quantization}</p>
                <p><strong>Context:</strong> {models[currentModel].contextWindow} tokens</p>
                <p><strong>Description:</strong> {models[currentModel].description}</p>
              </div>
            )}
          </section>

          <section className="tips">
            <h4>💡 Tips</h4>
            <ul>
              <li>Lower temperature = more predictable</li>
              <li>Higher temperature = more creative</li>
              <li>Use presets for common tasks</li>
              <li>Adjust max tokens to control length</li>
              <li>Compare configs to find optimal settings</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default LlmOptimizationPage;
