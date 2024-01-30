const { createClient } = require('@urql/core')
const fetch = require('node-fetch')
const Parser = require('rss-parser');
const { IncomingWebhook } = require('@slack/webhook');

const parser = new Parser();
const incomingWebhook = process.env.SLACK_INCOMING_WEBHOOK
const webhook = new IncomingWebhook(incomingWebhook);

const bajourClient = createClient({
    url: 'https://api.bajour.ch/v1',
    fetch
});

const tsriClient = createClient({
    url: 'https://api.tsri.ch/v1',
    fetch
});

const kultzClient = createClient({
    url: 'https://api.kultz.ch',
    fetch
});

const hauptstadtClient = createClient({
    url: 'https://api.hauptstadt.be/v1',
    fetch
});

const QUERY = `
query Test {
    articles(first: 5) {
        nodes {
            updatedAt
            title
            url
        }
    }
}
`

const TWENTY_FOUR_HOURS_IN_MILLISECONDS = 3600000 * 24

function handleGraphQLResponse(res, emoji) {
    const {data} = res

    if (data !== null && data.articles && data.articles.nodes) {
        data.articles.nodes.forEach(article => {
            const publishDate = new Date(article.updatedAt)
            const lastCheckDate = new Date(new Date().getTime() - TWENTY_FOUR_HOURS_IN_MILLISECONDS)

            if (publishDate > lastCheckDate) {
                printToSlackChannel(article.title, article.url, emoji, publishDate)
            }
        })
    }
}

async function handleRSSFeed(url, newsroom) {
    try {
        const res = await parser.parseURL(url)
        const {items} = res

        if (items) {
            items.forEach((article) => {
                const publishDate = new Date(article.pubDate)
                const lastCheckDate = new Date(new Date().getTime() - TWENTY_FOUR_HOURS_IN_MILLISECONDS)
                if(publishDate > lastCheckDate) {
                    printToSlackChannel(article.title, article.link, newsroom, publishDate)
                }
            })
        }
    } catch (e) {
        console.error(e)
    }
}

function printToSlackChannel(title, link, newsroom, date) {
 const formatedDate = `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
 webhook.send({
    text: `${newsroom} -- <${link}|"${title}"> wurde am ${formatedDate} publiziert. `
 })
}


const express = require('express');
const app = express();

app.get('/', async (req, res) => {
    webhook.send({
        text: `In den letzten 24 Stunden wurden folgende Artikel publiziert:`
    })

    try {
        const bajourItems = await bajourClient.query(QUERY, {}).toPromise()
        handleGraphQLResponse(bajourItems, ':bajour:')
    } catch (e) {
        console.error(e)
    }

    try {
        const tsriItems = await tsriClient.query(QUERY, {}).toPromise()
        handleGraphQLResponse(tsriItems, ':tsueri:')
    } catch (e) {
        console.error(e)
    }

    try {
        const hauptstadtItems = await hauptstadtClient.query(QUERY, {}).toPromise()
        handleGraphQLResponse(hauptstadtItems, ':has-logo:')
    } catch (e) {
        console.error(e)
    }

    try {
        const kultzItems = await kultzClient.query(QUERY, {}).toPromise()
        handleGraphQLResponse(kultzItems, ':kultz:')
    } catch (e) {
        console.error(e)
    }

    await handleRSSFeed('https://www.higgs.ch/feed/', ':higgs:')
    await handleRSSFeed('https://www.babanews.ch/feed/', ':babanews:')
    await handleRSSFeed('https://www.woz.ch/t/startseite/feed', ':woz:')
    await handleRSSFeed('https://daslamm.ch/feed', ':daslamm:')
    await handleRSSFeed('https://akutmag.ch/feed/', ':akutlogo:')
    await handleRSSFeed('https://www.tippinpoint.ch/tools/rss/news.xml', ':tippinpoint-logo:')

    res.send('DONE DONE!');
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
