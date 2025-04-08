// scripts/scrape-data.js
const fs = require('fs');
const path = require('path');
const logic = require('./scraper-logic');
import type { FacultyData } from './faculty';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir))
{
    fs.mkdirSync(dataDir, { recursive: true });
}

async function runScraper()
{
    try
    {
        // Create a temp API client that's similar to your API route
        const start = 100;
        const end = 999;

        // Call your scraping logic...
        // This is similar to your API route but adapted to run as a standalone script

        // Similar logic to your API endpoint
        const faculties: FacultyData[] | null = await logic.GET(start, end); 

        if (!faculties) 
        {
            console.error('No data found!');
            return;
        }

        // Write the results to a JSON file
        fs.writeFileSync(
            path.join(dataDir, 'faculty-data.json'),
            JSON.stringify(faculties, null, 2)
        );

        console.log('Data saved successfully!');
    } 
    catch (error)
    {
        console.error('Error running scraper:', error);
        process.exit(1);
    }
}

runScraper();