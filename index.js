const { createClient } = require('@urql/core')
const fetch = require('node-fetch')
const Parser = require('rss-parser');
const { IncomingWebhook } = require('@slack/webhook');

const parser = new Parser();
const incomingWebhook = process.env.SLACK_INCOMING_WEBHOOK
const webhook = new IncomingWebhook(incomingWebhook);

const bajourClient = createClient({
    url: 'https://api.bajour.ch',
    fetch
});

const kultzClient = createClient({
    url: 'https://api.kultz.ch',
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

const MILLISECS_SINCE_LAST_CHECK = 900000 // 15 min

const TWENTY_FOUR_HOURS_IN_MILLISECONDS = 3600000 * 24

function handleGraphQLResponse(res) {
    const {data} = res
    if(data !== null && data.articles && data.articles.nodes) {
        data.articles.nodes.forEach(article => {
            const publishDate = new Date(article.updatedAt)
            const lastCheckDate = new Date(new Date().getTime() - TWENTY_FOUR_HOURS_IN_MILLISECONDS)
            if(publishDate > lastCheckDate) {
                printToSlackChannel(article.title, article.url, article.url.includes('kultz') ? ':kultz:' : ':bajour:', publishDate)
            }
        })
    }
}

async function handleRSSFeed(url, newsroom) {
    const res = await parser.parseURL(url)
    const {items} = res
    if(items) {
        items.forEach((article) => {
            const publishDate = new Date(article.pubDate)
            const lastCheckDate = new Date(new Date().getTime() - TWENTY_FOUR_HOURS_IN_MILLISECONDS)
            if(publishDate > lastCheckDate) {
                printToSlackChannel(article.title, article.link, newsroom, publishDate)
            }
        })
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
    await handleRSSFeed('https://www.tsri.ch/feed', ':tsueri:')

    const bajourItems = await bajourClient.query(QUERY, {}).toPromise()
    handleGraphQLResponse(bajourItems)

    const kultzItems = await kultzClient.query(QUERY, {}).toPromise()
    handleGraphQLResponse(kultzItems)

    await handleRSSFeed('https://www.higgs.ch/feed', ':higgs:')

    await handleRSSFeed('https://www.babanews.ch/feed', ':babanews:')

    await handleRSSFeed('https://www.woz.ch/t/startseite/feed', ':woz:')

    await handleRSSFeed('https://daslamm.ch/feed', ':daslamm:')

    res.send('DONE DONE!');
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
