Hostel Management System - Contribution Guide
=============================================

IMPORTANT WARNING FOR ALL TEAM MEMBERS
---------------------------------------
- NEVER push directly to main branch
- NEVER modify BACKEND/server.js or config files without Team Lead permission
- ALWAYS follow this workflow exactly
- VIOLATIONS may result in removal from project

Table of Contents
-----------------
1. Complete Software Installation Guide
2. Desktop Setup - Folder creation and terminal
3. Forking Workflow - How to get the code
4. Local Project Setup - How to run project locally
5. Development Rules - Coding standards and branching
6. Pull Request Process - How to submit changes
7. Feature Requests - How to suggest new features

1. Complete Software Installation Guide
---------------------------------------

Step 1: Install Node.js and npm
- Open browser, go to: https://nodejs.org
- Download "LTS" version (Recommended for most users)
- Run the downloaded .msi file
- Click "Next" through all installation steps
- Open Command Prompt, type: node --version
- Should show version like: v18.17.0
- Type: npm --version
- Should show version like: 9.6.7

Step 2: Install PostgreSQL
- Open browser, go to: https://www.postgresql.org/download/windows/
- Click "Download the installer"
- Run the downloaded .exe file
- Click "Next" through installation
- Remember the password you set for "postgres" user
- Keep default port: 5432
- Complete installation

Step 3: Install Git
- Open browser, go to: https://git-scm.com/download/win
- Download "64-bit Git for Windows Setup"
- Run the downloaded .exe file
- Click "Next" through all steps (use default options)
- Open Command Prompt, type: git --version
- Should show version like: git version 2.41.0

Step 4: Install VS Code
- Open browser, go to: https://code.visualstudio.com/download
- Download "Windows" version
- Run the downloaded .exe file
- Click "I accept the agreement"
- Check "Add to PATH" option
- Complete installation

2. Desktop Setup - Folder and Terminal
--------------------------------------

Step 1: Create Project Folder on Desktop
- Right-click on empty space on Desktop
- Select "New" -> "Folder"
- Name folder: "MyProjects"
- Double-click to open the "MyProjects" folder

Step 2: Open Command Prompt
- Press Windows Key + R
- Type "cmd" and press Enter
- Black Command Prompt window will open

Step 3: Navigate to Project Folder
- In Command Prompt, type:
  cd Desktop\MyProjects
- Press Enter
- You should see: C:\Users\YourName\Desktop\MyProjects>

3. Forking Workflow - Get the Code
----------------------------------

Step 1: Fork on GitHub Website
- Open browser, go to: https://github.com
- Login to your GitHub account
- Go to: https://github.com/koushaljhacs/Hostel-Management-System
- Click "Fork" button (top-right corner, under your profile picture)
- Select your account when prompted
- Wait for forking to complete

Step 2: Clone Your Fork to Desktop
- On your forked repository page, click green "Code" button
- Copy the HTTPS URL (looks like: https://github.com/YOUR-USERNAME/Hostel-Management-System.git)
- In Command Prompt, type:
  git clone https://github.com/YOUR-USERNAME/Hostel-Management-System.git
- Press Enter and wait for download to complete

Step 3: Enter Project Folder
- Type: cd Hostel-Management-System
- Press Enter
- You should see: C:\Users\YourName\Desktop\MyProjects\Hostel-Management-System>

Step 4: Setup Upstream Connection
- Type: git remote add upstream https://github.com/koushaljhacs/Hostel-Management-System.git
- Press Enter

Step 5: Verify Connections
- Type: git remote -v
- Press Enter
- You should see 4 lines:
  origin    https://github.com/YOUR-USERNAME/Hostel-Management-System.git (fetch)
  origin    https://github.com/YOUR-USERNAME/Hostel-Management-System.git (push)
  upstream  https://github.com/koushaljhacs/Hostel-Management-System.git (fetch)
  upstream  https://github.com/koushaljhacs/Hostel-Management-System.git (push)

4. Local Project Setup
----------------------

Step 1: Install Project Dependencies
- In Command Prompt, type: cd BACKEND
- Press Enter
- Type: npm install
- Press Enter
- Wait for all packages to install (may take 2-5 minutes)

Step 2: Setup Database
- Open pgAdmin from Start Menu
- Enter the password you set during PostgreSQL installation
- Right-click "Databases" on left side
- Select "Create" -> "Database"
- Name: hostel_management_system
- Click "Save"

Step 3: Run Database Setup
- Open new Command Prompt window
- Type: cd DATABASE\migrations
- Press Enter
- Type: psql -d hostel_management_system -f 001-create-roles.sql
- Press Enter
- Type: psql -d hostel_management_system -f 002-create-users.sql
- Press Enter

Step 4: Start Development Server
- Go back to first Command Prompt window
- Make sure you are in BACKEND folder
- Type: npm start
- Press Enter
- Wait for: "Server running on http://localhost:3000"

Step 5: Test System
- Open browser (Chrome/Firefox/Edge)
- Go to: http://localhost:3000
- You should see Hostel Management System homepage
- Click "Student Login"
- Use test credentials:
  Username: STU1000001
  Password: any password
- You should see student dashboard

5. Development Rules & Standards
-------------------------------

Branch Naming Convention (STRICTLY FOLLOW):
feature/student-registration    - For new features
fix/login-error                - For bug fixes
docs/update-installation       - For documentation
test/registration-flow         - For testing

Development Rules:
- Always create new branch for each task
- Test all changes on http://localhost:3000 before push
- Follow existing code style in the project
- Add clear comments for complex logic
- Update documentation if you change file structure

6. Pull Request (PR) Process
----------------------------

Step 1: Create Feature Branch
- git checkout -b feature/your-feature-name

Step 2: Make Changes
- Open project in VS Code
- Make your code changes
- Save files regularly (Ctrl+S)

Step 3: Test Locally
- Run: npm start in BACKEND folder
- Test on http://localhost:3000
- Fix any errors found

Step 4: Commit Changes
- git add .
- git commit -m "feat: add student registration form"
- git push origin feature/your-feature-name

Step 5: Create Pull Request on GitHub
- Go to your forked repository on GitHub
- Click "Pull Requests" tab
- Click "New Pull Request" button
- Select: your-branch -> upstream/main
- Fill title and description completely
- Click "Create Pull Request"

Step 6: Review Process
- Wait for Team Lead to review your code
- If changes requested, make them and push again
- DO NOT merge until you get final approval

7. Requesting New Features
--------------------------
1. Check existing issues in GitHub Issues tab
2. Read NEXT_STEPS.md for current priorities
3. If not found, create new issue with:
   - Clear descriptive title
   - Detailed explanation of the feature
   - Step-by-step how it should work
   - What should happen when complete
4. Wait for Team Lead to approve and assign

SECURITY REMINDER
-----------------
- Never commit database passwords or API keys
- Never modify files in BACKEND/config/ folder
- Never push directly to main branch
- Report security concerns immediately to Team Lead

Getting Help
------------
1. Read all documentation files first
2. Check existing GitHub issues for solutions
3. Contact Team Lead for critical problems only

NEXT STEP: Read SETUP_GUIDE.md for detailed project setup instructions.