# Module: MMM-withings
The `MMM-withings` module is an extension for [MagicMirror](https://github.com/MichMich/MagicMirror). It provides a way to display data from the Withings Health API in HTML5 plots using Chart.js

![screenshot](screenshot.png)

## Installation

Stop your MagicMirror and clone the repository into the modules folder

   ````bash
   cd ~/MagicMirror/modules
   git clone https://github.com/kodymallory/MMM-withings.git
   cd ~/MagicMirror/modules/MMM-withings
   npm install --production
   ````
## Authorize app with Withings
The module needs access to your Withings data in order to display it. The authorization is restricted to localhost. This feature can be disabled from config.js and an API key can be manually generated and used following [these instructions](#Setting-Up-API-Key-and-User-Account).

1. Ensure you have a registered Withings account
2. Launch Magic Mirror with withings module included.
3. After some time, the default browser will open on the default display linking to withings.com with a prompt to login.
4. Log in with Withings account, and authorize Personal Mirror Project
5. After page returns with OK, you can close the browser. Data should start loading into the Withings module.

## Using the module
To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
    {
        module: "MMM-withings",
        position: "bottom_bar",	// This can be any of the regions.
        config: {
            // See 'Configuration options' for more information.
            units: 'imperial',
            measurements: ['weight', 'fatRatio']
        }
    }
]
````

## Configuration options

The following properties can be configured:

| Option | Description
| ------ | -----------
| `units` | Units to display<br><br> **Default value:** `config.units`
| `initialLoadDelay` | Delay for first check<br><br> **Default value:** `0`
| `updateInterval` | Update interval in milliseconds<br><br> **Default value:** `5 Minutes`
| `daysOfHistory` | Days of data history to fetch<br><br> **Default value:** `14`
| `measurements` | Array of measurements to check<br>**Possible values:** `weight`, `height`, `fatFreeMass`, `fatRatio`, `fatMassWeight`, `diastolicBloodPressure`, `systolicBloodPressure`, `heartPulse`, `temperature`, `sp02`, `bodyTemperature`, `skinTemperature`, `muscleMass`, `hydration`, `boneMass`, `pulseWaveVelocity`<br>**Example:** `['weight', 'fatRatio']`<br>**Default value:** `['weight']`
| `userName` | Name of user<br><br> **Default value:** `MagicMirror`
| `attemptAuthorization` | Attempt authorization using default app. If false, use [these instructions](#Setting-Up-API-Key-and-User-Account) for generating API key<br><br> **Default value:** `true`
| `clientId` | Client Id from step 3<br><br> **Default value:** ``
| `clientSecret` | Consumer Secret from step 3<br><br> **Default value:** ``
| `redirectUri` | Callback URL from step 3<br><br> **Default value:** ``

## Setting Up API Key and User Account
1. Have a withings account
2. Navigate to [here](https://account.withings.com/partner/add_oauth2) to create an application (can be a fake application)
    1. Application Name: Can be anything
    2. Description: Can be anything
    3. Contact Email: Your Email
    4. Callback URL: Your HTTPS website/callback URL or https://example.com
    5. Application Website: Your Website or https://example.com
    6. Company: Your company or whatever you want
    7. Logo: An image file that meets requirements. 'logo.jpg' In this repo works.
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
````url
https://account.withings.com/oauth2_user/authorize2?response_type=code&redirect_uri=https://example.com&scope=user.info,user.metrics,user.activity&state=1&client_id=<your_client_id>
````
5. Login with your account credentials
6. Allow this app
7. You will be redirected to an example.com url with a code in the url
E.g.
````url
https://example.com/?state=1&code=deadbeefcafebabe12345789
````
8. Copy the value for code into tokens.json in the following format
````json
{
    "code":"deadbeefcafebabe12345789"
}
````
9. Start Magic Mirror within 30 seconds. On first run, an access/refresh token will be generated. If access code is unable to be generated, an attempt will be made in 30 seconds. Simply repeat steps 4-8, and an access token should be able to be generated.
