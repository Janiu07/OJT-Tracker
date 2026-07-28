# OJT Hours Tracker - MERN Stack

A complete web application for tracking On-the-Job Training (OJT) hours with calendar view, progress tracking, and detailed analytics.

## Features

### Core Functionality
- ✅ **User Authentication** - Secure login/register system
- ⏰ **Time Logging** - Clock in/out with automatic hour calculation
- 📅 **Calendar View** - Visual calendar showing logged days
- 📊 **Progress Tracking** - Track total hours vs required hours
- 📈 **Analytics Dashboard** - Charts and statistics by category
- 🏷️ **Task Categories** - Coding, Meeting, Documentation, Training, Testing, Other
- 📝 **Notes** - Add notes and descriptions to each entry
- ✏️ **Edit/Delete** - Modify or remove time entries
- 💾 **Data Persistence** - All data stored in MongoDB

## Tech Stack

- **MongoDB** - Database
- **Express.js** - Backend framework
- **React** - Frontend library
- **Node.js** - Runtime environment

### Additional Libraries
- JWT for authentication
- Bcrypt for password hashing
- React Calendar for calendar UI
- Recharts for data visualization
- Axios for API calls

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB installed and running locally OR MongoDB Atlas account

### Step 1: Clone/Download the Project
```bash
# If you have the project folder, navigate to it
cd ojt-tracker
```

### Step 2: Setup Backend

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file and update if needed:
# MONGODB_URI=mongodb://localhost:27017/ojt-tracker
# JWT_SECRET=your_secret_key_here
# PORT=5000
```

**Important:** Make sure MongoDB is running on your machine. To start MongoDB:
- **Windows**: Open MongoDB Compass or run `mongod` in terminal
- **Mac/Linux**: Run `sudo service mongodb start` or `mongod`

**Alternative:** Use MongoDB Atlas (Cloud Database)
1. Create free account at mongodb.com/atlas
2. Create a cluster
3. Get connection string
4. Update MONGODB_URI in .env file

### Step 3: Setup Frontend

```bash
# Open new terminal, navigate to frontend folder
cd frontend

# Install dependencies
npm install
```

### Step 4: Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm start
# Server will run on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# React app will open on http://localhost:3000
```

## Usage Guide

### 1. Register Account
- Open http://localhost:3000
- Click "Register here"
- Enter your details:
  - Full Name
  - Email
  - Password
  - Required OJT Hours (default: 500)

### 2. Add Time Entry
- Click "+ Add Entry" button
- Fill in:
  - Date
  - Start Time
  - End Time
  - Task/Activity description
  - Category
  - Optional notes
- Hours will be calculated automatically
- Click "Add Entry"

### 3. View Dashboard
- See total hours, approved hours, and progress
- View calendar with highlighted days (green = has entry)
- Check pie chart for hours distribution by category
- Browse all time entries

### 4. Edit/Delete Entry
- Click "Edit" on any entry to modify
- Click "Delete" to remove an entry

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Time Entries
- `GET /api/time-entries` - Get all entries for logged-in user
- `GET /api/time-entries/summary` - Get statistics summary
- `POST /api/time-entries` - Create new entry
- `PUT /api/time-entries/:id` - Update entry
- `DELETE /api/time-entries/:id` - Delete entry

## Project Structure

```
ojt-tracker/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   └── TimeEntry.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── timeEntries.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   └── TimeEntryModal.js
│   │   ├── context/
│   │   │   └── AuthContext.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
└── README.md
```

## Database Schema

### User
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (student/supervisor),
  requiredHours: Number (default: 500),
  createdAt: Date
}
```

### TimeEntry
```javascript
{
  userId: ObjectId (ref: User),
  date: Date,
  startTime: String,
  endTime: String,
  hours: Number,
  task: String,
  category: String,
  notes: String,
  supervisorFeedback: String,
  status: String (pending/approved/rejected),
  createdAt: Date
}
```

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check MONGODB_URI in .env file
- Try using MongoDB Atlas if local doesn't work

### Port Already in Use
- Backend: Change PORT in .env file
- Frontend: It will prompt to use different port

### Dependencies Error
- Delete node_modules folder
- Delete package-lock.json
- Run `npm install` again

## Future Enhancements Ideas
- Export to PDF/Excel
- Supervisor approval system
- Email notifications
- Mobile responsive improvements
- Dark mode
- Multiple OJT projects tracking
- Attachment uploads (screenshots, documents)

## License
Free to use for educational purposes

## Support
For issues or questions, please check the code comments or create an issue in the repository.

---

**Good luck with your OJT! 🎓**
