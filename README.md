# Module: MMM-withings
The `MMM-withings` module is a simple way to display data from the Withings Health API
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
