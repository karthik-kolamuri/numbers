const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const dotEnv = require('dotenv');

const app = express();
dotEnv.config();
app.use(bodyParser.json());

const WINDOW_SIZE = 10; // Maximum size of the sliding window
const TIMEOUT = 500; // Timeout for third-party API requests in milliseconds

let numberWindow = []; // Sliding window to store numbers

// Function to calculate the average of numbers in the window
const calculateAverage = (numbers) => {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
};

// Function to fetch numbers from a third-party server
const fetchNumbers = async (numberType) => {
  try {
    const response = await axios.get(`http://20.244.56.144/test/${numberType}`, {
      timeout: TIMEOUT,
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`, // Replace with your API key
      },
    });
    console.log('API Response:', response.data); // Log the response
    return response.data;
  } catch (error) {
    console.error('Error fetching numbers:', error.message);
    return [];
  }
};

// Route to handle requests for numbers
app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;
  const validIds = ['primes', 'fibo', 'even', 'rand']; // Valid number types

  // Validate the numberid parameter
  if (!validIds.includes(numberid)) {
    return res.status(400).json({ error: 'Invalid number ID. Valid IDs are primes, fibo, even, rand.' });
  }

  try {
    // Fetch numbers from the third-party server
    const fetchedNumbers = await fetchNumbers(numberid);

    // If no numbers are fetched, return the current state
    if (!Array.isArray(fetchedNumbers) || fetchedNumbers.length === 0) {
      return res.status(200).json({
        message: 'No new numbers fetched.',
        windowPrevState: [...numberWindow],
        windowCurrState: [...numberWindow],
        avg: parseFloat(calculateAverage(numberWindow).toFixed(2)),
      });
    }

    // Store the previous state of the window
    const windowPrevState = [...numberWindow];

    // Add unique numbers to the sliding window
    fetchedNumbers.forEach((num) => {
      if (!numberWindow.includes(num)) {
        if (numberWindow.length >= WINDOW_SIZE) {
          numberWindow.shift(); // Remove the oldest number
        }
        numberWindow.push(num);
      }
    });

    // Calculate the average of the current window
    const avg = calculateAverage(numberWindow);

    // Respond with the updated state and fetched numbers
    res.status(200).json({
      message: 'Numbers fetched and window updated successfully.',
      windowPrevState,
      windowCurrState: numberWindow,
      numbers: fetchedNumbers,
      avg: parseFloat(avg.toFixed(2)),
    });
  } catch (error) {
    // Handle errors during the fetch process
    console.error('Error in /numbers/:numberid route:', error.message);
    res.status(500).json({ error: 'An error occurred while processing your request.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});