Hostel Management System - Complete Setup Guide
===============================================

IMPORTANT WARNING
-----------------
- DO NOT modify BACKEND/config/ files
- DO NOT change database connection settings
- FOLLOW steps exactly as written
- ASK Team Lead if stuck at any step

Before You Start - Verify Installations
---------------------------------------

Check Node.js Installation:
- Open Command Prompt (Press Windows Key + R, type "cmd", press Enter)
- Type: node --version
- Press Enter
- If you see: "v18.17.0" or similar - GOOD
- If you see: "node is not recognized" - Install Node.js first

Check npm Installation:
- In same Command Prompt, type: npm --version
- Press Enter
- If you see: "9.6.7" or similar - GOOD
- If error, Node.js installation failed

Check Git Installation:
- In same Command Prompt, type: git --version
- Press Enter
- If you see: "git version 2.41.0" or similar - GOOD
- If error, Git installation failed

Check PostgreSQL Installation:
- Press Windows Key, type "pgAdmin"
- If pgAdmin opens - GOOD
- If not found, install PostgreSQL first

Complete Project Setup Steps
----------------------------

Step 1: Open Project in Command Prompt
- Open Command Prompt (Windows Key + R, type "cmd", press Enter)
- Type: cd Desktop\MyProjects\Hostel-Management-System
- Press Enter
- You should see: C:\Users\YourName\Desktop\MyProjects\Hostel-Management-System>

Step 2: Install Project Dependencies
- Type: cd BACKEND
- Press Enter
- You should see: C:\Users\YourName\Desktop\MyProjects\Hostel-Management-System\BACKEND>
- Type: npm install
- Press Enter
- Wait for installation to complete (2-5 minutes)
- You will see "added 150 packages" message when done

Step 3: Create Database
- Open pgAdmin from Start Menu
- Enter password you set during PostgreSQL installation
- On left side, click small arrow next to "Servers"
- Click small arrow next to "PostgreSQL 15"
- Right-click on "Databases"
- Select "Create" -> "Database"
- In "Database" field, type exactly: hostel_management_system
- Click "Save" button

Step 4: Run Database Migrations
- Go back to Command Prompt
- Type: cd ..
- Press Enter (you go back to main project folder)
- Type: cd DATABASE\migrations
- Press Enter
- You should see: C:\Users\YourName\Desktop\MyProjects\Hostel-Management-System\DATABASE\migrations>
- Type: psql -d hostel_management_system -f 001-create-roles.sql
- Press Enter
- You should see "CREATE TABLE" message
- Type: psql -d hostel_management_system -f 002-create-users.sql
- Press Enter
- You should see "CREATE TABLE" message

Step 5: Add Sample Data
- Type: cd ..\seeds
- Press Enter
- You should see: C:\Users\YourName\Desktop\MyProjects\Hostel-Management-System\DATABASE\seeds>
- Type: psql -d hostel_management_system -f roles-data.sql
- Press Enter
- Type: psql -d hostel_management_system -f users-data.sql
- Press Enter

Step 6: Start Development Server
- Type: cd ..\..\BACKEND
- Press Enter
- You should see: C:\Users\YourName\Desktop\MyProjects\Hostel-Management-System\BACKEND>
- Type: npm start
- Press Enter
- Wait for message: "Server running on http://localhost:3000"

Step 7: Test Your Setup
- Open Google Chrome or Firefox browser
- In address bar, type exactly: http://localhost:3000
- Press Enter
- You should see "Hostel Management System" homepage
- Click "Student Login" button
- On login page, enter:
  Username: STU1000001
  Password: any password (type anything)
- Click "Login" button
- You should see Student Dashboard page

Troubleshooting Common Problems
-------------------------------

Problem: "psql is not recognized"
Solution:
- PostgreSQL not installed properly
- Reinstall PostgreSQL from postgresql.org
- Or add PostgreSQL to PATH (ask Team Lead for help)

Problem: "Error: listen EADDRINUSE :::3000"
Solution:
- Port 3000 is already in use
- Close other programs using port 3000
- Or restart your computer

Problem: "Database connection failed"
Solution:
- Check PostgreSQL service is running
- Verify database name is exactly "hostel_management_system"
- Check migrations ran successfully

Problem: "npm install fails"
Solution:
- Check internet connection
- Try: npm cache clean --force
- Then: npm install again

Problem: "Cannot find module"
Solution:
- You are not in BACKEND folder
- Type: cd BACKEND
- Then: npm start

Success Checklist
-----------------
✅ Node.js and npm installed correctly
✅ PostgreSQL and pgAdmin working
✅ Database "hostel_management_system" created
✅ Migrations ran without errors
✅ npm install completed successfully
✅ Server runs on http://localhost:3000
✅ Student login works with test credentials

If all checkmarks are done, your setup is 100% successful!

NEXT STEP: Read FOLDER_GUIDE.md to understand project structure.