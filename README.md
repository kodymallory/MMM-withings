
# Module: MMM-withings

## Screenshots

|   |   |   |
| - | - | - |
| measurment | list | highlight |
| ![](screenshot.png) | ![](list.png) | ![](highlight.png)|


The `MMM-withings` module is an extension for [MagicMirror](https://github.com/MichMich/MagicMirror). It provides a way to display data (measurements and workouts) from the Withings Health API. Data can be listed or plotted in HTML5 using Chart.js


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
https://account.health.nokia.com/oauth2_user/authorize2?response_type=code&redirect_uri=https://example.com&scope=user.info,user.metrics,user.activity&state=1&client_id=<your_client_id>
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

## Using the module


![screenshot](screenshot.png)

To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
    {
        module: "MMM-withings",
        position: "bottom_bar",	// This can be any of the regions.
        config: {
            // See 'Configuration options' for more information.
            units: 'imperial',
            measurements: ['weight', 'fatRatio'],
            workouts: ["bicycling", "swimming"],
            highlights: {
                workouts: ["boxing", "bicycling"]
            }
        }
    }
]
````

## Configuration options

The following properties can be configured:

| Option | Description
| ------ | -----------
| `units` | Units to display<br><br> **Default value:** `config.units`
| `userName` | Name of user<br><br> **Default value:** `MagicMirror`
| `clientId` | Client Id from step 3<br><br> **Default value:** ``
| `clientSecret` | Consumer Secret from step 3<br><br> **Default value:** ``
| `redirectUri` | Callback URL from step 3<br><br> **Default value:** ``
| `initialLoadDelay` | Delay for first check<br><br> **Default value:** `0`
| `updateInterval` | Update interval in milliseconds<br><br> **Default value:** `5 Minutes`
| `daysOfHistory` | Days of data history to fetch<br><br> **Default value:** `14`
| `measurements` | Array of measurements to check<br>**Possible values:** `weight`, `height`, `fatFreeMass`, `fatRatio`, `fatMassWeight`, `diastolicBloodPressure`, `systolicBloodPressure`, `heartPulse`, `temperature`, `sp02`, `bodyTemperature`, `skinTemperature`, `muscleMass`, `hydration`, `boneMass`, `pulseWaveVelocity`<br>**Example:** `['weight', 'fatRatio']`<br>**Default value:** `['weight']`

### View your workouts

#### List your workouts
![](list.png)

You can list all your activities track with your watch or the withings health app.

| Option | Description
| ------ | -----------
|`workouts` | Array of workouts to list <br>**Possible values:** see [this](workouts_available.md)
|`workoutLimitPerDay` | The maximum quantily of each workout to list
|`workoutDurationMin` | minimal duration of workout to list (in minute)

#### Highlight certain activities

![](highlight.png)

This image was obtain with this option:

```js
highlight:{
    workouts:["boxe", "bicycling"],
}
```

# TODO

- [ ] separate the request of the display `highlight` from the `list`.
- [ ] add option to change the header
- [ ] add other icons for workout
- [ ] find how to colorize svg via css
- [ ] display Heart Rate in the 4 zones
- [ ] plot Heart Rate
- [ ] Dom is not updated after refreshing the token