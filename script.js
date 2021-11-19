//************************mqtt******************************

/*
   Eclipse Paho MQTT-JS Utility
   by Elliot Williams for Hackaday article,
*/
// Global variables


var MyApp = {}; // Globally scoped object
var client       = null;
var led_is_on    = null;
// These are configs
//var hostname       = "broker.hivemq.com";
//var port           = "8000";
var hostname       = "broker.emqx.io";
var port           = "8083";


var clientId       = "mqtt_js_" + parseInt(Math.random() * 100000, 10);
var temp_topic     = "home/outdoors/temperature";
var humidity_topic = "home/outdoors/humidity";
var status_topic   = "home/outdoors/status";
var topic1         = "home/outdoors/tp1";

// This is called after the webpage is completely loaded
// It is the main entry point into the JS code

//############################################################################################################




function connect(){
	// Set up the client
	client = new Paho.MQTT.Client(hostname, Number(port), clientId);
	console.info('Connecting to Server: Hostname: ', hostname,
			'. Port: ', port, '. Client ID: ', clientId);

	// set callback handlers
	client.onConnectionLost = onConnectionLost;
	client.onMessageArrived = onMessageArrived;

	// see client class docs for all the options
	var options = {
		onSuccess: onConnect, // after connected, subscribes
		onFailure: onFail     // useful for logging / debugging
	};
	// connect the client
	client.connect(options);
	console.info('Connecting...');
}


function onConnect(context) {
	console.log("Client Connected");
    // And subscribe to our topics	-- both with the same callback function
	options = {qos:0, onSuccess:function(context){ console.log("subscribed"); } }
	/*
	client.subscribe(temp_topic, options);
	client.subscribe(humidity_topic, options);
	client.subscribe(status_topic, options);
	*/
}

function onFail(context) {
	console.log("Failed to connect");
}

function onConnectionLost(responseObject) {
	if (responseObject.errorCode !== 0) {
		console.log("Connection Lost: " + responseObject.errorMessage);
		window.alert("Someone else took my websocket!\nRefresh to take it back.");
	}
}


function onMessageArrived(message) {
	console.log(message.destinationName, message.payloadString);

	// Update element depending on which topic's data came in
	if (message.destinationName == temp_topic){
		var temperature_heading = document.getElementById("temp_display");
		temperature_heading.innerHTML = "Temperature: " + message.payloadString + " &deg;C";
	} else if (message.destinationName == humidity_topic) {
		var humidity_heading = document.getElementById("humidity_display");
		humidity_heading.innerHTML = "Humidity: " + message.payloadString + "%";
	} else if (message.destinationName == status_topic) {
		var status_heading = document.getElementById("led_status");
		status_heading.innerHTML = "LED Status: " + message.payloadString;
		// Accomodates one or two byte "on" commands.  Anything else is off.
		if (message.payloadString == "on" || message.payloadString == "o"){
			led_is_on = true;
		} else {
			led_is_on = false;
		}
	}
}

//*************************************endof mqtt**************************************************************


angular.module('invoicing', [])

// The default logo for the invoice
.constant('DEFAULT_LOGO', 'http://txt-dynamic.static.1001fonts.net/txt/dHRmLjcyLjA2NWNkYi5UV0ZvYVc1a2NtRnJZWElnUVdkbGJtTjUuMAAA/youre-so-cool.regular.png')

// The invoice displayed when the user first uses the app
.constant('DEFAULT_INVOICE', {
  tax: 0.00,
  invoice_number: 1001,
  customer_info: {
    name: '',
    address1: '',
    address2: '',
    gstn: '',
    fssai: '',
    phone: ''
  },
  company_info: {
    name: 'Sri Bairavi Supermarket',
    address1: 'Erembukaddu to Asaripallam road',
    address2: 'Gnanam Nager, Nagercoil-629004',
    gstn: 'GSTN:33BXNPT1066J1Z3',
    fssai: 'FSSAI: 22420086000166',
    phone: 'Phone: 6360599609'
  },
  items:[
    { qty: 0, description: 'Dates-250',cost: 45 },
    { qty: 0, description: 'Dates-400',cost: 45 },
    { qty: 0, description: 'Dates-750', cost: 45 },
    { qty: 0, description: 'Geera', cost: 45 },
    { qty: 0, description: 'Mustard',cost: 45 },
    { qty: 0, description: 'Venthyam', cost: 45 },
    { qty: 0, description: 'Assorted', cost: 45 }
  ]
})

// Service for accessing local storage
.service('LocalStorage', [function() {

  var Service = {};

  // Returns true if there is a logo stored
  var hasLogo = function() {
    return !!localStorage['logo'];
  };

  // Returns a stored logo (false if none is stored)
  Service.getLogo = function() {
    if (hasLogo()) {
      return localStorage['logo'];
    } else {
      return false;
    }
  };

  Service.setLogo = function(logo) {
    localStorage['logo'] = logo;
  };

  // Checks to see if an invoice is stored
  var hasInvoice = function() {
    return !(localStorage['invoice'] == '' || localStorage['invoice'] == null);
  };

  // Returns a stored invoice (false if none is stored)
  Service.getInvoice = function() {
    if (hasInvoice()) {
      return JSON.parse(localStorage['invoice']);
    } else {
      return false;
    }
  };

  Service.setInvoice = function(invoice) {
    localStorage['invoice'] = JSON.stringify(invoice);

  };

  // Clears a stored logo
  Service.clearLogo = function() {
    localStorage['logo'] = '';
  };

  // Clears a stored invoice
  Service.clearinvoice = function() {
    localStorage['invoice'] = '';
  };

  // Clears all local storage
  Service.clear = function() {
    localStorage['invoice'] = '';
    Service.clearLogo();
  };

  return Service;

}])

