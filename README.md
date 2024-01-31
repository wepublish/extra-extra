# extra-extra
A small app that checks for new articles on we.publish cms (and tsri.ch).
Once a new article is found it will be sent to a Slack channel.

## Deployment

Before you can deploy the application, you must have the `gcloud` CLI installed & authenticated with your We.Publish Google account.

Go to [Google Cloud App Engine](https://console.cloud.google.com/appengine/versions?serviceId=default&versionId=20210701t113659&project=wepublish-dev) and copy the configuration file into a new file called `app.yaml`

It should look like this:

```yaml
runtime: nodejs14
env: standard
instance_class: F1
handlers:
  - url: .*
    script: auto
env_variables:
  SLACK_INCOMING_WEBHOOK: >-
    https://hooks.slack.com/services/...
automatic_scaling:
  min_idle_instances: automatic
  max_idle_instances: automatic
  min_pending_latency: automatic
  max_pending_latency: automatic
service_account: wepublish-dev@appspot.gserviceaccount.com
```

Execute the following command into your CLI `gcloud app deploy`
