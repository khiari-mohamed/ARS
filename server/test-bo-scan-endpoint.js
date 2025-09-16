const axios = require('axios');

async function testBOScanEndpoint() {
  try {
    // First, let's check if we have any bordereaux in EN_ATTENTE status
    const response = await axios.get('http://localhost:5000/api/workflow/corbeille/bo', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImF6ZXI1NTU1QG1haWwuY29tIiwic3ViIjoiMzg4ODFkYTgtNWRhNy00YzFmLWI5ZjktNTY3YTVjMzJmODUyIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiaWF0IjoxNzU3OTYzNjY2LCJleHAiOjE3NTgwNTAwNjZ9.b7ikEWVxCKWRHIhBkuJGdWjOe_rdTedqvNQYgJuJtrc'
      }
    });

    console.log('BO Corbeille Response:', JSON.stringify(response.data, null, 2));

    if (response.data.items && response.data.items.length > 0) {
      const firstItem = response.data.items[0];
      console.log(`\nTesting process-for-scan with bordereau ID: ${firstItem.id}`);

      // Test the process-for-scan endpoint
      const processResponse = await axios.post(
        `http://localhost:5000/api/workflow/bo/process-for-scan/${firstItem.id}`,
        {},
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImF6ZXI1NTU1QG1haWwuY29tIiwic3ViIjoiMzg4ODFkYTgtNWRhNy00YzFmLWI5ZjktNTY3YTVjMzJmODUyIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiaWF0IjoxNzU3OTYzNjY2LCJleHAiOjE3NTgwNTAwNjZ9.b7ikEWVxCKWRHIhBkuJGdWjOe_rdTedqvNQYgJuJtrc'
          }
        }
      );

      console.log('Process for SCAN Response:', JSON.stringify(processResponse.data, null, 2));
    } else {
      console.log('No items found in BO corbeille to test with');
    }

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testBOScanEndpoint();