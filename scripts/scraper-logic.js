const axios = require("axios");
const cheerio = require("cheerio");

/**
 * Extract a proper URL from various link types including .NET postback links
 */
function extractProgramUrl(href, programId, currentYear, facultyId) 
{
    // Default fallback URL
    const fallbackUrl = `https://catalog.huji.ac.il/pages/wfrMaslulDetails.aspx?year=${currentYear}&faculty=0&entityId=${facultyId}&chugId=${facultyId}&degreeCode=0&maslulId=${programId}`;

    // For empty href, return fallback
    if (!href)
        return fallbackUrl;

    // Handle .NET postback links
    if (href.includes('__doPostBack') || href.includes('WebForm_DoPostBackWithOptions')) 
    {
        // Extract arguments using regex
        const args = href.match(/'([^']*)'/g)?.map(arg => arg.replace(/'/g, '')) || [];

        if (args.length >= 2) 
        {
            // For .NET postback links, construct the URL
            // Look for the target page in the arguments
            if (args[0].includes('wfrMaslulDetails'))
                return `https://catalog.huji.ac.il/pages/wfrMaslulDetails.aspx?${args[1]}`;
        }

        return fallbackUrl;
    }

    // Handle other JavaScript links
    if (href.startsWith('javascript:')) 
    {
        const argsMatch = href.match(/'([^']*)'/g);

        if (argsMatch && argsMatch.length >= 2) 
        {
            const args = argsMatch.map(arg => arg.replace(/'/g, ''));
            
            // Try to extract URL parameters if possible
            if (args[0].includes('wfrMaslulDetails'))
                return `https://catalog.huji.ac.il/pages/wfrMaslulDetails.aspx?${args[1]}`;

        }

        return fallbackUrl;
    }

    // Handle direct URLs
    return href.startsWith('http') ?
        href : `https://catalog.huji.ac.il/pages${href.startsWith('/') ? '' : '/'}${href}`;
}

/**
 * Process a program element and extract its data
 */
function extractProgramData($element, $, currentYear, facultyId) 
{
    const text = $element.text().trim();
    const href = $element.attr('href') || '';

    // Parse program ID and name
    const idMatch = text.match(/\((\d+)\)/);
    if (!idMatch) return null;

    const programId = idMatch[1];
    const name = text.replace(/\(\d+\)/, '').trim();

    // Extract URL from the href attribute
    const programUrl = extractProgramUrl(href, programId, currentYear, facultyId);

    return {
        id: programId,
        name: name,
        url: programUrl
    };
}

async function GET(start = 100, end = 999)
{
    const currentYear = new Date().getFullYear();
    const validFaculties = [];

    for (let id = start; id <= end; id++) 
    {
        try 
        {
            // Create an axios instance with cookies enabled
            const axiosInstance = axios.create({
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9,he;q=0.8',
                    'Referer': 'https://catalog.huji.ac.il/',
                    'Origin': 'https://catalog.huji.ac.il'
                },
                withCredentials: true // Enable cookies
            });

            // First, visit the main site to get any required cookies
            const initialResponse = await axiosInstance.get('https://catalog.huji.ac.il/');

            // Now make the actual request
            const url = `https://catalog.huji.ac.il/pages/WebChugInfoNew.aspx?year=${currentYear}&faculty=1&entityId=${id}&degreeCode=1`;
            const { data } = await axiosInstance.get(url);
            console.log(`Fetching data for faculty ID: ${id}`);

            // Check if we got an error page
            if (data.includes("Something went wrong")) {
                console.error("Received error page from server");
                return null;
            }

            const $ = cheerio.load(data);

            // Extract the faculty name
            const title = ($('span#lblChugName').text().trim()).split(' - ')[0];

            // Find all program links
            const programs = [];

            // Process primary selector
            const programElements = $('ul li a.contentsAnchor').toArray();
            for (const element of programElements) {
                const programData = extractProgramData($(element), $, currentYear, id);
                if (programData) {
                    programs.push(programData);
                }
            }

            if (programs.length > 0) 
            {
                console.log(`Found ${programs.length} in faculty ${title}`);
                validFaculties.push({
                    id,
                    name: title,
                    url,
                    programs,
                });
                console.log(`Added faculty with ${programs.length} programs`);
            } else {
                // Try an alternate selector
                $('a[id^="lvMaslulim_ctrl"]').each((_, element) => {
                    const programData = extractProgramData($(element), $, currentYear, id);
                    if (programData) {
                        programs.push(programData);
                        console.log(`Alternate search - found program: "${programData.name}"`);
                    }
                });

                if (programs.length > 0) 
                {
                    console.log(`Found ${programs.length} in faculty ${title} using alternate selector`);
                    validFaculties.push({
                        id,
                        name: title || `Faculty ${id}`,
                        url,
                        programs,
                    });
                    console.log(`Added faculty with ${programs.length} programs using alternate selector`);
                }
            }
        } catch (error) {
            console.error("Error fetching or parsing faculty data:", error);
            return null;
        }
    }

    // Sort faculties by name
    data.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
    });

    console.log(`Scraping completed. Found ${validFaculties.length} valid faculties.`);
    return validFaculties;
}

module.exports = { GET };