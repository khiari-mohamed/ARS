import React, { useState } from 'react';
import axios from 'axios';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';

const FeedbackForm: React.FC<{ page: string }> = ({ page }) => {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await axios.post('/api/feedback', { message, page });
    setSubmitted(true);
  };

  if (submitted)
    return (
      <Paper elevation={2} sx={{ p: 2, mt: 2, borderRadius: 3 }}>
        <Typography variant="h6" color="success.main">
          Thank you for your feedback!
        </Typography>
      </Paper>
    );

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2, borderRadius: 3 }}>
      <Typography variant="h6" gutterBottom>
        Feedback
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          label="Your feedback"
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          multiline
          rows={3}
          fullWidth
          sx={{ mb: 2 }}
        />
        <Button type="submit" variant="contained" color="primary">
          Submit
        </Button>
      </Box>
    </Paper>
  );
};

export default FeedbackForm;