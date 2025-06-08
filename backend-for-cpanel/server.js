const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
const port = process.env.PORT || 3001;

// Initialize Firebase Admin with service account
// You'll need to add your service account key file
// admin.initializeApp({
//   credential: admin.credential.cert(require('./path-to-service-account-key.json')),
//   // Add other config if needed
// });

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/healthCheck', (req, res) => {
  console.log("Health check requested");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Get profile endpoint - requires authentication
app.post('/getProfile', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      success: true
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: "Invalid authentication token" });
  }
});

// Calendar endpoints (you'll need to implement these based on your calendar functions)
app.post('/saveCalendarEvent', async (req, res) => {
  try {
    // Implement calendar event saving logic
    res.json({ success: true, message: "Calendar event saved" });
  } catch (error) {
    console.error('Error saving calendar event:', error);
    res.status(500).json({ error: "Failed to save calendar event" });
  }
});

app.put('/updateCalendarEvent', async (req, res) => {
  try {
    // Implement calendar event update logic
    res.json({ success: true, message: "Calendar event updated" });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    res.status(500).json({ error: "Failed to update calendar event" });
  }
});

app.delete('/deleteCalendarEvent', async (req, res) => {
  try {
    // Implement calendar event deletion logic
    res.json({ success: true, message: "Calendar event deleted" });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    res.status(500).json({ error: "Failed to delete calendar event" });
  }
});

app.post('/saveRecurringEvents', async (req, res) => {
  try {
    // Implement recurring events logic
    res.json({ success: true, message: "Recurring events saved" });
  } catch (error) {
    console.error('Error saving recurring events:', error);
    res.status(500).json({ error: "Failed to save recurring events" });
  }
});

app.post('/calendarSync', async (req, res) => {
  try {
    // Implement calendar sync logic
    res.json({ success: true, message: "Calendar synced" });
  } catch (error) {
    console.error('Error syncing calendar:', error);
    res.status(500).json({ error: "Failed to sync calendar" });
  }
});

app.post('/checkAndCreateEvent', async (req, res) => {
  try {
    // Implement event checking and creation logic
    res.json({ success: true, message: "Event checked and created" });
  } catch (error) {
    console.error('Error checking and creating event:', error);
    res.status(500).json({ error: "Failed to check and create event" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 