# Module: MMM-withings
The `MMM-withings` module is a simple way to display data from the Withings Health API
## Setting Up API Key and User Account
The following steps are necessary to use this module:
1. Have a withings account:
2. Navigate to [here](https://account.withings.com/partner/add_oauth2) to create an application (can be a fake application)
    1. Application Name: Can be anything
    2. Description: Can be anything
    3. Contact Email: Your Email
    4. Callback URL: Your HTTPS website/callback URL or https://example.com
    5. Application Website: Your Website or https://example.com
    6. Company: Your company or whatever you want
    7. Logo: An image file that meets requirements. 'logo.jpeg' In this repo works.
3. Populate config.js with the clientId, consumerSecret, and redirectUri (the Callback URL):
````javascript
		{
			module: "MMM-withings",
			config: {
				clientId: 'deadbeefdeadbeef',
				clientSecret: 'deadbeefdeadbeef',
				redirectUri: 'https://example.com',
			}
		},
````
4. Once you have a client ID and consumer secret created, create and navigate to the following website
````javascript
https://account.health.nokia.com/oauth2_user/authorize2?response_type=code&redirect_uri=https://example.com&client_id=<your_client_id>&scope=user.info,user.metrics,user.activity&state=1
````
5. Login with your account credentials
6. Allow this app
7. You will be redirected to an example.com url with a code in the url
E.g.
````javascript
https://example.com/?code=deadbeefcafebabe12345789&state=1
````
8. Copy the value for code into tokens.json in the following format
````json
{
    "code":"deadbeefcafebabe12345789"
}
````
9. Start Magic Mirror within 30 seconds. On first run, an access/refresh token will be generated. If access code is unable to be generated, an attempt will be made in 30 seconds. Simply repeat steps 4-8, and an access token should be able to be generated.

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
    {
        module: "MMM-withings",
        position: "bottom_bar",	// This can be any of the regions.
        config: {
            // See 'Configuration options' for more information.
            displayWeightGraph: true
        }
    }
]
````

## Configuration options

The following properties can be configured:

| Option | Description
| ------ | -----------
| `displayWeightGraph` | Display Weight Graph<br><br> **Default value:** `true`
