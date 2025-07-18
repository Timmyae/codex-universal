# SCFHS EMS Adaptive Exam PWA

This project provides an adaptive practice environment for the Saudi Commission for Health Specialties (SCFHS) paramedic exam.

## Features
- **Question bank** containing 13 official SCFHS categories stored in `question_bank.json`.
- **Adaptive engine** implementing the 2PL Item Response Theory located in `adaptive-algorithm.js`.
- **Admin panel** (`admin.html`) for managing multiple-choice questions with category tags and difficulty settings.
- **Firestore integration** for persisting questions. Replace the Firebase configuration in `admin.html` with your project credentials.
- **Secure upload** through the Proxably API before storing questions.
- **User dashboard** (`index.html`) showing ability estimate and feedback while practicing.
- **Progressive Web App** using `service-worker.js` and `manifest.webmanifest`.
- **CI/CD** via GitHub Actions and Netlify configuration.
- **Backup script** (`backup.sh`) to export Firestore data locally.

## Setup
1. Serve the PWA with any static server (`npx serve` or similar).
2. Configure Firebase credentials in `admin.html` and set allowed domains in Firestore.
3. Deploy to Netlify. GitHub Actions workflow is located in `.github/workflows/deploy.yml`.

## Question Bank Generation
Questions are stored in `question_bank.json`. Each item contains:
```json
{
  "id": 1,
  "category": "Airway Management",
  "question": "Which device...",
  "options": ["A", "B", "C", "D"],
  "answer": 1,
  "difficulty": 0.5,
  "discrimination": 1.2
}
```
Edit `question_bank.json` directly or use `admin.html` to add questions through Firestore.

## License
This repository is provided for educational purposes.
