import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { google } from 'googleapis';
import { createServer as createViteServer } from 'vite';
import path from 'path';

// Load .env first, then override with .env.local if it exists
dotenv.config();
if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json());

  // API Route for Google Sheets
  app.post('/api/signup', async (req, res) => {
    try {
      const { 
        studentFirstName, studentLastName, dob, age, 
        className, parent1Name, parent1Phone, parent1Email, 
        parent2Name, parent2Phone, medicalNotes 
      } = req.body;

      let clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
      let privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY || '';
      const sheetId = process.env.GOOGLE_SHEET_ID;

      // Robust private key parsing
      const formatPrivateKey = (key: string) => {
        if (!key) return '';
        // Remove surrounding quotes and handle escaped newlines
        let formatted = key.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
        
        // If it's a single line but has the headers, it needs proper formatting
        if (!formatted.includes('\n') && formatted.includes('-----BEGIN PRIVATE KEY-----')) {
          const body = formatted
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\s+/g, '');
          
          // Split body into 64-character lines
          const lines = body.match(/.{1,64}/g) || [];
          formatted = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`;
        }
        return formatted;
      };

      if (privateKey) {
        privateKey = formatPrivateKey(privateKey);
      }

      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
          const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
          clientEmail = clientEmail || credentials.client_email;
          if (credentials.private_key) {
            privateKey = privateKey || formatPrivateKey(credentials.private_key);
          }
        } catch (e) {
          console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', e);
        }
      }

      console.log('Attempting Google Sheets update...');
      console.log('Sheet ID:', sheetId ? 'Configured' : 'MISSING');
      console.log('Client Email:', clientEmail ? 'Configured' : 'MISSING');
      console.log('Private Key Start:', privateKey ? privateKey.substring(0, 30) + '...' : 'MISSING');

      if (!clientEmail || !privateKey || !sheetId) {
        console.warn("Google Sheets credentials not configured. Skipping sheet update.");
        return res.status(200).json({ 
          success: true, 
          message: 'Saved to DB, but Google Sheets not configured.',
          details: {
            hasSheetId: !!sheetId,
            hasClientEmail: !!clientEmail,
            hasPrivateKey: !!privateKey
          }
        });
      }

      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth });

      // Try to get the first sheet name if "Sheet1" fails
      let targetRange = 'Sheet1!A:K';
      try {
        const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const firstSheetName = spreadsheet.data.sheets?.[0]?.properties?.title;
        if (firstSheetName && firstSheetName !== 'Sheet1') {
          console.log(`Using detected sheet name: ${firstSheetName}`);
          targetRange = `${firstSheetName}!A:K`;
        }
      } catch (metaError) {
        console.warn('Could not fetch spreadsheet metadata, defaulting to Sheet1:', metaError);
      }

      // Append row to the sheet
      console.log(`Appending row to ${targetRange}...`);
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: targetRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              new Date().toISOString(),
              studentFirstName,
              studentLastName,
              dob,
              age,
              className,
              parent1Name,
              parent1Phone,
              parent1Email,
              parent2Name || '',
              parent2Phone || '',
              medicalNotes || ''
            ]
          ]
        }
      });
      console.log('Google Sheets update successful:', appendResponse.statusText);

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('Google Sheets Error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        hint: "Check if the Service Account has 'Editor' access to the Google Sheet and the Sheet ID is correct."
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const portNum = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  app.listen(portNum, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${portNum}`);
  });
}

startServer();
