// client/src/components/RagModeSelector.jsx

export function RagModeSelector({ ragMode, setRagMode }) {
  const modes = [
    { value: null, label: 'Basic Chat' },
    { value: 'basic_rag', label: 'RAG Basic' },
    { value: 'reranked_rag', label: 'RAG Reranked' },
    { value: 'compare_rerank', label: 'Compare' }
  ];

  return (
    <div className="rag-mode-selector">
      {modes.map((m) => (
        <button
          key={m.label}
          type="button"
          className={`rag-btn ${ragMode === m.value ? 'active' : ''}`}
          onClick={() => setRagMode(m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
