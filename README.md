# StudyForge Frontend

Rebuilt frontend with all bugs fixed.

## Bugs Fixed
1. Quiz — `q.answer` → `q.correct`
2. Cards — `{front,back}` → `{q,a}` mapping
3. Plan — robust response parsing
4. App — `getSafeName()` prevents wrong name
5. Dash — `velocityHeights` array defined before `.map()`
6. Files — same front/back fix for file-generated cards

## Setup
```bash
npm install
npm run dev
```

## Deploy to Vercel
Set env var: `VITE_API_URL=https://study-forge-usyo.onrender.com`