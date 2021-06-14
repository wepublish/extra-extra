# extra-extra
A small app that checks for new articles on we.publish cms (and tsri.ch).
Once a new article is found it will be sent to a Slack channel.

## Usage
* Create Slack App and setup an incoming Webhook
* Create a file `app.yaml` and add the following:
```yaml
runtime: nodejs14
env_variables:
  SLACK_INCOMING_WEBHOOK: "replace with your incoming webhook"
```
* Deploy the app to Google App Engine
