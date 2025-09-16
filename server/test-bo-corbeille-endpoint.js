const axios = require('axios');

async function testBOCorbeilleEndpoint() {
  try {
    const response = await axios.get('http://localhost:5000/api/workflow/corbeille/bo', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImF6ZXI1NTU1QG1haWwuY29tIiwic3ViIjoiMzg4ODFkYTgtNWRhNy00YzFmLWI5ZjktNTY3YTVjMzJmODUyIiwicm9sZSI6IlNVUEVSX0FETUlOIiwiaWF0IjoxNzU3OTYzNjY2LCJleHAiOjE3NTgwNTAwNjZ9.b7ikEWVxCKWRHIhBkuJGdWjOe_rdTedqvNQYgJuJtrc'
      }
    });

    console.log('BO Corbeille API Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testBOCorbeilleEndpoint();