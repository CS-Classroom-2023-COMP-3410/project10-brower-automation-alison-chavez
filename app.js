const puppeteer = require('puppeteer');
const fs = require('fs');

const credentials = JSON.parse(fs.readFileSync('credentials.json'));

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to GitHub login page
    await page.goto('https://github.com/login');

    await page.type('#login_field', credentials.username);
    await page.type('#password', credentials.password);
    await page.click('input[type="submit"]');

    // Wait for successful login
    await page.waitForSelector('.avatar.circle');

    // Extract the actual GitHub username to be used later
    const actualUsername = await page.$eval('meta[name="octolytics-actor-login"]', meta => meta.content);

    const repositories = ["cheeriojs/cheerio", "axios/axios", "puppeteer/puppeteer"];

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`);
        
        await page.waitForSelector('#repository-container-header button');
        await page.click('#repository-container-header button');
        await page.waitForTimeout(1000);
    }

    await page.goto(`https://github.com/${actualUsername}?tab=stars`);

    await page.waitForSelector('button[aria-label="Create list"]');
    await page.click('button[aria-label="Create list"]');

    await page.waitForTimeout(1000);

    await page.waitForSelector('input[name="name"]');
    await page.type('input[name="name"]', 'Node Libraries');

    // Wait for buttons to become visible
    await page.waitForTimeout(1000);

    // Identify and click the "Create" button
    const buttons = await page.$$('.Button--primary.Button--medium.Button');
    for (const button of buttons) {
        const buttonText = await button.evaluate(node => node.textContent.trim());
        if (buttonText === 'Create') {
            await button.click();
            break;
        }
    }

    // Allow some time for the list creation process
    await page.waitForTimeout(2000);

    const dropdownSelector = 'details summary[aria-label="Add to list"]';

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`);
        await page.waitForSelector(dropdownSelector);
        await page.click(dropdownSelector);
        await page.waitForTimeout(1000);

        const lists = await page.$$('.js-user-list-menu-form');

        for (const list of lists) {
          const textHandle = await list.getProperty('innerText');
          const text = await textHandle.jsonValue();
          if (text.includes('Node Libraries')) {
            await list.click();
            break;
          }
        }

        // Allow some time for the action to process
        await page.waitForTimeout(1000);

        // Close the dropdown to finalize the addition to the list
        await page.click(dropdownSelector);
      }

    // Close the browser
    await browser.close();
})();
