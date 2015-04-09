angular.module('app.services')

/**
 * A simple example service that returns tree data for conversation
 */
.factory('talky', [
	'healthKitService', 
	'$q', 
	'$ionicPlatform', 
	'chartConfigFactory', 
	'$ionicPopup', 
	'$localstorage', 
	'$translate', 
	'healthKitQueryFactory',
	'dateTimeUtil',
	function(healthKitService, 
			$q, 
			$ionicPlatform, 
			chartConfigFactory, 
			$ionicPopup, 
			$localstorage, 
			$translate, 
			healthKitQueryFactory,
			dateTimeUtil) {


	$ionicPlatform.ready(function() {
		var colorConfig = {
					"0" : ['120deg', '#FFCC99', '#CCCC99'],
					"1" : ['-45deg', '#FFCC99', '#6633CC'],
					"2" : ['-92deg', '#CCCC99', '#6633FF'],
					"3" : ['50deg',  '#33FFFF', '#9999CC'],
					"4" : ['100deg', '#CC9999', '#CC99FF']
				};

		var randomColor = Math.floor((Math.random() * 5));
		var radomDirection = Math.floor((Math.random() * 2));
		var stylingStringLinear = "-webkit-linear-gradient(" +
					colorConfig[randomColor][0] + "," +
					colorConfig[randomColor][1] + "," +
					colorConfig[randomColor][2] +  ")";
	
		var stylingStringRadial = "-webkit-radial-gradient(" +
					colorConfig[randomColor][1] + "," +
					colorConfig[randomColor][2] + ")";

		var styleConfig = [stylingStringLinear, stylingStringRadial];

		console.log("Color: " + randomColor);
		console.log("Dir: " + radomDirection);

		jQuery(".conversationView > .scroll-content").css('background', styleConfig[radomDirection]);

	  });


	// Sample method to show how can we provide the 
	// runtime decision making in the conversation UI
	// Can be used for similar stuff when we call the 
	// health kit for data and decide on next nodes in conversation.
	var testMethod = function(minutes) {
		var deferred = $q.defer();

		if(minutes > 50){
			deferred.resolve(treeData['aboveAverage']);
		}else if(minutes == 50){
			deferred.resolve(treeData['onParAverage']);
		}else{
			deferred.resolve(treeData['belowAverage']);
		}
		return deferred.promise;
	};

	var testReplacer = function(currentNode){
		var deferred = $q.defer();
		console.log("<<<<< THIS IS >>>>>");
		console.log(currentNode);
		var calculatedValue = "<<>>"
		// TODO : Will add randomization later if required.
		$translate(currentNode.text[0]).then(function (translated){
			currentNode.text = translated.split("$$").join(calculatedValue);
			//currentNode.text = translated;
			currentNode.type = null;
			deferred.resolve(currentNode);
		});

		return deferred.promise;

	};
	
	var calculateAverageMinsPerDay = function(currentNode){
		var deferred = $q.defer();
		healthKitService.getDailyAverageDuration().then(function(minutes){
		// TODO : Will add randomization later if required.
			$translate(currentNode.text[0]).then(function (translated){
				var replaced = translated.replace("$$", minutes);
				currentNode.text = replaced;
				deferred.resolve(currentNode);
			});
		});

		return deferred.promise;
	};

	var calculateYearsToMoon = function(currentNode){
		var deferred = $q.defer();
		healthKitService.getDailyAverageDuration().then(function(minutes){
		// TODO : Will add randomization later if required.
			$translate(currentNode.text[0]).then(function (translated){
				var distanceToMoon = 384400;
				var avgWalkSpeed = 5;
				/* years to moon = distance / (hours/day x km/hours)/365 */
				var yearsToMoon = Math.round(384400/(minutes/60 * 5)/365);
				var replaced = translated.replace("$$", yearsToMoon);
				currentNode.text = replaced;
				deferred.resolve(currentNode);
			});
		});

		return deferred.promise;
	};

	var compareAvgMinutesWithUsers = function() {
		var deferred = $q.defer();

		healthKitService.getDailyAverageDuration().then(function(minutes){
				if(minutes > 50){
					deferred.resolve(treeData['aboveAverage']);
				}else if(minutes == 50){
					deferred.resolve(treeData['onParAverage']);
				}else{
					deferred.resolve(treeData['belowAverage']);
				}
		});

		return deferred.promise;
	};

	var calculatePercentOnButt = function (currentNode){
		var deferred = $q.defer();

		healthKitService.getDailyAverageDuration().then(function(minutes){
			if (!minutes){
				minutes = 0;
			}

			$translate(currentNode.text[0]).then(function (translated){
				var totalMinutesADay = 24 * 60;
				var totalMinutesOnButt = totalMinutesADay - minutes;
				var percentOnButt = Math.round(totalMinutesOnButt/totalMinutesADay * 100);
				var replaced = translated.replace("$$", percentOnButt);
				currentNode.text = replaced;
				currentNode.type = null;
				deferred.resolve(currentNode);
			});
		});

		return deferred.promise;
	}

	var compareWeekdayWeekends = function(){
		var deferred = $q.defer();

		healthKitService.getWeekdayWeekendAverages().then(function(chartDataContainer){
				var weekday = chartDataContainer.dataSets[0].data[0];
				var weekend = chartDataContainer.dataSets[0].data[1];
				var diff = weekday - weekend;
				var denominator = weekend == 0 ? weekday : weekend;
				/* handle case where both weekend and weekday activities are 0 */
				if (denominator == 0){
					deferred.resolve(treeData['weekdayEqualWeekends']);
				}

				var percentDiff = diff/denominator * 100;

				if(percentDiff > 5){
					deferred.resolve(treeData['weekdayMoreWeekends']);
				}else if(percentDiff < -5){
					deferred.resolve(treeData['weekdayLessWeekends']);
				}else{
					deferred.resolve(treeData['weekdayEqualWeekends']);
				}
		});

		return deferred.promise;
	}

	var userInputPopup = function(myScope){
		var deferred = $q.defer();
		if($localstorage.getUser() != null){
			deferred.resolve(treeData['greetUser']);
  		} else {
  			$translate('Enter_Name').then(function (enterNameMsg) {
	  			var myPopup = $ionicPopup.show({
			    template: '<input type="text" ng-model="user.nickname">',
			    title: enterNameMsg,
			    cssClass: 'myPopup',
			    scope: myScope,
			    buttons: [
			      {
			        text: '<b>Ok</b>',
			        type: 'button-energized',
			        onTap: function(e) {
			          if (!myScope.user.nickname) {
			            //don't allow the user to close unless he enters a name
			            e.preventDefault();
			          } else {
			          	$localstorage.setObject("user", myScope.user);
			            return treeData['greetUser'];
			          }
			        }
			      }
			    ]
			  	});
		  		myPopup.then(function(response){
						deferred.resolve(response);
					},
					function(error){
						deferred.reject(error);
					}
				);
			});

  		}
  		return deferred.promise;
	};

	var treeRoots = {
		onboardingRoot 		: 'onboarding',
		weekDayMorningRoot	: 'weekdayMorning',
		weekDayNoonRoot		: 'weekDayNoon',
		weekDayEveRoot		: 'weekDayEve',
		weekDayNiteRoot		: 'weekDayNite',
		weekendRoot			: 'weekendRoot'  

	};


	var treeData = {
		
		// used when actual processing is in-progress for user data
		'skeletonWaitNode' : {
			wait : true,
		},

		'userInputPlaceHolder' : {
			type: "user",
			wait : false
		},

		'onboarding' : {
			text: ['0'],
			children: ['askName']
		},
		'askName': {
			text: ['1'],
			children: ['userInput']
		},

		'userInput': {
			evalInfo : {
				type : "func",
				method : userInputPopup,
			},
			children:[]
		},

		'userName': {
			text: "TODO UPDATE > My Name is User",
			type: "user",
			children: ['lookData']
		},

		// '_greetUser_': {
		// 	text: ['2'],
		// 	evalInfo : {
		// 		type : "string",
		// 	},
		// 	children: ['lookData']
		// },

		'greetUser': {
			text: ['2'],
			children: ['lookData']
		},

		'lookData':{
			text: ['3'],
			children: ['includeHApp']
		},
		'includeHApp':{
			text: ['4'],
			children:['askWouldLike']
		},
		'askWouldLike': {
			text: ['5'],
			children:['userAgree', 'userExplain']
		},
		'userAgree': {
			text: ['6'],
			type: "user",
			children: ['onboardingInfo']
		},
		'userExplain':{
			text: ['7'],
			type: "user",
			children: ['onboardingInfo']
			//children: ['stringReplacer']
		},

		// 'stringReplacer' : {
		// 	text: ['30'],
		// 	type: 'replacer',
		// 	method: testReplacer,
		// 	children:['onboardingInfo']
		// },

		'onboardingInfo': {
			text: ['8'],
			children:['moreOnboardingInfo']
		},
		'moreOnboardingInfo': {
			text: ['9'],
			children: ['furtherOnboardingInfo']
		},
		'furtherOnboardingInfo': {
			text: ['10'],
			children: ['onboardingInfoUserConfirm','onboardingInfoUserNo']
		},
		'onboardingInfoUserConfirm': {
			text: ['6'],
			type: "user",
			//children: ['dummyAnalyzer']
			children : ['openHealthApp']
		},
		'onboardingInfoUserNo': {
			text: ['11'],
			type: "user",
			children: ['collectInfo']
		},

		'collectInfo': {
			text: ['12'],
			children: ['whenReady']
		},
		'whenReady': {
			text: ['13'],
			children: ['gotoSettings']
		},
		'gotoSettings': {
			text: ['14'],
			children: ['gotoSettingsOk']
		},
		'gotoSettingsOk': {
			text: ['15'],
			type: "user",
			children: ['lookingForward']
		},
		'lookingForward': {
			text: ['16'],
			children: []
		},

		'openHealthApp': {
			text: "FIX ME : NEED TO OPEN Health App here...",
			children: ['addDataHApp']
		},
		'addDataHApp': {
			text: ['17'],
			children: ['addDataOk']
		},
		'addDataOk': {
			text: ['15'],
			type: "user",
			children: ['activityOnPhone']
		},
		'activityOnPhone': {
			text: ['18'],
			children: ['activityOnPhoneOk', 'activityOnPhone1']
		},
		'activityOnPhoneOk': {
			text: ['15'],
			type: "user",
			// children: ['dummyAnalyzer']
			children: ['averageMinutesPerDay']
		},
		
		'activityOnPhone1': {
			text: ['19'],
			type: "user",
			children: ['activityOnPhoneExplain']
		},

		'activityOnPhoneExplain': {
			text: ['20'],
			children: ['activityOnPhoneExplainMore']
		},

		'activityOnPhoneExplainMore': {
			text: ['21'],
			children: ['activityOnPhoneIsee']
		},

		'activityOnPhoneIsee': {
			text: ['22'],
			type: "user",
			children: ['activityOnPhoneLookData']
		},

		'activityOnPhoneLookData': {
			text: ['23'],
			children: ['activityOnPhoneSure', 'activityOnPhoneNotNow']
		},

		'activityOnPhoneSure': {
			text: ['24'],
			type: "user",
			// children: ['dummyAnalyzer']
			children: ['averageMinutesPerDay']
		},
		'activityOnPhoneNotNow': {
			text: ['25'],
			type: "user",
			children: []
		},
		
		'dummyAnalyzer' : {
			evalInfo : {
				type : "func",
				method : testMethod,
			},
			children:[]
		},
		'aboveAverage':{
			text: ['26'],
			children:['dailyAvgVsUsersBarChart']
		},
		'onParAverage':{
			text: ['27'],
			children:['dailyAvgVsUsersBarChart']
		},
		'belowAverage': {
			text: ['28'],
			children:['dailyAvgVsUsersBarChart']
		},
		'moreActiveTip': {
			text: ['29'],
			children:['percentOfDayOnButt']
		},
		'averageMinutesPerDay': {
			text: ['30'],
			type: 'replacer',
			method: calculateAverageMinsPerDay,
			children:['minutesToMoon']
		},
		'minutesToMoon': {
			text: ['31'],
			type: 'replacer',
			method: calculateYearsToMoon,
			children:['minutesPrettyGood']
		},
		'minutesPrettyGood': {
			text: ['32'],
			type: 'replacer',
			method: calculateAverageMinsPerDay,
			children:['minutesPrettyGoodHa']
		},
		'minutesPrettyGoodHa': {
			text: ['33'],
			type: 'user',
			children:['avgMinutesVsUsers']
		},
		"avgMinutesVsUsers": {
			evalInfo : {
				type : "func",
				method : compareAvgMinutesWithUsers
			},
			children:[]
		},
		"percentOfDayOnButt": {
			text: ['34'],
			type: 'replacer',
			method: calculatePercentOnButt,
			children:['percentOfDayOnButtWow']
		},
		"percentOfDayOnButtWow": {
			text: ['35'],
			type: 'user',
			children:['concludeAssessment']
		},
		"concludeAssessment": {
			text: ['36'],
			children:['askToShowMoreDetails']
		},
		"askToShowMoreDetails": {
			text: ['37'],
			children:['showMoreDetailsYes', 'showMoreDetailsNo']
		},
		"showMoreDetailsYes": {
			text: ['38'],
			type: 'user',
			children:['compareWeekdayWeekends']
		},
		"showMoreDetailsNo": {
			text: ['39'],
			type: 'user',
			children:['']
		},	
		"compareWeekdayWeekends": {
			evalInfo : {
				type : "func",
				method : compareWeekdayWeekends
			},
			children:['']
		},	
		"weekdayMoreWeekends": {
			text: ['40'],
			children:['weekdayVsWeekendBarChart']
		},
		"weekdayEqualWeekends": {
			text: ['41'],
			children:['weekdayVsWeekendBarChart']
		},
		"weekdayLessWeekends": {
			text: ['42'],
			children:['weekdayVsWeekendBarChart']
		},
		'testChart': {
			type: "chart",
			method: healthKitQueryFactory.getTodayVsAverageChartConfig,
			//method: getChartData,
			children:[]
		},
		'yesterdayVsAvgLineChart': {
			type: "chart",
			method: healthKitQueryFactory.getYesterdayVsAverageChartConfig,
			//method: getChartData,
			children:[]
		},
		'dailyAvgVsUsersBarChart': {
			type: "chart",
			method: healthKitQueryFactory.getDailyAverageVsUsersChart,
			children: ['moreActiveTip']
		},
		'lastVsPrevBarChart': {
			type: "chart",
			method: healthKitQueryFactory.getLastPreviousWeeksAvgerageChart,
			children: []
		},
		'weekdayVsWeekendBarChart': {
			type: "chart",
			method: healthKitQueryFactory.getWeekdayVsWeekendChart,
			children: []
		}

	};

  
  return {
    getConversationTree : function() {
    	var rootName = null;
    	var currentHour = dateTimeUtil.getCurrentHour();
    	var dayName = dateTimeUtil.getDayOfWeekName();
    	if($localstorage.getUser() == null){
    		rootName = treeRoots['onboardingRoot'];
    	} else {
    		if(dayName != 'SUNDAY' && dayName !='SATURDAY') {
		    	 if(currentHour >=5 && currentHour < 12){ // 5am - 12pm
		    		rootName = treeRoots['onboardingRoot'];
		    	} else if(currentHour >=12 && currentHour < 17){ // 12pm - 5pm
		    		rootName = treeRoots['onboardingRoot'];
		    	} else if(currentHour >=17 && currentHour < 21) { //5pm - 9pm
		    		rootName = treeRoots['onboardingRoot'];
		    	} else if(currentHour >=21 || currentHour < 5) {
		    		rootName = treeRoots['onboardingRoot'];
		    	}
	    	} else {
	    		rootName = treeRoots['weekendRoot'];
	    	}
	    }

	    return {
	    	rootType : rootName,
	    	allNodes : treeData
	    };


    }

  }
}]);
