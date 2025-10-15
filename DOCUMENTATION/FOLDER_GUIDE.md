Hostel Management System - Folder Structure Guide
=================================================

IMPORTANT SECURITY WARNING
--------------------------
- RED folders = TEAM LEAD ONLY (DO NOT TOUCH)
- YELLOW folders = SENIOR DEVELOPERS ONLY
- GREEN folders = ALL TEAM MEMBERS CAN ACCESS

Project Root Folder Structure
-----------------------------
Hostel-Management-System/
├── BACKEND/          (RED - RESTRICTED ACCESS)
├── DATABASE/         (YELLOW - CAUTION)
├── DOCUMENTATION/    (GREEN - SAFE)
├── PUBLIC/           (GREEN - SAFE)
└── SRC/              (YELLOW - CAUTION)

Detailed Folder Explanation
---------------------------

1. BACKEND/ FOLDER (RED - TEAM LEAD ONLY)
-----------------------------------------
SERVER CORE FILES - DO NOT MODIFY

BACKEND/
├── server.js         - MAIN SERVER FILE (DO NOT TOUCH)
├── config/           - DATABASE PASSWORDS (DO NOT OPEN)
│   └── database.js   - PASSWORD FILE (NEVER MODIFY)
├── package.json      - PROJECT SETTINGS (READ ONLY)
└── package-lock.json - AUTO-GENERATED (IGNORE)

WARNING: Modifying these files will break the entire system!

2. DATABASE/ FOLDER (YELLOW - SENIOR DEVELOPERS)
------------------------------------------------
DATABASE FILES - MODIFY ONLY WITH PERMISSION

DATABASE/
├── migrations/       - DATABASE TABLE CREATION
│   ├── 001-create-roles.sql    - User roles table
│   └── 002-create-users.sql    - User accounts table
├── seeds/            - SAMPLE TEST DATA
│   ├── roles-data.sql          - Default roles
│   └── users-data.sql          - Test users
├── scripts/          - DATABASE TOOLS
│   ├── migrate.js              - Run migrations
│   └── seed.js                 - Add sample data
├── schema/           - DATABASE STRUCTURE
│   └── tables/                 - Table designs
└── add_dummy_student.sql       - Test student data

3. DOCUMENTATION/ FOLDER (GREEN - ALL MEMBERS)
----------------------------------------------
PROJECT DOCUMENTATION - SAFE TO READ

DOCUMENTATION/
├── README.md                     - Project introduction
├── PROJECT_INFO.md              - Project details
├── SETUP_GUIDE.md               - Installation steps
├── CONTRIBUTING.md              - How to work
├── FOLDER_GUIDE.md              - This file
├── TEAM.md                      - Team information
├── SECURITY.md                  - Security rules
├── SERVER_USAGE_RULES.md        - Server rules
├── DEVELOPMENT_TESTING_GUIDE.md - Testing guide
└── NEXT_STEPS.md                - Future plans

4. PUBLIC/ FOLDER (GREEN - ALL MEMBERS)
---------------------------------------
WEBSITE FILES - SAFE TO MODIFY

PUBLIC/
├── index.html       - HOMEPAGE (CAN MODIFY)
└── js/              - JAVASCRIPT FILES
    └── (empty)      - ADD YOUR JS FILES HERE

5. SRC/ FOLDER (YELLOW - SENIOR DEVELOPERS)
-------------------------------------------
APPLICATION CODE - MODIFY CAREFULLY

SRC/
├── js/              - MAIN JAVASCRIPT CODE
│   ├── auth.js              - Login system
│   ├── main.js              - Main functions
│   └── users/student/       - Student features
│       ├── login.html       - Login page
│       └── student-dashboard.html - Dashboard
├── services/        - BUSINESS LOGIC
├── styles/          - DESIGN FILES
│   └── themes/      - COLOR THEMES
└── utils/           - HELPER FUNCTIONS

What You Can Do Based on Your Role
----------------------------------

FOR JUNIOR DEVELOPERS (GREEN ACCESS):
- Read all documentation files
- Modify PUBLIC/ folder files
- Create HTML/CSS/JS in PUBLIC/
- Test on localhost:3000

FOR SENIOR DEVELOPERS (YELLOW ACCESS):
- Everything Junior can do PLUS:
- Modify DATABASE/migrations/ (with permission)
- Modify SRC/ folder files
- Create new features in SRC/js/

FOR TEAM LEAD (RED ACCESS):
- Everything above PLUS:
- Modify BACKEND/ folder
- Change server configuration
- Database password management

File Modification Rules
-----------------------
- ALWAYS create backup before modifying files
- TEST changes on localhost:3000 before commit
- GET PERMISSION before modifying yellow/red files
- FOLLOW naming conventions in CONTRIBUTING.md

NEXT STEP: Read CONTRIBUTING.md for development workflow.