.service('Currency', [function(){

  var service = {};

  service.all = function() {
    return [
      {
        name: 'Indian Rupee (₹)',
        symbol: '(₹)'
      }
    ]
  }

  return service;

}])

// Main application controller
.controller('InvoiceCtrl', ['$scope', '$http', 'DEFAULT_INVOICE', 'DEFAULT_LOGO', 'LocalStorage', 'Currency',
  function($scope, $http, DEFAULT_INVOICE, DEFAULT_LOGO, LocalStorage, Currency) {

  // Set defaults
  $scope.currencySymbol = '₹ ';
  $scope.logoRemoved = false;
  $scope.printMode   = false;

  (function init() {
    // Attempt to load invoice from local storage
    !function() {
      var invoice = LocalStorage.getInvoice();

      $scope.invoice = invoice ? invoice : DEFAULT_INVOICE;
    }();

    // Set logo to the one from local storage or use default
    !function() {
      var logo = LocalStorage.getLogo();
      $scope.logo = logo ? logo : DEFAULT_LOGO;
    }();

    $scope.availableCurrencies = Currency.all();

  })()
  // Adds an item to the invoice's items
  $scope.addItem = function() {
    $scope.invoice.items.push({ qty:1, cost:0, description:"" });
  }

  // Toggle's the logo
  $scope.toggleLogo = function(element) {
    $scope.logoRemoved = !$scope.logoRemoved;
    LocalStorage.clearLogo();
  };

  // Triggers the logo chooser click event
  $scope.editLogo = function() {
    // angular.element('#imgInp').trigger('click');
    document.getElementById('imgInp').click();
  };

  $scope.printInfo = function() {


        window.print();

  };

  // Remotes an item from the invoice
  $scope.removeItem = function(item) {
    $scope.invoice.items.splice($scope.invoice.items.indexOf(item), 1);
  };

  // Calculates the sub total of the invoice
  $scope.invoiceSubTotal = function() {
    var total = 0.00;
    angular.forEach($scope.invoice.items, function(item, key){
      total += (item.qty * item.cost);
      //console.log(total);
    });
    return total;

  };

  // Calculates the tax of the invoice
  $scope.calculateTax = function() {
    return (($scope.invoice.tax * $scope.invoiceSubTotal())/100);
  };

  // Calculates the grand total of the invoice
  $scope.calculateGrandTotal = function() {
    saveInvoice();
    return $scope.calculateTax() + $scope.invoiceSubTotal();
  };

  // Clears the local storage
  $scope.clearLocalStorage = function() {
    var confirmClear = confirm('Are you sure you would like to clear the invoice?');
    if(confirmClear) {
      var bat = LocalStorage.getInvoice();
        console.log(bat);
        MyApp.color=bat; ///**************************************************************************************point1******************************
     LocalStorage.clear();
      setInvoice(DEFAULT_INVOICE);

			var apple= MyApp.color;
			//alert(apple);
			// Send messgae
			var payload= JSON.stringify(apple);
		  //window.alert("Order placed");
		  //window.print()

		  //message = json;
		//	console.info('sending: ', message);
			//message.destinationName = status_topic;
			//message.retained = true;
			//client.send("message");
			//console.info('sending: ', message);
		// alert ("You typed: " + payload);
		// Send messgae
			  message = new Paho.MQTT.Message(payload);
				message.destinationName = topic1 ;
				message.retained = true;
				client.send(message);
				//console.info('sending: ', payload);
					console.log('sending: ', payload);
            //LocalStorage.clear();
    }
  };
  // Sets the current invoice to the given one
  var setInvoice = function(invoice) {
    console.log("hi");
    //console.log(invoice);

    $scope.invoice = invoice;
    saveInvoice();
  };
  // Reads a url
  var readUrl = function(input) {
    if (input.files && input.files[0]) {
      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('company_logo').setAttribute('src', e.target.result);
        LocalStorage.setLogo(e.target.result);
      }
      reader.readAsDataURL(input.files[0]);
    }
  };

  // Saves the invoice in local storage
  var saveInvoice = function() {
    var duck=$scope.invoice;
    //console.log(hi viky);
    //  MyApp.color=duck;  ///**************************************************************************************point1******************************
    //console.log(duck);
    LocalStorage.setInvoice($scope.invoice);
  };

  // Runs on document.ready
  angular.element(document).ready(function () {
    // Set focus
    document.getElementById('invoice-number').focus();

    // Changes the logo whenever the input changes
    document.getElementById('imgInp').onchange = function() {
      readUrl(this);
    };
  });

}])


//*************************************mqtt payload******************************
function duck(){
     //alert(MyApp.color);

	var apple= MyApp.color;
	//alert(apple);
	// Send messgae
	var payload= JSON.stringify(apple);
  window.alert("Order placed");
  window.print()

  //message = json;
	console.info('sending: ', message);
	//message.destinationName = status_topic;
	//message.retained = true;
	//client.send("message");
	//console.info('sending: ', message);



// alert ("You typed: " + payload);
// Send messgae
	    message = new Paho.MQTT.Message(payload);
		message.destinationName = topic1 ;
		message.retained = true;
		client.send(message);
		console.info('sending: ', payload);

    	  }


  //***************************************************************************
