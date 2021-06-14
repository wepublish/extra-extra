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
            publishedAt
            title
            url 
        }
    }
}
`

const MILLISECS_SINCE_LAST_CHECK = 900000 // 15 min

function handleGraphQLResponse(res) {
    const {data} = res
    if(data !== null && data.articles && data.articles.nodes) {
        data.articles.nodes.forEach(article => {
            const publishDate = new Date(article.publishedAt)
            const lastCheckDate = new Date(new Date().getTime() - MILLISECS_SINCE_LAST_CHECK)
            if(publishDate > lastCheckDate) {
                printToSlackChannel(article.title, article.url, article.url.includes('kultz') ? 'Kultz.ch' : 'Bajour.ch')
            }
        })
    }
}

function printToSlackChannel(title, link, newsroom) {
 webhook.send({
    text: `Neuer Artikel von ${newsroom} mit dem Titel "${title}" wurde soeben publiziert. ${link}`
 })
}


const express = require('express');
const app = express();

app.get('/', async (req, res) => {
    const tsriRes = await parser.parseURL('https://tsri.ch/feed/')
    const {items} = tsriRes
    if(items) {
        items.forEach((article) => {
            const publishDate = new Date(article.pubDate)
            const lastCheckDate = new Date(new Date().getTime() - MILLISECS_SINCE_LAST_CHECK)
            if(publishDate > lastCheckDate) {
                printToSlackChannel(article.title, article.link, 'Tsüri.ch')
            }
        })
    }
    const bajourItems = await bajourClient.query(QUERY, {}).toPromise()
    handleGraphQLResponse(bajourItems)

    const kultzItems = await kultzClient.query(QUERY, {}).toPromise()
    handleGraphQLResponse(kultzItems)

    res.send('DONE DONE!');
});

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
