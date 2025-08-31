// Simple test to check query endpoint
const testQuery = async () => {
  try {
    console.log('Testing query endpoint...');
    
    const response = await fetch('http://localhost:3000/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: 'What are pleural effusions?' }
        ],
        topK: 2
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success:', data);
    } else {
      console.log('❌ Error status:', response.status);
      const errorText = await response.text();
      console.log('Error body:', errorText);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
};

// Run test
testQuery();
