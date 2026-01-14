import { useState } from 'react';

export const useSupport = () => {
const [loading, setLoading] = useState(false);

const askSupport = async (userId, question) => {
setLoading(true);
try {
const response = await fetch('/api/support/ask', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ user_id: userId, question }),
});
const data = await response.json();
setLoading(false);
return data;
} catch (error) {
console.error('Support API error:', error);
setLoading(false);
return { success: false, error: error.message };
}
};

return { askSupport, loading };
};